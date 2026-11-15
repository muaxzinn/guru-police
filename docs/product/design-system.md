# 02 - Design System (`examgurupolice.netlify.app`)

Extracted directly from `/_next/static/css/a5f27ca245a4ed4a.css` and live `getComputedStyle` measurements (`[OBSERVED]`).

---

## 1. Typography System
- **Primary Font**: `Prompt` via `next/font/google` (Weights `400`, `700`, `800`).
- **Fallback Stack**: `"Prompt", "Prompt Fallback", "Segoe UI", system-ui, sans-serif` (with metric-adjusted `Prompt Fallback` based on Arial: `ascent-override: 97.38%`, `descent-override: 37.70%`, `size-adjust: 111.93%`).
- **Scale (`[OBSERVED]`)**:
  - Hero `h1`: `36px` mobile -> `52px` (`sm:text-[52px]`), `line-height: 1.08` (`56.16px`), `font-weight: 800`, `tracking-tight`.
  - Section `h2`: `24px` (`text-2xl`) -> `30px` (`sm:text-3xl`), `font-weight: 700`.
  - Card `h3`: `16px` (`text-base`), `font-weight: 700`.
  - Body text: `16px` base (`13.5px`–`15px` for descriptions), `line-height: 1.5` (`24px`).
  - Numeric counters (`Countdown`): `tabular-nums`, `24px` -> `36px` (`md:text-4xl`), `font-weight: 700`.

---

## 2. Dynamic Theme & 5-Brand Color System
Initialized synchronously in `<head>` before hydration via inline `<script>`:
- **Light / Dark Mode**: Controlled via `document.documentElement.dataset.theme` (`"light"` or `"dark"`), persisted in `localStorage['gp:theme']` (defaults to `prefers-color-scheme: dark`).
- **5 Brand Themes**: Controlled via `document.documentElement.dataset.brand` (`"blue"`, `"red"`, `"orange"`, `"yellow"`, `"brown"`), persisted in `localStorage['gp:brand']`.

| Token | Light Mode (`:root`) | Dark Mode (`[data-theme=dark]`) | Usage |
|---|---|---|---|
| `--bg` | `250 250 250` (`#fafafa`) | `14 16 20` (`#0e1014`) | Page canvas background |
| `--bg2` | `245 245 245` (`#f5f5f5`) | `20 23 29` (`#14171d`) | Secondary hover/surface |
| `--panel` | `255 255 255` (`#ffffff`) | `27 30 37` (`#1b1e25`) | Cards, Navbar, Modals |
| `--line` | `238 238 238` (`#eeeeee`) | `44 48 57` (`#2c3039`) | 1px borders |
| `--ink` | `17 17 17` (`#111111`) | `236 238 242` (`#eceef2`) | Primary text |
| `--muted` | `102 102 102` (`#666666`) | `151 157 167` (`#979da7`) | Secondary/muted text |
| `--brand` (default blue) | `29 78 216` (`#1d4ed8`) | `59 130 246` (`#3b82f6`) | Primary CTA, active links |
| `--gold` / `--gold-ink` | `255 180 0` / `150 99 0` | `255 190 46` / `255 202 92` | Highlight countdown & warnings |

---

## 3. Signature Surfaces & Visual Motifs (`[OBSERVED]`)
- **`.landing-dark` Mesh + 44px Grid**: Multi-radial gradient glow (`--brand`, `--violet`, `--teal` at 5%–7% opacity) layered over a `44px × 44px` `1px` orthogonal architectural grid (`rgb(var(--ink)/0.032)`).
- **`.beam-line`**: `1px` horizontal glowing divider under the sticky navbar (`linear-gradient(90deg, transparent, rgb(var(--brand)/.65), rgb(var(--violet)/.5), transparent)`).
- **`.rounded-card`**: `24px` border radius with `1px solid rgb(var(--line))` and `shadow-card`.
- **`.rounded-btn`**: `18px` border radius for primary/ghost pill-like rectangular buttons.
- **Sticky Glass Header**: `bg-panel/80 backdrop-blur-xl border-b border-line`.

