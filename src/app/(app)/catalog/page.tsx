import React from 'react';
import Link from 'next/link';
import { Archive, ArrowRight, BookOpenCheck, Database, FileSpreadsheet, Layers, Shuffle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { TRACKS } from '@/lib/constants';
import { getAllQuestionsMerged, getStore } from '@/lib/server-db';

export default function CatalogHubPage() {
  const store = getStore();
  const totalQ = getAllQuestionsMerged().length;
  const formSets = store.examSets.filter((s) => s.kind === 'form');

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="text-xs font-bold text-muted">ทำข้อสอบ / คลังข้อสอบทั้งหมด</div>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">เลือกโหมดการทำข้อสอบ</h1>
        <p className="mt-1 text-sm text-muted">
          ครบทั้ง 4 รูปแบบการฝึก จากคลังข้อสอบจริง {totalQ.toLocaleString()} ข้อ
        </p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-panel p-6 shadow-card">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Shuffle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">สุ่มข้อสอบครบทุกวิชา (150 ข้อ)</h2>
            <p className="mt-1 text-xs text-muted">
              สุ่มจัดชุดตามสัดส่วนจริงของแต่ละสายสอบ จับเวลา 180 นาที และขึ้นกระดานคะแนน Top 5
            </p>
            <div className="mt-4 space-y-2">
              {TRACKS.map((t) => (
                <Link
                  key={t.id}
                  href={`/exam/random-${t.id}?mode=real`}
                  className="flex items-center justify-between rounded-xl border border-line bg-bg2/60 px-3.5 py-2.5 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
                >
                  <span>{t.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/catalog/form"
            className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-6 shadow-card"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/15 text-teal-ink">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">ฟอร์มข้อสอบจำลอง ({formSets.length} ชุด)</h2>
              <p className="mt-1 text-xs text-muted">
                ชุดข้อสอบมาตรฐานชุดละ 150 ข้อ ทำได้ทั้งโหมดสอบจริงและโหมดฝึกซ้อม
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <span>เปิดดูทั้ง {formSets.length} ชุด</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/catalog/subject"
            className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-6 shadow-card"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/15 text-violet">
                <Layers className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">ข้อสอบแยกรายวิชา (7 วิชา)</h2>
              <p className="mt-1 text-xs text-muted">
                แบ่งทำเป็นชุดย่อยชุดละ 20 / 50 ข้อเรียงลำดับ หรือสุ่มฝึกเข้มข้น 20 / 50 / 100 ข้อ พร้อมเฉลยละเอียด
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <span>เลือกรายวิชา</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/catalog/topics"
            className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-6 shadow-card"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">
                แยกหัวข้อย่อยรายวิชา (Word, Excel, กฎหมายแพ่ง/อาญา, อนุกรม ฯลฯ)
              </h2>
              <p className="mt-1 text-xs text-muted">
                แยกเนื้อหาย่อยละเอียดครบทุกบทในทั้ง 7 วิชา แบ่งชุดย่อยเรียงตามข้อ หรือกดซ่อมเฉพาะเรื่องที่ไม่ถนัด
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <span>เลือกหัวข้อย่อยของแต่ละวิชา</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/catalog/completed"
            className="card-hover flex flex-col justify-between rounded-card border border-brand/35 bg-brand/[0.04] p-6 shadow-card"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                <Archive className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">
                ชุดข้อสอบที่เคยทำแล้ว (รวม · ทำถูก · ทำผิด)
              </h2>
              <p className="mt-1 text-xs text-muted">
                รวมเฉพาะข้อที่เคยทำแล้วมาจัดชุดใหม่ทั้งแบบรวมทั้งหมด ทำถูกอย่างเดียว หรือทำผิดอย่างเดียว (150 ข้อ / แยกวิชา / หัวข้อย่อย)
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <span>เปิดชุดข้อสอบที่เคยทำแล้ว</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          <Link
            href="/bank"
            className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-6 shadow-card"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/15 text-gold-ink">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-extrabold">คลังเจาะลึก {store.topics.length} หัวข้อย่อย</h2>
              <p className="mt-1 text-xs text-muted">
                ค้นหาโจทย์จากคลัง {totalQ.toLocaleString()} ข้อ กรองตามบทและชุดนำเข้า หรือเปิดอ่านเฉลยแบบ Flashcard
              </p>
            </div>
            <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              <span>เปิดคลังข้อสอบ</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

