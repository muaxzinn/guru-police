import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CatalogFormClient } from '@/components/CatalogFormClient';
import { getStore, readRuntimeState } from '@/lib/server-db';

export default function CatalogFormPage() {
  const store = getStore();
  const runtime = readRuntimeState();
  const sets = [
    ...store.examSets.filter((s) => s.kind === 'form'),
    ...(runtime.customSets || []).filter((s) => s.kind === 'form'),
  ];

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>กลับไปหน้าเลือกโหมด</span>
        </Link>

        <div className="mt-3 flex items-center gap-2 text-brand">
          <FileSpreadsheet className="h-5 w-5" />
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">ข้อสอบจำลองเป็นชุด ({sets.length} ชุด)</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          เลือกทำเต็มชุด 150 ข้อ (180 นาที) หรือคลิกเลือกทำเฉพาะรายวิชาภายในแต่ละชุดได้ทันที
        </p>

        <div className="mt-6">
          <CatalogFormClient sets={sets} attempts={runtime.attempts} />
        </div>
      </main>
    </div>
  );
}
