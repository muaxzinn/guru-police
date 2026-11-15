# 05 - User Flows & System State Machines (`examgurupolice.netlify.app`)

Every flow below combines `[OBSERVED]` route transitions, component logic, and FAQ behavior, with `[INFERRED]` server-side transitions labeled explicitly.

---

## 1. End-to-End User Lifecycle Flow

```mermaid
flowchart TD
    Landing["/ (Landing Page)"] -->|"Click สมัครสมาชิกฟรี"| Reg["/register"]
    Landing -->|"Click เข้าสู่ระบบ"| Login["/login"]
    Landing -->|"Read Guides"| Articles["/articles & /news"]

    Reg -->|"Fill 6 fields + Submit"| Pending["sessionStorage['gp:pendingProfile']"]
    Pending -->|"Google OAuth"| AuthCB["/auth/callback"]
    Login -->|"Google OAuth"| AuthCB

    AuthCB -->|"Set sb-*-auth-token cookie"| Dash["/dashboard"]
    Dash -->|"PendingProfileSaver"| SyncProfile["PATCH profiles (first_name, last_name, phone, birth_date, track)"]
    Dash -->|"DeviceGuard (60s poll + focus)"| LockCheck{"profiles.active_session === gp:device?"}
    LockCheck -->|"No (Another device logged in)"| Kick["signOut() -> /login?kicked=1"]
    LockCheck -->|"Yes"| ModeSelect["Choose Practice Mode"]

    ModeSelect -->|"Mode 1: Random All Subjects (INFERRED)"| Exam["/exam/[id]"]
    ModeSelect -->|"Mode 2: Google-Form Set (/catalog/form)"| Exam
    ModeSelect -->|"Mode 3: Subject Drill (/catalog/subject)"| Exam

    Dash -->|"Quota Exhausted"| Quota["?quota=1 -> QuotaModal -> LINE @gurupolice"]
    Exam -->|"Submit Attempt"| Result["/result/[id] (Score + Subject Breakdown + Explanations)"]
    Result -->|"Report Issue"| Reports["/reports"]
    Dash --> History["/history"] --> Result
    Dash --> Profile["/profile (Edit Profile / Redeem Code)"]
```

---

## 2. Exam Taking & Review State Machine (`[OBSERVED]` Routes + `[INFERRED]` UI State)

```mermaid
stateDiagram-v2
    [*] --> CatalogSelection: Choose Track / Mode / Set
    CatalogSelection --> QuotaCheck: Start Exam (/exam/[id])
    QuotaCheck --> QuotaBlocked: Free/Expired Quota -> ?quota=1 Modal
    QuotaCheck --> InProgress: Timer Starts (180m full / 50m subject)
    
    state InProgress {
        [*] --> Answering
        Answering --> Navigating: Jump via Question Grid / Next-Prev
        Navigating --> Answering
    }

    InProgress --> Submitting: Click Submit or Timer == 0
    Submitting --> GradedResult: /result/[id] (Score + Pass/Fail + Explanations)
    GradedResult --> ReportIssue: /reports (Flag Wrong Answer/Typo)
    GradedResult --> HistoryList: /history
```

---

## 3. Client Error Recovery State Machine (`[OBSERVED]` in `app/error` & `app/global-error`)

```mermaid
flowchart TD
    Err["Client / RSC Error Thrown"] --> Classify{"Mod 7173 Error Classifier"}
    Classify -->|"ChunkLoadError / Server Action mismatch"| Stale["stale: Auto reload once via sessionStorage['gp:chunk-reloaded']"]
    Classify -->|"Failed to fetch / ERR_NETWORK"| Net["network: Show 📶 การเชื่อมต่อหลุด + Retry"]
    Classify -->|"Application Error"| AppErr["app: Generate 6-char Ref Code + Deduplicate via gp:err-seen (10m)"]
    AppErr --> LogDB["INSERT public.error_logs (code, user_id, path, message, stack)"]
    LogDB --> ShowUI["Show 😵 มีบางอย่างผิดพลาด + Ref Code + Reload/Retry"]
```

