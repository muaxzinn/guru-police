import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { getStore } from '@/lib/server-db';

export default function ArticlesIndexPage() {
  const store = getStore();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="public" />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-2 text-xs font-bold text-brand">
          <BookOpen className="h-4 w-4" />
          <span>คู่มือเตรียมสอบและเทคนิค ({store.articles.length} บทความ)</span>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold">บทความแนะแนวและเทคนิคสอบนายสิบตำรวจ</h1>
        <p className="mt-2 text-sm text-muted">
          สรุปแนวทางเตรียมสอบทั้งสายอำนวยการ พิสูจน์หลักฐาน และปราบปราม ครบทุกขั้นตอนตั้งแต่การวางแผนจนถึงวันสอบจริง
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {store.articles.map((art) => (
            <Link
              key={art.slug}
              href={`/articles/${art.slug}`}
              className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-5 shadow-card"
            >
              <div>
                <h2 className="text-base font-extrabold leading-snug text-ink">{art.h1}</h2>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">{art.description}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand">
                <span>อ่านบทความ</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

