#!/usr/bin/env python3
"""
Convert all GuruPolice question/choice/explanation images into:
1) Clean text, HTML tables, and LaTeX math via local Typhoon OCR 1.5 2B (MLX)
2) Multi-layer color-aware vector SVGs via Potrace for visual diagrams & figures

Outputs:
- data/dataset/ocr-svg-manifest.json
- public/question-svgs/<sha256[:16]>.svg
"""

import hashlib
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
from PIL import Image

OCR_AI_DIR = Path("/Users/muaxzinn/ocr ai")
sys.path.insert(0, str(OCR_AI_DIR))

import mlx.core as mx
import mlx_vlm
from engine import TYPHOON_OCR_PROMPT

ROOT_DIR = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT_DIR / "data" / "dataset" / "all-questions.json"
HARVEST_PATH = ROOT_DIR / "data" / "dataset" / "harvest-report.json"
Q_IMG_DIR = ROOT_DIR / "public" / "question-images"
SVG_OUT_DIR = ROOT_DIR / "public" / "question-svgs"
MANIFEST_PATH = ROOT_DIR / "data" / "dataset" / "ocr-svg-manifest.json"
CACHE_DIR = Path("/tmp/guru-img-cache")
POTRACE_BIN = "/opt/homebrew/bin/potrace"

IMG_URL_ONLY_RE = re.compile(
    r"^(?:https?://\S+\.(?:png|jpe?g|webp|gif|svg)|/question-images/\S+|/qimg/\S+|/simg/\S+)$",
    re.IGNORECASE,
)


def build_url_map() -> Dict[str, str]:
    umap: Dict[str, str] = {}
    if HARVEST_PATH.exists():
        rep = json.loads(HARVEST_PATH.read_text(encoding="utf-8"))
        for item in rep.get("downloaded_question_images", []):
            u = item.get("url")
            f = item.get("file")
            if u and f:
                umap[u] = f"/question-images/{f}"
    umap["https://guru-eng-exam-images.netlify.app/i/01-9b4075aa/q269.png"] = "/question-images/retry-01-q269.png"
    umap["https://guru-eng-exam-images.netlify.app/i/01-2-b2282906/q31.png"] = "/question-images/retry-02-q31.png"
    return umap


def resolve_canonical_source(raw: Optional[str], umap: Dict[str, str]) -> Optional[str]:
    if not raw or not isinstance(raw, str):
        return None
    t = raw.strip()
    if not t:
        return None
    if t.startswith("/question-svgs/"):
        return None
    if t.startswith("/question-images/"):
        return t
    if t in umap:
        return umap[t]
    if t.startswith("/qimg/"):
        absu = f"https://guru-eng-exam-images.netlify.app/{t[len('/qimg/'):]}"
        return umap.get(absu, absu)
    if t.startswith("/simg/"):
        absu = f"https://wnsgsamwljlkzgtvyssx.supabase.co/storage/v1/object/public/{t[len('/simg/'):]}"
        return umap.get(absu, absu)
    return t


def download_remote(url: str) -> Tuple[str, Optional[Path], Optional[str]]:
    ext = Path(url.split("?")[0]).suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"):
        ext = ".png"
    uhash = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    dest = CACHE_DIR / f"{uhash}{ext}"
    if dest.exists() and dest.stat().st_size > 0:
        return url, dest, None

    last_err = ""
    for _ in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Apple Silicon) GuruPoliceOCR/1.0"},
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = resp.read()
            if data:
                tmp = dest.with_suffix(".tmp")
                tmp.write_bytes(data)
                tmp.replace(dest)
                return url, dest, None
        except Exception as err:
            last_err = str(err)
            time.sleep(0.4)
    return url, None, last_err or "empty download"


