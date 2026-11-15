# 03 - Frontend Bundle & Module Graph Analysis

All chunk filenames and module IDs below were recovered from `/_next/static/chunks/` (both public chunks in `kb/07-assets/bundles/` and authenticated chunks in `kb/07-assets/bundles/authenticated/`) (`[OBSERVED]`).

---

## 1. Public & Shared Chunk Inventory

| Chunk File | Role | Key Modules |
|---|---|---|
| `webpack-3052f629dd0501d0.js` | Next.js webpack runtime & chunk loader | `r.p = "/_next/"`, chunk registry |
| `4bd1b696-f785427dddbba9fb.js` | React 19 / React DOM runtime | Core React reconciler |
| `1255-d90f22433f14e976.js` | Next.js App Router client runtime | `djb2Hash`, `hexHash`, `Link` prefetching, `useRouter` |
| `main-app-daaa2af3720827bc.js` | Next.js App Router hydration entry | App Router root mount |
| `44530001-7ead3819959cb4b4.js` | `@supabase/auth-js` (`GoTrueClient`) | OAuth, session storage, WebAuthn, autoRefreshTicker |
| `6962-2e36832f7a854c41.js` | `@supabase/ssr` + `postgrest-js` + `realtime-js` + `functions-js` | Module `188` (`createBrowserClient` exported as `tJ` / `k`) |
| `2619-3c9e02e22d10480a.js` | `next/link` | Client-side navigation `<Link>` component |
| `5239-77a5eac1fb3ff819.js` | `next/image` | Image loader & responsive `srcSet` (`/_next/image`) |
| `app/error-bfa6b72331ab2a5c.js` | Route Error Boundary | `Mod 5023` (`error_logs` reporter), `Mod 7173` (classifier: `app`/`network`/`stale`), `Mod 9567` |
| `app/global-error-fe6d1a0319c1a1f1.js` | Root Global Error Boundary | `Mod 8731` + `Mod 5023` (`error_logs` insert with 6-char ref code) |
| `app/(marketing)/page-fede579acdaf3cef.js` | Marketing Landing Page client components | `Mod 667` (`Button`), `Mod 764` (`ReviewSlider`), `Mod 4393` (`Reveal`), `Mod 5421` (`NavAuthCta`), `Mod 5850` (`Countdown`), `Mod 6785` (`MobileMenu`), `Mod 8612` (`HeroCta`) |
| `app/(auth)/login/page-a5cae780674e346b.js` | Login Page | `Mod 6075` (`AuthForm`: Google OAuth button + inline Google SVG) |
| `app/(auth)/register/page-382ed8cf39778b46.js` | Register Page | `Mod 7722` (`RegisterForm`), `Mod 8940` (police tracks & subject maps) |
| `app/(app)/layout-6a2bce8ab8eb5520.js` | Authenticated App Shell | `Mod 375` (`Breadcrumbs`), `Mod 791`/`2677` (`QuotaModal`), `Mod 1816` (`BrandPicker`), `Mod 1990` (`FocusWarmup`), `Mod 4625` (`AppNavLinks`), `Mod 5276` (`AppMobileMenu`), `Mod 5320` (LINE URL), `Mod 5723` (`DeviceGuard`), `Mod 6901` (`signOut`), `Mod 8062` (`ThemeToggle`), `Mod 9917` (`PendingProfileSaver`) |
| `_buildManifest.js` | Next.js build & route BloomFilter | `__routerFilterStatic` (33 items), `__routerFilterDynamic` (5 items) |
| `_ssgManifest.js` | Static site generation paths | `["/articles/[slug]", "/news/[slug]"]` |

---

## 2. Authenticated Page Chunks Recovered (`kb/07-assets/bundles/authenticated/chunks/`)

| Chunk File | Role | Key Modules & Mechanics |
|---|---|---|
| `app/(app)/dashboard/page-b5513e4759e0cd82.js` | Authenticated Dashboard | `Mod 1643` (`RedeemCode`: calls Supabase RPC `redeem_any_code`, displays `👑 PREMIUM` + days remaining + expiry date), Countdown clocks, Leaderboard tabs (`สายอำนวยการ / พิสูจน์หลักฐาน`, `ปราบปราม (บุคคลทั่วไป)`, `ปราบปราม (ทหารเกณฑ์)`). |
| `app/(app)/catalog/page-dcc4886e1bb7a92c.js` | Catalog Entry | `Mod 1919` (`StartExam` modal selector: random track 150q vs form sets vs subject drill). |
| `app/(app)/catalog/form/page-dc63f9856bcb1b66.js` | Form Mock Exam Sets | Links to `/exam/201?mode=real` .. `/exam/215?mode=real` (15 sets x 150 questions). |
| `app/(app)/catalog/subject/page-58932b20a6c73b00.js` | Subject Drills | Links to `/exam/101?mode=practice` .. `/exam/106?mode=practice` (+ `107` in DB). |
| `app/(exam)/exam/[setId]/page-1e01ed1c55b61eb5.js` | Exam Runner Engine | `Mod 7069` (`Runner`: question view, focus mode, timer, copy/cut/contextmenu block in `real` mode, 15-min away auto-submit, `gp:progress:v2` localStorage + `exam_progress` 15s debounce/visibilitychange `keepalive` PATCH, `attempts` insert, `gp:lastResult` sessionStorage), `Mod 3180` (`/qimg/` & `/simg/` image fallback proxy), `Mod 5022` (track subject weights), `C` (`ReportModal` uploading up to 3 images to Supabase storage bucket `report-images` + `question_reports` insert). |
| `app/(app)/history/page-b089d3fd56d7398b.js` | Attempt History | Server-rendered history wrapper. |
| `app/(app)/profile/page-a01b46e61e0d43e6.js` | Profile Settings | `Mod 2247` (`ProfileForm`: updates `profiles` fields `name`, `first_name`, `last_name`, `phone`, `birth_date`, `track`). |

---

## 3. Server-Rendered vs Client-Rendered Architecture (`[OBSERVED]`)
- Initial exam lists (`list` prop of 20 items on `/exam/101..107` and 150 items on `/exam/201..215`) are hydrated from Next.js React Server Components (`self.__next_f.push`), while client-side mutations (`exam_progress`, `attempts`, `question_reports`, `profiles` updates, `redeem_any_code` RPC, `report-images` storage uploads) execute directly against Supabase PostgREST/RPC/Storage via `@supabase/ssr`.
