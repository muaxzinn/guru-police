import React from 'react';
import Link from 'next/link';
import { Archive, ArrowLeft, BookOpenCheck, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogCompletedClient } from '@/components/CatalogCompletedClient';
import { buildSubTopicsCatalog } from '@/lib/topic-catalog';
import { getAllQuestionsMerged, getStore, readRuntimeState } from '@/lib/server-db';

export default function CatalogCompletedPage() {
  const store = getStore();
  const runtime = readRuntimeState();
  const hasCustom = Boolean(runtime.customQuestions?.length);
  const allQuestions = hasCustom ? getAllQuestionsMerged() : store.questions;
  const { topicsBySubject } = hasCustom
    ? buildSubTopicsCatalog(allQuestions)
    : store.subTopicsCatalog;

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
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
              <Archive className="h-7 w-7 text-brand shrink-0" />
              <span>ชุดข้อสอบที่เคยทำแล้ว (รวม · ทำถูก · ทำผิด)</span>
            </h1>
            <p className="mt-1 text-sm text-muted">
              รวบรวมทุกข้อที่เคยตอบแล้วมาจัดเป็นชุดข้อสอบใหม่ทั้งแบบชุดใหญ่ 150 ข้อ แยกรายวิชา 7 วิชา และแยกหัวข้อย่อยรายบท
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/catalog/topics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
            >
              <BookOpenCheck className="h-4 w-4 text-brand" />
              <span>ไปฝึกหัวข้อย่อย (ข้อใหม่)</span>
            </Link>
            <Link
              href="/catalog/subject"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
            >
              <Layers className="h-4 w-4 text-teal-ink" />
              <span>ไปฝึกแยกรายวิชา</span>
            </Link>
          </div>
        </div>

        <CatalogCompletedClient
          topicsBySubject={topicsBySubject}
          totalCatalogQuestions={allQuestions.length}
        />
      </main>
    </div>
  );
}
