# GURU POLICE V2

ระบบแพลตฟอร์มติวสอบและคลังข้อสอบนายสิบตำรวจ (Next.js 15 + TypeScript + Tailwind CSS + pnpm)

## โครงสร้างโปรเจกต์

- `src/` — โค้ดหลักของเว็บแอปพลิเคชัน (App Router, Exam Runner, Diagnostic Result, Question Bank, Admin Backoffice, API Routes)
- `data/dataset/` — คลังข้อสอบจริง **7,038 ข้อ** แยกตาม 7 รายวิชาและ 22 ชุดข้อสอบ พร้อมบทความและข่าวรับสมัคร
- `public/question-images/` — ภาพประกอบข้อสอบจริง **1,386 ไฟล์** และสินทรัพย์หน้า Landing
- `supabase/` — สคีมาฐานข้อมูล PostgreSQL, RLS Policies และ Atomic RPCs (`SELECT ... FOR UPDATE`)
- `docs/` — เอกสารสถาปัตยกรรม (`docs/architecture/`) และข้อกำหนดระบบ/ดีไซน์ (`docs/product/`)
- `skills/` — Agent & project skills เฉพาะทางของโปรเจกต์
- `scripts/` — สคริปต์ตรวจสอบคุณภาพระบบ (`verify-app.mjs`)

## คำสั่งหลัก (`pnpm`)

```bash
# ติดตั้งแพ็กเกจ
pnpm install

# รันโหมดพัฒนา (http://localhost:3199)
pnpm dev

# Build สำหรับ Production
pnpm build

# เปิด Production Server (http://localhost:3199)
pnpm start

# ตรวจสอบ E2E API + Headless Chrome UI
pnpm verify
```
