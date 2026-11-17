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
      <main className="mx-auto max-w-4xl px-4 py-7 space-y-5">
        <div className="border-b border-line pb-5">
          <Link href="/catalog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>กลับไปหน้าเลือกโหมด</span>
          </Link>

          <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            <FileSpreadsheet className="h-6 w-6 text-brand shrink-0" />
            <span>ข้อสอบจำลองเป็นชุด ({sets.length} ชุด)</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            ทำเต็มชุด 150 ข้อ (180 นาที) หรือเลือกทำเฉพาะรายวิชาภายในแต่ละชุด
          </p>
        </div>

        <CatalogFormClient sets={sets} attempts={runtime.attempts} />
      </main>
    </div>
  );
}