def clean_ocr_markdown(raw: str) -> str:
    txt = re.sub(r"</?page_number>", "", raw, flags=re.IGNORECASE)
    txt = txt.replace("\r\n", "\n").strip()
    if not txt:
        return ""
    # Unescape HTML entities outside tags so math < / > and & render properly as text
    parts = re.split(r"(<table\b[\s\S]*?</table>)", txt, flags=re.IGNORECASE)
    cleaned_parts: List[str] = []
    for part in parts:
        if part.lower().startswith("<table"):
            # Unescape cell text inside <td>/<th> while preserving table tags
            def _unescape_cell(m: re.Match) -> str:
                return f"{m.group(1)}{html.unescape(m.group(2)).strip()}{m.group(3)}"

            cell_fixed = re.sub(
                r"(<t[dh]\b[^>]*>)([\s\S]*?)(</t[dh]>)",
                _unescape_cell,
                part,
                flags=re.IGNORECASE,
            )
            cleaned_parts.append(cell_fixed)
        else:
            # Remove stray HTML break/paragraph tags if Typhoon OCR emitted any
            plain = re.sub(r"</?(?:p|div|span|br)\s*/?>", "\n", part, flags=re.IGNORECASE)
            plain = html.unescape(plain)
            plain = re.sub(r"\n{3,}", "\n\n", plain).strip()
            if plain:
                cleaned_parts.append(plain)
    return "\n\n".join(cleaned_parts).strip()


def trim_repetition(acc: str) -> Tuple[str, bool]:
    if len(acc) > 72:
        tail = acc[-22:]
        if len(tail.strip()) >= 6 and acc.count(tail) >= 3:
            first_idx = acc.find(tail)
            # Keep up to the end of the first occurrence
            return acc[: first_idx + len(tail)].rstrip(), True
    return acc, False


def flatten_to_rgb(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "LA") or ("transparency" in im.info):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        rgba = im.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[3])
        return bg
    if im.mode != "RGB":
        return im.convert("RGB")
    return im


