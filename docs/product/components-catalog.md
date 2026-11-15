# 02 - UI Components Catalog (`examgurupolice.netlify.app`)

Every component below is reconstructed directly from the recovered production JS modules (`[OBSERVED]`).

---

## 1. Navigation & Theme Controls
| Component | Module / Chunk | Props & State | Behavior (`[OBSERVED]`) |
|---|---|---|---|
| `ThemeToggle` | `Mod 8062` (`(app)/layout` & `(marketing)/page`) | `{ className?: string }` | Toggles `document.documentElement.dataset.theme` (`"light"`/`"dark"`) and persists `localStorage['gp:theme']`. Renders `🌙` / `☀️`. |
| `BrandPicker` | `Mod 1816` (`(app)/layout` & `(marketing)/page`) | `{ className?: string }` | Floating pill `role="menu"` with 5 radio color dots (`blue` `#1d4ed8`, `red` `#e60707`, `orange` `#ea580c`, `yellow` `#a16207`, `brown` `#92400e`). Closes on outside `mousedown`. Persists `localStorage['gp:brand']`. |
| `NavAuthCta` | `Mod 5421` (`(marketing)/page`) | Reads `sb-*-auth-token` cookie & `profiles.name` | Unauthenticated: `เข้าสู่ระบบ` (ghost) + `สมัครสมาชิก` (primary). Authenticated: `ทำข้อสอบ` (`/dashboard`) + circular avatar dropdown with `name`, `email`, and `<form action={signOut}>`. |
| `MobileMenu` | `Mod 6785` (`(marketing)/page`) | `{ links }` | Full-width mobile drawer under sticky navbar; locks `document.body.style.overflow = "hidden"` while open. |
| `AppNavLinks` | `Mod 4625` (`(app)/layout`) | Static list of 5 links | Renders `/`, `/dashboard`, `/history`, `/reports`, `/profile` with active `text-brand` highlight via `usePathname()`. |
| `AppMobileMenu` | `Mod 5276` (`(app)/layout`) | `{ isAdmin: boolean, adminHref?: string }` | Mobile drawer inside `(app)`; conditionally renders `🛡️ Admin Console` link if `isAdmin === true`, plus `ออกจากระบบ` form. |
| `Breadcrumbs` | `Mod 375` (`(app)/layout`) | `{ className?: string }` | Maps URL path segments using dictionary (`dashboard`, `catalog`, `form`, `subject`, `history`, `result`, `admin`, `reports`, `sets`, `users`, `codes`, `create`, `analytics`, `questions`, `upload`). Hidden when depth `<= 1`. |

---

## 2. Marketing & Interactive Widgets
| Component | Module / Chunk | Props & Behavior (`[OBSERVED]`) |
|---|---|---|
| `Button` (`$`, `V`) | `Mod 667` (`(marketing)/page`) | Variants: `primary` (`from-brand to-brand-dark`, shadow), `ghost` (`bg-panel/70 border-line`), `white` (`bg-panel text-ink`). Sizes: `sm` (`px-4 py-2`), `md` (`px-7 py-4`). |
| `Countdown` | `Mod 5850` (`(marketing)/page`) | `{ date: Date, className?: string }`. 4-column `tabular-nums` timer (`วัน` highlighted in `--gold`, `ชั่วโมง`, `นาที`, `วินาที`) updating every `1000ms`. |
| `ReviewSlider` | `Mod 764` (`(marketing)/page`) | `{ images: string[], lineLink?: boolean }`. Horizontal `snap-x` carousel with `5000ms` autoplay (pauses on `onPointerDown`), prev/next circular buttons, indicator dots, and `createPortal` lightbox modal (closes on `Escape` or backdrop click) + optional green LINE CTA. |
| `Reveal` | `Mod 4393` (`(marketing)/page`) | `IntersectionObserver` scroll-triggered fade-up (`gp-rise`) wrapper. |

---

## 3. Auth, Session & Guard Components
| Component | Module / Chunk | Props & Behavior (`[OBSERVED]`) |
|---|---|---|
| `AuthForm` | `Mod 6075` (`login/page`) | `{ mode: "login" \| "register" }`. Renders Google SVG button calling `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: origin + "/auth/callback" } })`. |
| `RegisterForm` | `Mod 7722` (`register/page`) | Collects 6 fields (`firstName`, `lastName`, `phone`, `email`, `birthDate`, `track`), validates regexes, persists `sessionStorage['gp:pendingProfile']`, triggers Google OAuth. |
| `PendingProfileSaver` | `Mod 9917` (`(app)/layout`) | Runs on mount in `(app)` layout; matches `pendingProfile.email` with `auth.getUser().email`, updates `public.profiles`, clears `sessionStorage`, calls `router.refresh()`. |
| `DeviceGuard` | `Mod 5723` (`(app)/layout`) | Generates `localStorage['gp:device']` UUID, sets `profiles.active_session`, polls every `60,000ms` + `window.focus`; kicks duplicate sessions to `/login?kicked=1`. |
| `QuotaModal` | `Mod 2677` & `791` (`(app)/layout`) | Listens for `?quota=1` searchParam; opens centered modal `"🔒 สิทธิ์ของคุณหมดแล้ว"` with LINE CTA `https://line.me/R/ti/p/@gurupolice`. |
| `FocusWarmup` | `Mod 1990` (`(app)/layout`) | Triggers `fetch(pathname, { credentials: "include" })` when returning to a tab hidden `>= 45,000ms`. |
| `ErrorBoundary` | `app/error` & `app/global-error` | Classifies errors (`stale` -> auto-reload once via `gp:chunk-reloaded`; `network`; `app`), generates 6-char ref code, inserts into `public.error_logs` (deduplicated via `gp:err-seen` for 10 min). |

