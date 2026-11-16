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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>กลับไปหน้าเลือกโหมด</span>
        </Link>

        <div className="mt-3 flex items-center gap-2 text-brand">
          <Layers className="h-6 w-6" />
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">ชุดข้อสอบแยกรายวิชา (7 วิชา)</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          เลือกฝึกเป็นชุดย่อยแบบเรียงลำดับไม่ซ้ำข้อ (ชุดละ 20 หรือ 50 ข้อ), สุ่มฝึกเข้มข้น หรือเจาะตามหัวข้อย่อยได้ทันที
        </p>

        <div className="mt-6">
          <CatalogSubjectClient items={items} />
        </div>
      </main>
    </div>
  );
}
