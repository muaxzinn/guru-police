# 04 - API Contracts (`examgurupolice.netlify.app` & Supabase)

All endpoints and schemas below are documented with strict evidence tags: `[OBSERVED]` from live HTTP/PostgREST/JS bundle inspection, and `[INFERRED]` where table columns or server actions are deduced from client usage and route structure.

---

## 1. Next.js Application Endpoints (`https://examgurupolice.netlify.app`)

### 1.1 `GET /api/health` (`[OBSERVED]`)
- **Headers**: `cache-control: no-cache`, `content-type: application/json`
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "db": "ok",
  "ms": 21,
  "ts": "2026-11-13T06:37:12.316Z"
}
```

### 1.2 `GET /auth/callback` (`[OBSERVED]`)
- **Query Params**: `?code=<oauth_pkce_or_auth_code>`
- **Behavior**: Exchanges Supabase OAuth code for session cookies (`sb-wnsgsamwljlkzgtvyssx-auth-token`) and redirects to `/dashboard`.
- **Error Behavior (`[OBSERVED]`)**: Calling without `?code=` returns `HTTP 307` -> `/login?error=%E0%B9%84%E0%B8%A1%E0%B9%88%E0%B8%9E%E0%B8%9A%E0%B8%A3%E0%B8%AB%E0%B8%B1%E0%B8%AA%E0%B8%A2%E0%B8%B7%E0%B8%99%E0%B8%A2%E0%B8%B1%E0%B8%99%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%82%E0%B9%89%E0%B8%B2%E0%B8%AA%E0%B8%B9%E0%B9%88%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A` ("ไม่พบรหัสยืนยันการเข้าสู่ระบบ").

### 1.3 Server Action `signOut` (`[OBSERVED]` in Mod `6901`)
- **Action ID**: `00e70b410f4cefb0700a5682c6171d3d8a93181dec`
- **Invoked By**: `<form action={signOut}>` in `NavAuthCta`, `MobileMenu`, `AppMobileMenu` (`POST` with `Next-Action` header).

---

## 2. Supabase PostgREST & Auth Endpoints (`https://wnsgsamwljlkzgtvyssx.supabase.co`)

- **Required Headers**:
  - `apikey: <SUPABASE_ANON_KEY>`
  - `Authorization: Bearer <SUPABASE_ANON_KEY | USER_ACCESS_TOKEN>`

### 2.1 `GET /auth/v1/settings` (`[OBSERVED]`)
- **Response `200 OK`**: `external.google: true`, `external.email: true`, `disable_signup: false`, `mailer_autoconfirm: false`.

### 2.2 `GET /rest/v1/subjects?select=*` (`[OBSERVED]` Public Read)
- **Response `200 OK` (7 rows)**:
```json
[
  { "key": "math", "name_th": "ความสามารถทั่วไป", "icon": "🧮", "color": "#14b8a6", "grp": "general" },
  { "key": "thai", "name_th": "ภาษาไทย", "icon": "📖", "color": "#6366f1", "grp": "general" },
  { "key": "eng", "name_th": "ภาษาอังกฤษ", "icon": "🔤", "color": "#0ea5e9", "grp": "specific" },
  { "key": "com", "name_th": "คอมพิวเตอร์", "icon": "💻", "color": "#f59e0b", "grp": "specific" },
  { "key": "doc", "name_th": "งานสารบรรณ + ลักษณะที่ 54", "icon": "📋", "color": "#ec4899", "grp": "specific" },
  { "key": "law", "name_th": "กฎหมาย", "icon": "⚖️", "color": "#0891b2", "grp": "specific" },
  { "key": "soc", "name_th": "สังคม", "icon": "🌏", "color": "#16a34a", "grp": "specific" }
]
```

### 2.3 `GET /rest/v1/exam_sets?select=*` (`[OBSERVED]` Public Read)
- **Response `200 OK` (4 publicly visible rows)**:
```json
[
  { "id": 1, "track": "สายอำนวยการ / พิสูจน์หลักฐาน", "no": 1, "title": "ข้อสอบจำลองนายสิบตำรวจ สายอำนวยการ ชุดที่ 1", "total": 150, "time_minutes": 180, "subject_key": null },
  { "id": 2, "track": "สายอำนวยการ / พิสูจน์หลักฐาน", "no": 2, "title": "ข้อสอบจำลองนายสิบตำรวจ สายอำนวยการ ชุดที่ 2", "total": 150, "time_minutes": 180, "subject_key": null },
  { "id": 3, "track": "สายอำนวยการ / พิสูจน์หลักฐาน", "no": 3, "title": "ข้อสอบจำลองนายสิบตำรวจ สายอำนวยการ ชุดที่ 3", "total": 150, "time_minutes": 180, "subject_key": null },
  { "id": 107, "track": "ฝึกรายวิชา", "no": 7, "title": "ฝึกรายวิชา · สังคม", "total": 50, "time_minutes": 50, "subject_key": "soc" }
]
```

### 2.4 `profiles` Operations (`[OBSERVED]` in Mod `5421`, `5723`, `9917`)
- `GET /rest/v1/profiles?select=name&id=eq.<uid>` (NavAuthCta avatar)
- `GET /rest/v1/profiles?select=active_session&id=eq.<uid>` (DeviceGuard 60s poll)
- `PATCH /rest/v1/profiles?id=eq.<uid>` with `{ "active_session": "<uuid>" }` (DeviceGuard claim)
- `PATCH /rest/v1/profiles?id=eq.<uid>` with `{ "name", "first_name", "last_name", "phone", "birth_date", "track" }` (PendingProfileSaver)

### 2.5 `POST /rest/v1/error_logs` (`[OBSERVED]` in Mod `5023`)
- **Payload**: `{ "code": "6-char", "user_id": "uuid|null", "path": "string", "name": "string|null", "message": "string|null", "digest": "string|null", "stack": "string|null", "user_agent": "string|null", "stale_chunk": "boolean" }`.

### 2.6 Authenticated / RLS-Protected Tables (`[OBSERVED]` existence via PostgREST schema cache; `[INFERRED]` exact row payloads)
- `GET /rest/v1/questions?select=*` (returns `[]` on anon due to RLS; requires user JWT)
- `GET/POST /rest/v1/attempts` (exam attempts & score records)
- `GET/POST /rest/v1/question_reports` (question issue reports at `/reports` & `/admin/reports`)
- `GET/POST /rest/v1/redeem_codes` (premium unlock codes at `/admin/codes` & `/profile`)
- `GET /rest/v1/import_logs` (bulk question import logs at `/admin/questions/upload`)

