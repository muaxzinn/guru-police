# 05 - Business Rules & Domain Logic (`examgurupolice.netlify.app`)

All rules below are cited directly from recovered JS modules (`Mod 8940`, `Mod 5022`, `Mod 5723`, `Mod 791`, `Mod 7722`, `Mod 1643`, `Mod 7069`, `Mod 3180`), authenticated Supabase datasets (`7,038` questions, `profiles`, `subjects`, `exam_sets`), and Landing FAQ (`[OBSERVED]`).

---

## 1. Police Exam Tracks & Exact Question Weights (`[OBSERVED]` in `Mod 8940` + `Mod 5022`)

| Track Name (`track`) | Subject Question Weights (150-Question Full Exam) | Target Exam Date (`Countdown`) |
|---|---|---|
| `สายอำนวยการ / พิสูจน์หลักฐาน` | `math: 20`, `thai: 20`, `doc: 30`, `com: 40`, `law: 25`, `eng: 15`, `soc: 0` | `29 พ.ย. 2569` (`2026-11-29T01:30:00.000Z`) |
| `ปราบปราม (บุคคลทั่วไป)` | `math: 30`, `thai: 25`, `doc: 0`, `com: 25`, `law: 20`, `eng: 30`, `soc: 20` | `17 ม.ค. 2570` (`2027-01-17T01:30:00.000Z`) |
| `ปราบปราม (ทหารเกณฑ์)` | `math: 25`, `thai: 25`, `doc: 0`, `com: 25`, `law: 30`, `eng: 25`, `soc: 20` | `17 ม.ค. 2570` (`2027-01-17T01:30:00.000Z`) |

---

## 2. Exam Modes, Grading & Runner Mechanics (`[OBSERVED]` in `Mod 7069`, `Mod 5022`, `catalog/*`)
1. **Practice Entry Points (`Mod 1919` + `/catalog/*`)**:
   - **สุ่มข้อสอบครบทุกวิชา (`/exam/random-*`)**: Assembles 150 questions weighted by the selected track (`Mod 5022`). Dashboard Leaderboard (`🏆 กระดานคะแนน`) ranks **only** top 5 scores from random 150-question mode (`"นับเฉพาะคะแนนจากโหมดสุ่ม 150 ข้อเท่านั้นนะน้อง"`), breaking ties by fastest completion time.
   - **ข้อสอบเป็นชุด คล้าย Google Form (`/catalog/form`)**: 15 sets (`/exam/201`..`/exam/215` in `mode=real`, **150 questions each**).
   - **ข้อสอบแยกรายวิชา (`/catalog/subject`)**: 7 subject drills (`/exam/101`..`/exam/107` in `mode=practice`, **20 questions each**).
2. **Pass Criteria (`Mod 7069` grading logic)**:
   - Overall accuracy `pct >= 60%` **AND** when `passRule === "groups"`, **both** `"general"` (`ความสามารถทั่วไป + ภาษาไทย`) and `"specific"` (track-specific subjects) group averages must individually achieve `>= 60%`.
3. **Anti-Cheat & Auto-Submit Rules in `real` Timed Mode (`Mod 7069`)**:
   - Disables browser `copy`, `cut`, and `contextmenu` events + applies `select-none`.
   - Warns: `"หากออกจากแอปนานเกิน 15 นาที ระบบจะส่งคำตอบและคำนวณคะแนนโดยอัตโนมัติ"` (`$w = 15` min). Returning after `awayAt` > 15 minutes immediately auto-submits the attempt.
   - Autosaves `gp:progress:v2` in `localStorage` + `exam_progress` table (`15s` debounce when `fullDbAutosave=true`, and synchronous `fetch(..., { method: "PATCH", keepalive: true })` on `pagehide` / `visibilitychange -> hidden`).
4. **Practice vs Review Behavior**:
   - In `practice` mode, answers lock immediately upon selection (if not `drill`), revealing instant correctness and `💡` explanation.
   - In `real` mode, explanations remain hidden until after submission (`/result/[id]`).
5. **Dual-CDN Image Fallback (`Mod 3180`)**:
   - Automatically alternates between Netlify proxy paths (`/qimg/`, `/simg/`) and direct origin URLs (`guru-eng-exam-images.netlify.app`, Supabase Storage `object/public/`) across up to 3 retry attempts (`r=1, 2`) before displaying a manual retry button.

---

## 3. Access Control, Premium & Code Redemption (`[OBSERVED]` in `Mod 1643`, `Mod 5723`)
1. **Redemption RPC (`redeem_any_code`)**: Supports two reward types:
   - `kind === "rounds"`: Adds `free_bonus_rounds` (`"ได้รอบฟรีเพิ่ม X รอบ!"`).
   - Default (Premium): Grants `duration_days` (typically `365` days -> `is_premium: true`, `premium_until`), rendering `👑 PREMIUM เหลืออีก X วัน` pill on `/dashboard`.
2. **Single-Device Enforcement (`DeviceGuard`, `Mod 5723`)**:
   - Strictly `1 user = 1 active device` via `localStorage['gp:device']` synced with `profiles.active_session`, polled every `60,000ms` + window focus; mismatch redirects to `/login?kicked=1`.
3. **Admin Route Protection (`/admin/*`)**:
   - Non-admin users (`role: "user"`) are server-redirected (`HTTP 307 -> /dashboard`) on all `/admin*` routes (`verified live`).
