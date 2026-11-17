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
      <main className="mx-auto max-w-6xl px-4 py-7 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับหน้าเลือกโหมดข้อสอบ</span>
            </Link>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
              <BookOpenCheck className="h-6 w-6 text-brand shrink-0" />
              <span>คลังข้อสอบแยกตามหัวข้อย่อย</span>
            </h1>
            <p className="mt-1 text-sm text-muted tabular-nums">
              เลือกฝึกเฉพาะบทในทั้ง 7 วิชา · {totalTopicCards} หัวข้อย่อย · {allQuestions.length.toLocaleString('en-US')} ข้อ
            </p>
          </div>

          <Link
            href="/catalog/subject"
            className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-panel px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:border-brand/50 hover:text-brand"
          >
            <Layers className="h-4 w-4 text-teal-ink" />
            <span>ไปหน้าแยกรายวิชา 7 วิชา</span>
          </Link>
        </div>

        <CatalogTopicsClient
          topicsBySubject={topicsBySubject}
          subjectTotals={subjectTotals}
        />
      </main>
    </div>
  );
}
