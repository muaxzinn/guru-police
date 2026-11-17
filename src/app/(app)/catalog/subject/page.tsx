import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogSubjectClient, type SubjectOverviewItem } from '@/components/CatalogSubjectClient';
import { SUBJECTS } from '@/lib/constants';
import { getAllQuestionsMerged, getStore } from '@/lib/server-db';

export default function CatalogSubjectPage() {
  const all = getAllQuestionsMerged();
  const store = getStore();

  const items: SubjectOverviewItem[] = SUBJECTS.map((s) => {
    const subjectQs = all.filter((q) => q.subject_key === s.key);
    const count = subjectQs.length;
    const topics = store.topics
      .filter((t) => t.subjectKey === s.key)
      .map((t) => ({ title: t.title, count: t.count }));

    return {
      key: s.key,
      count,
      subSetCount: Math.max(1, Math.ceil(count / 20)),
      questionIds: subjectQs.map((q) => q.id),
      topics,
    };
  });

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-5xl px-4 py-7 space-y-5">
        <div className="border-b border-line pb-5">
          <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>กลับไปหน้าเลือกโหมด</span>
          </Link>

          <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            <Layers className="h-6 w-6 text-brand shrink-0" />
            <span>ชุดข้อสอบแยกรายวิชา (7 วิชา)</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            ฝึกเป็นชุดย่อยเรียงลำดับ (ชุดละ 20 หรือ 50 ข้อ) หรือสุ่มฝึกเข้มข้นรายวิชา
          </p>
        </div>

        <CatalogSubjectClient items={items} />
      </main>
    </div>
  );
}
