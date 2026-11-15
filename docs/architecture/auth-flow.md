# 03 - Authentication, Registration & Session Security Architecture

All mechanisms below were directly recovered from live chunks (`app/(auth)/login/page`, `app/(auth)/register/page`, `app/(app)/layout`, `app/(marketing)/page`, and `/auth/v1/settings`) (`[OBSERVED]`).

---

## 1. Supabase Auth Configuration (`[OBSERVED]`)
Queried live from `https://wnsgsamwljlkzgtvyssx.supabase.co/auth/v1/settings`:
- **Enabled External Providers**: `google: true`, `email: true` (all others `false`).
- **Signup Policy**: `disable_signup: false`, `mailer_autoconfirm: false`, `passkeys_enabled: false`.
- **Client Auth Mode**: `@supabase/ssr` `createBrowserClient` storing session tokens in HTTP cookies (`sb-wnsgsamwljlkzgtvyssx-auth-token`), readable by both Next.js Middleware/Server Components and Client Components.

---

## 2. Login, Registration & Single-Device Enforcement Flows

```mermaid
sequenceDiagram
    actor User
    participant Reg as /register (RegisterForm Mod 7722)
    participant Login as /login (AuthForm Mod 6075)
    participant SS as sessionStorage / localStorage
    participant SupaAuth as Supabase Auth (Google OAuth)
    participant CB as /auth/callback
    participant App as /(app)/layout (DeviceGuard & PendingProfileSaver)
    participant DB as Supabase PostgreSQL (profiles)

    alt New User Registration (/register)
        User->>Reg: Fill firstName, lastName, phone, email, birthDate, track
        Reg->>Reg: Validate phone (/^0\d{8,9}$/), email, non-empty fields
        Reg->>SS: sessionStorage.setItem("gp:pendingProfile", JSON)
        Reg->>SupaAuth: signInWithOAuth({ provider: "google", redirectTo: origin + "/auth/callback" })
    else Existing User Login (/login)
        User->>Login: Click "เข้าสู่ระบบด้วย Google"
        Login->>SupaAuth: signInWithOAuth({ provider: "google", redirectTo: origin + "/auth/callback" })
    end

    SupaAuth-->>CB: Redirect with ?code=...
    CB->>SupaAuth: Exchange code for session & set sb-*-auth-token cookie
    CB-->>App: Redirect to /dashboard

    par PendingProfileSaver (Mod 9917)
        App->>SS: Read sessionStorage["gp:pendingProfile"]
        App->>SupaAuth: auth.getUser()
        alt pendingProfile.email === user.email
            App->>DB: profiles.update({ name, first_name, last_name, phone, birth_date, track }).eq("id", user.id)
            App->>SS: sessionStorage.removeItem("gp:pendingProfile")
            App->>App: router.refresh()
        end
    and DeviceGuard (Mod 5723)
        App->>SS: Get or generate crypto.randomUUID() in localStorage["gp:device"]
        App->>DB: profiles.update({ active_session: deviceId }).eq("id", user.id)
        loop Every 60,000ms AND on window.focus
            App->>DB: profiles.select("active_session").eq("id", user.id).maybeSingle()
            alt active_session !== deviceId
                App->>SupaAuth: auth.signOut()
                App-->>Login: router.replace("/login?kicked=1")
            end
        end
    end
```

---

## 3. Exact Recovered Auth & Security Behaviors (`[OBSERVED]`)

### 3.1 `RegisterForm` Validation Rules (Module `7722`)
- **First & Last Name**: Required (`!firstName.trim() || !lastName.trim()` -> `"กรอกชื่อจริงและนามสกุล"`).
- **Phone**: Strips `-` and spaces, validates `/^0\d{8,9}$/` (9-10 digits starting with `0`, else `"เบอร์โทรไม่ถูกต้อง (เช่น 0812345678)"`).
- **Email**: Validates `/.+@.+\..+/` (`"อีเมลไม่ถูกต้อง"`).
- **Birth Date**: Required date input (`max` = today YYYY-MM-DD, `"เลือกวันเดือนปีเกิด"`).
- **Track**: Select from `["สายอำนวยการ / พิสูจน์หลักฐาน", "ปราบปราม (บุคคลทั่วไป)", "ปราบปราม (ทหารเกณฑ์)"]`.
- **OAuth Handoff**: Saves profile JSON to `sessionStorage['gp:pendingProfile']` and initiates Google OAuth without password.

### 3.2 `DeviceGuard` 1-Device Enforcement (Module `5723`)
- On mount in `(app)/layout`, reads or generates UUID in `localStorage['gp:device']` (validated against `/^[0-9a-f-]{8,64}$/i`).
- Writes `active_session = deviceId` into `public.profiles` if `active_session` is `null` or differs from `deviceId`.
- Polls `profiles.select("active_session")` every `60,000ms` and on `window` `focus` event.
- If another device logs in and overwrites `active_session`, this session immediately executes `supabase.auth.signOut()` and navigates to `/login?kicked=1`.

### 3.3 `signOut` Server Action (Module `6901`)
- Next.js Server Action ID: `00e70b410f4cefb0700a5682c6171d3d8a93181dec` (`createServerReference(..., "signOut")`), invoked via `<form action={signOut}>` in `NavAuthCta`, `MobileMenu`, and `AppMobileMenu`.

### 3.4 `FocusWarmup` (Module `1990`)
- Tracks `document.visibilityState === "hidden"` timestamp; if tab returns after `>= 45,000ms`, triggers `fetch(window.location.pathname, { credentials: "include" })` to refresh SSR/cookie state before user interaction.

