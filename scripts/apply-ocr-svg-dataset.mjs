import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DATASET_DIR = path.join(ROOT_DIR, 'data', 'dataset');
const ALL_Q_PATH = path.join(DATASET_DIR, 'all-questions.json');
const HARVEST_PATH = path.join(DATASET_DIR, 'harvest-report.json');
const MANIFEST_PATH = path.join(DATASET_DIR, 'ocr-svg-manifest.json');
const BY_SET_DIR = path.join(DATASET_DIR, 'questions', 'by-set');
const Q_IMG_DIR = path.join(ROOT_DIR, 'public', 'question-images');

const IMG_URL_ONLY_RE =
  /^(?:https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg)|\/question-images\/\S+|\/question-svgs\/\S+|\/qimg\/\S+|\/simg\/\S+)$/i;

const PLACEHOLDER_STEMS = new Set([
  'พิจารณารูปภาพต่อไปนี้แล้วเลือกคำตอบที่ถูกต้อง',
]);

/** @param {unknown} s */
function normalizeCmp(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$?/g, '')
    .replace(/[#*`"“”'’().,:;!?฿%\s\-–—_\\/{}[\]]+/g, '')
    .toLowerCase();
}

/**
 * @param {string | null | undefined} existingRaw
 * @param {string | null | undefined} extractedRaw
 */
function mergeStemText(existingRaw, extractedRaw) {
  const existing = String(existingRaw || '').trim();
  const extracted = String(extractedRaw || '').trim();
  const cleanExisting =
    !existing || IMG_URL_ONLY_RE.test(existing) || PLACEHOLDER_STEMS.has(existing)
      ? ''
      : existing;

  if (!extracted) return cleanExisting;
  if (!cleanExisting) return extracted;

  const cmpEx = normalizeCmp(cleanExisting);
  const cmpNew = normalizeCmp(extracted);
  if (cmpEx && cmpNew) {
    if (cmpEx.includes(cmpNew)) return cleanExisting;
    if (cmpNew.includes(cmpEx)) return extracted;
  }

  return `${extracted}\n\n${cleanExisting}`;
}

/**
 * @param {string | null | undefined} existingRaw
 * @param {string | null | undefined} extractedRaw
 */
function mergeExplanationText(existingRaw, extractedRaw) {
  const existing = String(existingRaw || '').trim();
  const extracted = String(extractedRaw || '').trim();
  const cleanExisting = !existing || IMG_URL_ONLY_RE.test(existing) ? '' : existing;
  if (!extracted) return cleanExisting;
  if (!cleanExisting) return extracted;
  const cmpEx = normalizeCmp(cleanExisting);
  const cmpNew = normalizeCmp(extracted);
  if (cmpEx && cmpNew && cmpEx.includes(cmpNew)) return cleanExisting;
  if (cmpEx && cmpNew && cmpNew.includes(cmpEx)) return extracted;
  return `${cleanExisting}\n\n${extracted}`;
}

function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const rawToHash = manifest.raw_to_hash || {};
  const urlToHash = manifest.url_to_hash || {};
  const hashes = manifest.hashes || {};

  const umap = new Map();
  if (fs.existsSync(HARVEST_PATH)) {
    const rep = JSON.parse(fs.readFileSync(HARVEST_PATH, 'utf8'));
    for (const item of rep.downloaded_question_images || []) {
      if (item.url && item.file) umap.set(item.url, `/question-images/${item.file}`);
    }
  }
  umap.set('https://guru-eng-exam-images.netlify.app/i/01-9b4075aa/q269.png', '/question-images/retry-01-q269.png');
  umap.set('https://guru-eng-exam-images.netlify.app/i/01-2-b2282906/q31.png', '/question-images/retry-02-q31.png');

  /**
   * @param {string | null | undefined} rawVal
   */
  function lookupConverted(rawVal) {
    if (!rawVal || typeof rawVal !== 'string') return null;
    const t = rawVal.trim();
    if (!t) return null;
    let h = rawToHash[t] || urlToHash[t];
    if (!h) {
      let canon = umap.get(t) || t;
      if (t.startsWith('/qimg/')) {
        const abs = `https://guru-eng-exam-images.netlify.app/${t.slice('/qimg/'.length)}`;
        canon = umap.get(abs) || abs;
      } else if (t.startsWith('/simg/')) {
        const abs = `https://wnsgsamwljlkzgtvyssx.supabase.co/storage/v1/object/public/${t.slice('/simg/'.length)}`;
        canon = umap.get(abs) || abs;
      }
      h = urlToHash[canon] || rawToHash[canon];
    }
    return h ? hashes[h] || null : null;
  }

  /** @type {Array<Record<string, any>>} */
  const allQuestions = JSON.parse(fs.readFileSync(ALL_Q_PATH, 'utf8'));
  /** @type {Map<number, Record<string, any>>} */
  const updatedById = new Map();

  let stats = {
    stemTextMerged: 0,
    stemSvg: 0,
    optTextConverted: 0,
    optSvg: 0,
    expTextConverted: 0,
    expSvg: 0,
    unresolvedRefs: 0,
  };

  /** @param {Record<string, any>} q */
  const updatedAll = allQuestions.map((q) => {
    const next = { ...q };

    // 1. Stem
    const rawStem = typeof q.stem === 'string' ? q.stem.trim() : '';
    const stemImgRaw = q.img || (IMG_URL_ONLY_RE.test(rawStem) ? rawStem : null);
    if (stemImgRaw && !String(stemImgRaw).startsWith('/question-svgs/')) {
      const conv = lookupConverted(stemImgRaw);
      if (conv) {
        if (conv.kind === 'text') {
          next.stem = mergeStemText(q.stem, conv.text);
          next.img = null;
          stats.stemTextMerged++;
        } else {
          if (conv.pre_text) {
            next.stem = mergeStemText(q.stem, conv.pre_text);
          } else if (IMG_URL_ONLY_RE.test(rawStem)) {
            next.stem = 'พิจารณารูปภาพต่อไปนี้แล้วเลือกคำตอบที่ถูกต้อง';
          }
          next.img = conv.svg_path;
          stats.stemSvg++;
        }
      } else {
        stats.unresolvedRefs++;
      }
    }

    // 2. Options
    const rawOpts = Array.isArray(q.opts) ? q.opts.slice() : [];
    const rawOptImgs = Array.isArray(q.opt_imgs) ? q.opt_imgs.slice() : new Array(rawOpts.length).fill(null);
    const nextOpts = [];
    const nextOptImgs = [];

    for (let i = 0; i < rawOpts.length; i++) {
      const oText = typeof rawOpts[i] === 'string' ? rawOpts[i].trim() : '';
      const oImg = rawOptImgs[i] || (IMG_URL_ONLY_RE.test(oText) ? oText : null);
      if (oImg && !String(oImg).startsWith('/question-svgs/')) {
        const conv = lookupConverted(oImg);
        if (conv) {
          if (conv.kind === 'text') {
            nextOpts.push(conv.text);
            nextOptImgs.push(null);
            stats.optTextConverted++;
          } else {
            nextOpts.push(conv.pre_text || (IMG_URL_ONLY_RE.test(oText) ? '' : oText));
            nextOptImgs.push(conv.svg_path);
            stats.optSvg++;
          }
          continue;
        }
        stats.unresolvedRefs++;
      }
      nextOpts.push(rawOpts[i]);
      nextOptImgs.push(rawOptImgs[i] || null);
    }

    next.opts = nextOpts;
    next.opt_imgs = nextOptImgs.some(Boolean) ? nextOptImgs : null;

    // 3. Explanation
    const rawExp = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    const expImgRaw = q.explanation_img || (IMG_URL_ONLY_RE.test(rawExp) ? rawExp : null);
    if (expImgRaw && !String(expImgRaw).startsWith('/question-svgs/')) {
      const conv = lookupConverted(expImgRaw);
      if (conv) {
        if (conv.kind === 'text') {
          const mergedExp = mergeExplanationText(q.explanation, conv.text);
          next.explanation = mergedExp || null;
          next.explanation_img = null;
          stats.expTextConverted++;
        } else {
          const mergedPre = conv.pre_text
            ? mergeExplanationText(q.explanation, conv.pre_text)
            : IMG_URL_ONLY_RE.test(rawExp)
              ? ''
              : q.explanation;
          next.explanation = mergedPre || null;
          next.explanation_img = conv.svg_path;
          stats.expSvg++;
        }
      } else {
        stats.unresolvedRefs++;
      }
    }

    updatedById.set(next.id, next);
    return next;
  });

  fs.writeFileSync(ALL_Q_PATH, `${JSON.stringify(updatedAll, null, 2)}\n`, 'utf8');

  // Sync subject JSONs in data/dataset/questions/{subject}.json
  for (const fname of fs.readdirSync(path.join(DATASET_DIR, 'questions'))) {
    if (!fname.endsWith('.json') || fname === 'schema-and-samples.json') continue;
    const fpath = path.join(DATASET_DIR, 'questions', fname);
    const items = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    if (!Array.isArray(items)) continue;
    const synced = items.map((item) => updatedById.get(item.id) || item);
    fs.writeFileSync(fpath, `${JSON.stringify(synced, null, 2)}\n`, 'utf8');
  }

  // Sync split by-set/set-*.json files (excluding huge unassigned file if unchanged/ignored)
  if (fs.existsSync(BY_SET_DIR)) {
    for (const fname of fs.readdirSync(BY_SET_DIR)) {
      if (!fname.startsWith('set-') || !fname.endsWith('.json')) continue;
      if (fname === 'set-unassigned.json') continue;
      const fpath = path.join(BY_SET_DIR, fname);
      const items = JSON.parse(fs.readFileSync(fpath, 'utf8'));
      if (!Array.isArray(items)) continue;
      const synced = items.map((item) => {
        const u = updatedById.get(item.id);
        if (!u) return item;
        const out = {
          ...item,
          b: u.stem,
          opts: u.opts,
        };
        if (u.img) out.img = u.img;
        else delete out.img;
        if (u.opt_imgs) out.opt_imgs = u.opt_imgs;
        else delete out.opt_imgs;
        return out;
      });
      fs.writeFileSync(fpath, `${JSON.stringify(synced, null, 2)}\n`, 'utf8');
    }
  }

  // Remove old raster question images so repository only holds converted text/math/tables + SVGs
  let removedRasterCount = 0;
  if (fs.existsSync(Q_IMG_DIR)) {
    for (const fname of fs.readdirSync(Q_IMG_DIR)) {
      if (fname === '.gitkeep') continue;
      fs.rmSync(path.join(Q_IMG_DIR, fname), { force: true });
      removedRasterCount++;
    }
  }

  console.log('Applied OCR/SVG conversions:', {
    totalQuestions: updatedAll.length,
    ...stats,
    removedRasterCount,
  });
}

main();
