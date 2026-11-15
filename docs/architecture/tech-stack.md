# 03 - Technology Stack (`examgurupolice.netlify.app`)

Every entry below is verified directly from live HTTP headers, HTML RSC payloads, CSS assets, and recovered webpack JS chunks (`[OBSERVED]`), with architectural deductions labeled `[INFERRED]`.

---

## 1. Hosting, Edge & Runtime
- **Hosting Platform (`[OBSERVED]`)**: **Netlify** (`server: Netlify`, `x-nf-request-id`, `cache-status: "Netlify Durable"; hit, "Next.js"; hit, "Netlify Edge"`).
- **Framework (`[OBSERVED]`)**: **Next.js 15 App Router** (`x-powered-by: Next.js`, React Server Components `self.__next_f.push(...)`, `Build ID: lMK9S3c_2qebMoqcgvOv5`).
- **Rendering Strategy (`[OBSERVED]`)**:
  - Marketing pages (`/`, `/articles`, `/articles/[slug]`, `/news`, `/news/[slug]`): Statically prerendered / ISR (`x-nextjs-prerender: 1`, `x-nextjs-stale-time: 300`, `netlify-vary: query=__nextDataReq|_rsc, header=...`).
  - Auth pages (`/login`, `/register`): Static/SSR shells with Client Components (`AuthForm`, `RegisterForm`).
  - Protected App (`/(app)/*`) and Admin (`/admin/*`): Server-side Next.js Middleware session check returning `HTTP 307 -> /login` when unauthenticated.
  - Health API (`/api/health`): Dynamic Route Handler (`cache-control: no-cache`, returns `{"status":"ok","db":"ok","ms":21,"ts":"..."}`).

---

## 2. Frontend Stack & Libraries
- **UI Runtime (`[OBSERVED]`)**: React 19 / Next.js App Router (`chunks/4bd1b696-f785427dddbba9fb.js`, `chunks/1255-d90f22433f14e976.js`).
- **Styling (`[OBSERVED]`)**: **Tailwind CSS v3** compiled to `/_next/static/css/a5f27ca245a4ed4a.css` (`54,615` bytes) with CSS Custom Properties (RGB space-separated triplets e.g. `--brand: 29 78 216`) for runtime theme switching (`data-theme` + `data-brand`).
- **Typography (`[OBSERVED]`)**: `next/font/google` loading **Prompt** (weights `400`, `700`, `800`) across Thai, Vietnamese, Latin-Ext, and Latin subsets (12 `.woff2` files under `/_next/static/media/`), exposed as `--font-body: "Prompt", "Prompt Fallback"`.
- **Icons & Media (`[OBSERVED]`)**:
  - Unicode Emoji icons for UI badges, subjects (`🧮`, `📖`, `🔤`, `💻`, `📋`, `⚖️`, `🌏`), and status dialogs (`🔒`, `😵`, `🔄`, `📶`, `🛡️`, `🎯`, `🔁`).
  - Inline SVG only for Google G logo (`AuthForm`, Mod `6075`) and LINE icon (`ReviewSlider`, Mod `764`).
  - `next/image` (`/_next/image?url=...`) for `/landing/bus.png` and `/reviews-landing/Review Landing1.jpg..8.jpg`.
- **Browser Storage & Client State (`[OBSERVED]`)**:
  - `localStorage['gp:theme']`: `"light" | "dark"`
  - `localStorage['gp:brand']`: `"blue" | "red" | "orange" | "yellow" | "brown"`
  - `localStorage['gp:device']`: UUID (`crypto.randomUUID()`) for 1-device session enforcement
  - `sessionStorage['gp:pendingProfile']`: Temporary registration payload held across Google OAuth redirect
  - `sessionStorage['gp:err-seen']`: Error deduplication cache (10-minute TTL, max 8 entries)
  - `sessionStorage['gp:chunk-reloaded']`: Prevents infinite reload loops on `ChunkLoadError`

---

## 3. Backend-as-a-Service (Supabase)
- **Supabase Project URL (`[OBSERVED]`)**: `https://wnsgsamwljlkzgtvyssx.supabase.co` (extracted from Module `8525`).
- **SDK (`[OBSERVED]`)**: `@supabase/ssr` (`createBrowserClient` exported as `r.L()` / `tJ` in chunk `6962-2e36832f7a854c41.js`) + `@supabase/auth-js` + `@supabase/realtime-js` + `@supabase/postgrest-js` + `@supabase/functions-js`.
- **Cookie Key (`[OBSERVED]`)**: `sb-wnsgsamwljlkzgtvyssx-auth-token` (chunked `.0`, `.1`, etc. if large, base64-encoded JSON session).
- **Database (`[OBSERVED]` & `[INFERRED]`)**: PostgreSQL via Supabase PostgREST (`/rest/v1/*`) with Row-Level Security (RLS) enabled on user/question/attempt/admin tables and public `SELECT` allowed on `subjects` and `exam_sets`.
- **Observability (`[OBSERVED]`)**: Custom client-side error reporter (`Mod 5023` in `app/error` & `app/global-error`) inserting structured crash logs into `public.error_logs` with a 6-character alphanumeric reference code (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).

