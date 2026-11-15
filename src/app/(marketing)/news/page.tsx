import React from 'react';
import Link from 'next/link';
import { ArrowRight, Newspaper } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { getStore } from '@/lib/server-db';

export default function NewsIndexPage() {
  const store = getStore();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="public" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-2 text-xs font-bold text-accent">
          <Newspaper className="h-4 w-4" />
          <span>ข่าวรับสมัครราชการตำรวจ</span>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold">ข่าวสารและกำหนดการสอบนายสิบตำรวจ</h1>

        <div className="mt-7 space-y-4">
          {store.news.map((n) => (
            <Link
              key={n.slug}
              href={`/news/${n.slug}`}
              className="card-hover block rounded-card border border-line bg-panel p-6 shadow-card"
            >
              <h2 className="text-xl font-extrabold text-ink">{n.h1}</h2>
              <p className="mt-2 text-sm text-muted">{n.description}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                <span>ดูตารางกำหนดการและอัตราแข่งขัน</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