def trace_mask_to_g(mask_bool: np.ndarray, fill_hex: str, work_dir: Path) -> str:
    if not np.any(mask_bool):
        return ""
    arr_u8 = np.where(mask_bool, 0, 255).astype(np.uint8)
    bmp_p = work_dir / "mask.bmp"
    svg_p = work_dir / "mask.svg"
    Image.fromarray(arr_u8, mode="L").point(lambda v: 0 if v < 128 else 255, "1").save(bmp_p)
    subprocess.run(
        [POTRACE_BIN, str(bmp_p), "-s", "-o", str(svg_p), "--turdsize", "2", "--alphamax", "1.0"],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    svg_txt = svg_p.read_text(encoding="utf-8")
    m = re.search(r'<g\s+transform="([^"]+)"[^>]*>([\s\S]*?)</g>', svg_txt)
    if not m:
        return ""
    transform, inner = m.group(1), m.group(2).strip()
    if "<path" not in inner:
        return ""
    return f'<g transform="{transform}" fill="{fill_hex}" stroke="none">\n{inner}\n</g>'


def png_to_color_svg(img_path: Path, out_svg_path: Path, work_dir: Path) -> None:
    im = flatten_to_rgb(Image.open(img_path))
    w, h = im.size
    arr = np.asarray(im, dtype=np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    chroma = maxc - minc
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    total_px = max(1.0, float(w * h))
    colored_mask = (chroma > 50) & (minc < 235)
    colored_frac = np.sum(colored_mask) / total_px

    layers: List[str] = []
    if colored_frac > 0.012:
        # Trace chromatic regions first, then crisp dark ink/outlines on top
        dark_mask = lum < 155
        claimed = dark_mask.copy()
        buckets = [
            ("red", (r - np.maximum(g, b) > 45) & (g < 155) & (b < 155)),
            ("orange", (r > 180) & (g >= 80) & (g < 185) & (b < 110) & (chroma > 55)),
            ("yellow", (r > 170) & (g > 155) & (b < 130) & (chroma > 55)),
            ("green", (g - np.maximum(r, b) > 32)),
            ("blue", (b - np.maximum(r, g) > 32)),
            ("purple", (r > 110) & (b > 110) & (g < 130) & (chroma > 45)),
        ]
        for _name, bmask in buckets:
            mask_i = bmask & colored_mask & (~claimed)
            if np.sum(mask_i) / total_px > 0.004:
                hex_c = f"#{int(np.median(r[mask_i])):02x}{int(np.median(g[mask_i])):02x}{int(np.median(b[mask_i])):02x}"
                g_xml = trace_mask_to_g(mask_i, hex_c, work_dir)
                if g_xml:
                    layers.append(g_xml)
                claimed |= mask_i
        dark_xml = trace_mask_to_g(dark_mask, "#0f172a", work_dir)
        if dark_xml:
            layers.append(dark_xml)
    else:
        dark_mask = lum < 185
        dark_xml = trace_mask_to_g(dark_mask, "#0f172a", work_dir)
        if dark_xml:
            layers.append(dark_xml)

    if not layers:
        fallback_mask = lum < 225
        fallback_xml = trace_mask_to_g(fallback_mask, "#0f172a", work_dir)
        if fallback_xml:
            layers.append(fallback_xml)

    svg_doc = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" preserveAspectRatio="xMidYMid meet">\n'
        + "\n".join(layers)
        + "\n</svg>\n"
    )
    out_svg_path.write_text(svg_doc, encoding="utf-8")


def save_manifest(manifest: Dict[str, Any]) -> None:
    tmp = MANIFEST_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(MANIFEST_PATH)


def main() -> None:
    SVG_OUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    questions = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    umap = build_url_map()

    # Gather every referenced canonical source -> role metadata
    source_meta: Dict[str, Dict[str, Any]] = {}
    raw_aliases: Dict[str, str] = {}

    def register(raw_val: Optional[str], role: str, subject: str, title: str) -> None:
        if not raw_val or not isinstance(raw_val, str):
            return
        raw_t = raw_val.strip()
        src = resolve_canonical_source(raw_t, umap)
        if not src:
            return
        raw_aliases[raw_t] = src
        entry = source_meta.setdefault(
            src, {"roles": set(), "visual_only": True}
        )
        entry["roles"].add(role)
        if not (subject == "math" and title == "รูปภาพ"):
            entry["visual_only"] = False

    for q in questions:
        subj = str(q.get("subject_key") or "")
        title = str(q.get("title") or "")
        stem_str = str(q.get("stem") or "").strip()
        register(q.get("img"), "stem", subj, title)
        if IMG_URL_ONLY_RE.match(stem_str):
            register(stem_str, "stem", subj, title)

        raw_opts = q.get("opts") or []
        raw_opt_imgs = q.get("opt_imgs") or []
        for idx in range(max(len(raw_opts), len(raw_opt_imgs))):
            if idx < len(raw_opt_imgs) and raw_opt_imgs[idx]:
                register(raw_opt_imgs[idx], "choice", subj, title)
            elif idx < len(raw_opts):
                opt_str = str(raw_opts[idx] or "").strip()
                if IMG_URL_ONLY_RE.match(opt_str):
                    register(opt_str, "choice", subj, title)

        exp_str = str(q.get("explanation") or "").strip()
        register(q.get("explanation_img"), "exp", subj, title)
        if IMG_URL_ONLY_RE.match(exp_str):
            register(exp_str, "exp", subj, title)

    print(f"[Inventory] Unique source refs: {len(source_meta)}", flush=True)

    # Download remote sources concurrently
    remote_urls = [s for s in source_meta if s.startswith(("http://", "https://"))]
    print(f"[Download] Checking/fetching {len(remote_urls)} remote URLs...", flush=True)
    src_to_file: Dict[str, Path] = {}
    remote_failures: List[Tuple[str, str]] = []

    for s in source_meta:
        if s.startswith("/question-images/"):
            p = Q_IMG_DIR / s[len("/question-images/") :]
            if p.exists():
                src_to_file[s] = p
            else:
                remote_failures.append((s, "missing local file"))
        elif not s.startswith(("http://", "https://")):
            remote_failures.append((s, "unrecognized image ref"))

    if remote_urls:
        with ThreadPoolExecutor(max_workers=16) as pool:
            futs = [pool.submit(download_remote, u) for u in remote_urls]
            for idx, fut in enumerate(as_completed(futs), 1):
                url, path_res, err = fut.result()
                if path_res is not None:
                    src_to_file[url] = path_res
                else:
                    remote_failures.append((url, err or "unknown error"))
                if idx % 200 == 0 or idx == len(remote_urls):
                    print(
                        f"  Downloaded {idx}/{len(remote_urls)} (failures={len(remote_failures)})",
                        flush=True,
                    )

    fail_ratio = (len(remote_failures) / len(remote_urls)) if remote_urls else 0.0
    print(
        f"[Download] Done: ok={len(src_to_file)}, failures={len(remote_failures)} ({fail_ratio*100:.2f}%)",
        flush=True,
    )
    if remote_failures and fail_ratio > 0.05:
        print("[ERROR] >5% of remote URLs failed to download; aborting.", flush=True)
        for u, err in remote_failures[:10]:
            print(f"  - {u}: {err}", flush=True)
        sys.exit(2)

    # Content-address deduplication by SHA-256
    hash_meta: Dict[str, Dict[str, Any]] = {}
    src_to_hash: Dict[str, str] = {}
    for src, path_obj in src_to_file.items():
        h = hashlib.sha256(path_obj.read_bytes()).hexdigest()
        src_to_hash[src] = h
        hm = hash_meta.setdefault(
            h,
            {
                "file": path_obj,
                "only_choice": True,
                "visual_only": True,
            },
        )
        if "stem" in source_meta[src]["roles"] or "exp" in source_meta[src]["roles"]:
            hm["only_choice"] = False
        if not source_meta[src]["visual_only"]:
            hm["visual_only"] = False

    print(f"[Dedup] Unique file SHA-256 hashes: {len(hash_meta)}", flush=True)

    # Load resumable manifest if present
    manifest: Dict[str, Any] = {"url_to_hash": {}, "raw_to_hash": {}, "hashes": {}, "failures": remote_failures}
    if MANIFEST_PATH.exists():
        loaded = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        manifest["hashes"] = loaded.get("hashes", {})

    manifest["url_to_hash"] = src_to_hash
    manifest["raw_to_hash"] = {r: src_to_hash[s] for r, s in raw_aliases.items() if s in src_to_hash}
    manifest["failures"] = [{"url": u, "error": e} for u, e in remote_failures]

    pending_hashes: List[str] = []
    for h in sorted(hash_meta):
        existing = manifest["hashes"].get(h)
        if existing:
            if existing.get("kind") == "svg":
                svg_rel = existing.get("svg_path") or ""
                svg_abs = ROOT_DIR / "public" / svg_rel.lstrip("/")
                if svg_abs.exists() and svg_abs.stat().st_size > 0:
                    continue
            else:
                continue
        pending_hashes.append(h)

    print(
        f"[Resume] Already completed: {len(hash_meta) - len(pending_hashes)}, remaining: {len(pending_hashes)}",
        flush=True,
    )

    if not pending_hashes:
        save_manifest(manifest)
        print("[Done] Nothing left to process.", flush=True)
        return

    with tempfile.TemporaryDirectory(prefix="guru-potrace-") as tmp_dir_str:
        tmp_work = Path(tmp_dir_str)

        # Pass 1: fast SVG vectorization for pure visual math patterns (`math :: รูปภาพ`)
        ocr_hashes: List[str] = []
        svg_direct_count = 0
        for h in pending_hashes:
            info = hash_meta[h]
            if info["visual_only"]:
                svg_name = f"{h[:16]}.svg"
                svg_abs = SVG_OUT_DIR / svg_name
                png_to_color_svg(info["file"], svg_abs, tmp_work)
                manifest["hashes"][h] = {
                    "kind": "svg",
                    "text": "",
                    "pre_text": "",
                    "svg_path": f"/question-svgs/{svg_name}",
                    "duration_sec": 0.01,
                    "source": "visual_pattern",
                }
                svg_direct_count += 1
            else:
                ocr_hashes.append(h)

        save_manifest(manifest)
        print(
            f"[SVG Fast-Path] Vectorized {svg_direct_count} math::รูปภาพ images. Running Typhoon OCR on {len(ocr_hashes)} images...",
            flush=True,
        )

        if ocr_hashes:
            t_load = time.time()
            model, processor = mlx_vlm.load(str(OCR_AI_DIR / "weights"))
            formatted_prompt = mlx_vlm.apply_chat_template(
                processor,
                config=model.config,
                prompt=TYPHOON_OCR_PROMPT,
                num_images=1,
            )
            print(f"[MLX] Model ready in {time.time() - t_load:.2f}s on {mx.default_device()}", flush=True)

            text_count = 0
            svg_ocr_count = 0
            t_start = time.time()

            for idx, h in enumerate(ocr_hashes, 1):
                info = hash_meta[h]
                t0 = time.time()
                im = flatten_to_rgb(Image.open(info["file"]))
                w, h_px = im.size
                max_dim = max(w, h_px)
                if max_dim < 600:
                    scale = min(2.0, 1120.0 / float(max_dim))
                    im = im.resize(
                        (max(1, int(w * scale)), max(1, int(h_px * scale))),
                        Image.Resampling.LANCZOS,
                    )
                elif max_dim > 1120:
                    scale = 1120.0 / float(max_dim)
                    im = im.resize(
                        (max(1, int(w * scale)), max(1, int(h_px * scale))),
                        Image.Resampling.LANCZOS,
                    )

                max_tok = 140 if info["only_choice"] else 420
                acc = ""
                is_fig = False
                for res in mlx_vlm.stream_generate(
                    model,
                    processor,
                    prompt=formatted_prompt,
                    image=im,
                    max_tokens=max_tok,
                    temperature=0.0,
                    repetition_penalty=1.15,
                ):
                    if res.text:
                        acc += res.text
                        if "<figure>" in acc:
                            is_fig = True
                            break
                        trimmed, hit_rep = trim_repetition(acc)
                        if hit_rep:
                            acc = trimmed
                            break

                dt = round(time.time() - t0, 2)
                if is_fig:
                    pre_raw = acc.split("<figure>")[0]
                    pre_clean = clean_ocr_markdown(pre_raw)
                    svg_name = f"{h[:16]}.svg"
                    svg_abs = SVG_OUT_DIR / svg_name
                    png_to_color_svg(info["file"], svg_abs, tmp_work)
                    manifest["hashes"][h] = {
                        "kind": "svg",
                        "text": "",
                        "pre_text": pre_clean,
                        "svg_path": f"/question-svgs/{svg_name}",
                        "duration_sec": dt,
                        "source": "ocr_figure",
                    }
                    svg_ocr_count += 1
                else:
                    clean_txt = clean_ocr_markdown(acc)
                    if not clean_txt:
                        svg_name = f"{h[:16]}.svg"
                        svg_abs = SVG_OUT_DIR / svg_name
                        png_to_color_svg(info["file"], svg_abs, tmp_work)
                        manifest["hashes"][h] = {
                            "kind": "svg",
                            "text": "",
                            "pre_text": "",
                            "svg_path": f"/question-svgs/{svg_name}",
                            "duration_sec": dt,
                            "source": "empty_ocr_fallback",
                        }
                        svg_ocr_count += 1
                    else:
                        manifest["hashes"][h] = {
                            "kind": "text",
                            "text": clean_txt,
                            "pre_text": "",
                            "svg_path": None,
                            "duration_sec": dt,
                            "source": "typhoon_ocr",
                        }
                        text_count += 1

                if idx % 25 == 0 or idx == len(ocr_hashes):
                    save_manifest(manifest)
                    elapsed = time.time() - t_start
                    rate = idx / max(0.1, elapsed)
                    eta_min = (len(ocr_hashes) - idx) / max(0.01, rate) / 60.0
                    print(
                        f"  [OCR {idx}/{len(ocr_hashes)}] text={text_count} svg={svg_ocr_count} "
                        f"speed={rate:.2f} img/s ETA={eta_min:.1f}m",
                        flush=True,
                    )
                if idx % 100 == 0 and hasattr(mx, "clear_cache"):
                    mx.clear_cache()

    total_text = sum(1 for v in manifest["hashes"].values() if v.get("kind") == "text")
    total_svg = sum(1 for v in manifest["hashes"].values() if v.get("kind") == "svg")
    manifest["stats"] = {
        "unique_hashes": len(manifest["hashes"]),
        "text_count": total_text,
        "svg_count": total_svg,
        "url_count": len(manifest["url_to_hash"]),
        "remote_failures": len(remote_failures),
    }
    save_manifest(manifest)
    print(f"[Complete] {manifest['stats']}", flush=True)


if __name__ == "__main__":
    main()
