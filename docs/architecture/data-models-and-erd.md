# 04 - Data Models & Entity-Relationship Diagram

Tables and columns marked `[OBSERVED]` were verified via live authenticated PostgREST JSON outputs (`7,038` questions, `4` exam_sets, `7` subjects, `1` profile) and decompiled JS chunks (`Mod 7069`, `Mod 1643`, `Mod 2247`, `Mod 5023`). Columns marked `[INFERRED]` apply to tables with 0 user rows on the observed account.

---

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "id = auth.uid()"
    SUBJECTS ||--o{ EXAM_SETS : "subject_key -> key"
    SUBJECTS ||--o{ QUESTIONS : "subject_key -> key"
    EXAM_SETS ||--o{ QUESTIONS : "set_id -> id (nullable)"
    PROFILES ||--o{ ATTEMPTS : "user_id -> id"
    PROFILES ||--|| EXAM_PROGRESS : "user_id -> id"
    PROFILES ||--o{ QUESTION_REPORTS : "reporter_id -> id"
    QUESTIONS ||--o{ QUESTION_REPORTS : "question_id -> id"
    PROFILES ||--o{ ERROR_LOGS : "user_id -> id"
    PROFILES ||--o{ REDEEM_CODES : "redeemed_by (INFERRED)"
    PROFILES ||--o{ IMPORT_LOGS : "created_by (INFERRED)"

    SUBJECTS {
        text key PK "OBSERVED: math,thai,eng,com,doc,law,soc"
        text name_th "OBSERVED"
        text icon "OBSERVED"
        text color "OBSERVED"
        text grp "OBSERVED: general | specific"
    }

    EXAM_SETS {
        bigint id PK "OBSERVED"
        text track "OBSERVED"
        int no "OBSERVED"
        text title "OBSERVED"
        int total "OBSERVED: 150 or 50"
        int time_minutes "OBSERVED: 180 or 50"
        text subject_key FK "OBSERVED: nullable"
    }

    PROFILES {
        uuid id PK "OBSERVED"
        text name "OBSERVED"
        text first_name "OBSERVED"
        text last_name "OBSERVED"
        text phone "OBSERVED"
        date birth_date "OBSERVED"
        text email "OBSERVED"
        text track "OBSERVED"
        text role "OBSERVED: user"
        boolean is_premium "OBSERVED"
        timestamptz premium_until "OBSERVED"
        text premium_track "OBSERVED: nullable"
        boolean suspended "OBSERVED"
        int free_bonus_rounds "OBSERVED"
        text active_session "OBSERVED: DeviceGuard UUID"
        timestamptz created_at "OBSERVED"
    }

    QUESTIONS {
        bigint id PK "OBSERVED: 7,038 rows"
        text subject_key FK "OBSERVED"
        bigint set_id FK "OBSERVED: nullable (mostly dynamic/pool)"
        text title "OBSERVED: 132 distinct topic labels"
        text batch "OBSERVED: import batch label"
        text body "OBSERVED: question stem or image URL"
        jsonb options "OBSERVED: string[4]"
        jsonb option_images "OBSERVED: nullable"
        int correct_index "OBSERVED: 0..3 (ก..ง)"
        text explanation "OBSERVED: nullable explanation text/URL"
        text image_url "OBSERVED: nullable"
        text explanation_image "OBSERVED: nullable"
    }

    EXAM_PROGRESS {
        uuid user_id PK "OBSERVED"
        bigint set_id "OBSERVED: negative for random-*"
        text mode "OBSERVED: real | practice"
        jsonb list "OBSERVED: [{id, subject}]"
        jsonb answers "OBSERVED: (number|null)[]"
        int cur "OBSERVED: current index"
        timestamptz started_at "OBSERVED"
        timestamptz end_at "OBSERVED"
        timestamptz updated_at "OBSERVED"
    }

    ATTEMPTS {
        bigint id PK "OBSERVED"
        uuid user_id FK "OBSERVED"
        bigint set_id "OBSERVED"
        text mode "OBSERVED"
        timestamptz started_at "OBSERVED"
        timestamptz submitted_at "OBSERVED"
        int duration_sec "OBSERVED"
        int score "OBSERVED"
        int total "OBSERVED"
        jsonb per_subject "OBSERVED"
        jsonb wrong "OBSERVED: wrong indices"
        boolean passed "OBSERVED"
        jsonb question_ids "OBSERVED"
        jsonb answers "OBSERVED"
    }

    QUESTION_REPORTS {
        bigint id PK "OBSERVED"
        bigint question_id FK "OBSERVED: nullable"
        text question_text "OBSERVED"
        uuid reporter_id FK "OBSERVED"
        text category "OBSERVED: question | system"
        text reason "OBSERVED"
        text note "OBSERVED: nullable"
        jsonb images "OBSERVED: paths in report-images bucket"
        jsonb context "OBSERVED: client diagnostics"
    }

    ERROR_LOGS {
        bigint id PK "INFERRED"
        text code "OBSERVED: 6-char ref"
        uuid user_id FK "OBSERVED: nullable"
        text path "OBSERVED"
        text name "OBSERVED"
        text message "OBSERVED"
        text digest "OBSERVED"
        text stack "OBSERVED"
        text user_agent "OBSERVED"
        boolean stale_chunk "OBSERVED"
    }
```

---

## 2. All Discovered Tables & Storage/RPCs (`[OBSERVED]`)

| Resource | Type | Authenticated Result / Purpose |
|---|---|---|
| `subjects` | Table | `7` rows (`math`, `thai`, `eng`, `com`, `doc`, `law`, `soc`) |
| `exam_sets` | Table | `4` rows (`1, 2, 3, 107` — note routes `/exam/101..107` and `/exam/201..215` are dynamically assembled from the `questions` pool!) |
| `questions` | Table | **`7,038` rows** (`100%` extracted with stems, 4 options, `correct_index`, explanations, and 1,386 image URLs) |
| `profiles` | Table | `1` user row (`16` exact columns verified) |
| `exam_progress` | Table | Active exam autosave state (`Mod 7069`, 15s debounce + `keepalive` PATCH on hide) |
| `attempts` | Table | Submitted exam results & per-subject score breakdowns (`Mod 7069`) |
| `question_reports` | Table | Question & system bug reports (`Mod 7069`) |
| `redeem_codes` | Table | Promo/Premium unlock codes; redeemed via RPC `redeem_any_code(p_code)` (`Mod 1643`) |
| `import_logs`, `error_logs`, `leads` | Tables | Admin upload logs, client crash logs (`Mod 5023`), marketing leads |
| `events`, `attendees` | Tables | Shared/legacy Supabase project tables (`HTTP 401` on anon) |
| `report-images` | Storage Bucket | Upload bucket for user bug-report screenshots (`.jpg`, `.png`, `.webp`, max 5MB x 3 files) |
