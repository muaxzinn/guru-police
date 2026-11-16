import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogTopicsClient } from '@/components/CatalogTopicsClient';
import { buildSubTopicsCatalog } from '@/lib/topic-catalog';
import { getAllQuestionsMerged, getStore, readRuntimeState } from '@/lib/server-db';

export default function CatalogTopicsPage() {
  const store = getStore();
  const runtime = readRuntimeState();
  const hasCustom = Boolean(runtime.customQuestions?.length);
  const allQuestions = hasCustom ? getAllQuestionsMerged() : store.questions;
  const { topicsBySubject, subjectTotals, totalTopicCards } = hasCustom
    ? buildSubTopicsCatalog(allQuestions)
    : store.subTopicsCatalog;

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับหน้าเลือกโหมดข้อสอบ</span>
            </Link>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-extrabold sm:text-3xl">
              <BookOpenCheck className="h-7 w-7 text-brand shrink-0" />
              <span>คลังข้อสอบแยกตามเนื้อหาย่อยรายวิชา</span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              เลือกฝึกเฉพาะบทหรือเนื้อหาย่อยของแต่ละวิชา (เช่น Microsoft Word, Excel, PowerPoint, แพ่ง/อาญา, อนุกรม) จากทั้งหมด{' '}
              <strong className="font-mono text-ink">{totalTopicCards} หัวข้อ</strong> ·{' '}
              <strong className="font-mono text-ink">
                {allQuestions.length.toLocaleString('en-US')} ข้อ
              </strong>
            </p>
          </div>

          <Link
            href="/catalog/subject"
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
          >
            <Layers className="h-4 w-4 text-teal-ink" />
            <span>ไปหน้าชุดข้อสอบรวมรายวิชา 7 วิชา</span>
          </Link>
        </div>

        <div className="mt-6">
          <CatalogTopicsClient
            topicsBySubject={topicsBySubject}
            subjectTotals={subjectTotals}
          />
        </div>
      </main>
    </div>
  );
}
