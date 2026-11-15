import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarCheck, Newspaper } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { getStore } from '@/lib/server-db';

export function generateStaticParams() {
  return getStore().news.map((n) => ({ slug: n.slug }));
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore();
  const item = store.news.find((n) => n.slug === slug);
  if (!item) notFound();

  const lines = item.text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('←'));

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="public" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/news" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>กลับไปข่าวสารทั้งหมด</span>
        </Link>

        <article className="mt-4 rounded-card border border-line bg-panel p-6 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            <Newspaper className="h-3.5 w-3.5" />
            <span>ประกาศรับสมัคร 2569</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">{item.h1}</h1>
          <p className="mt-2 text-sm text-muted">{item.description}</p>

          <hr className="my-6 border-line" />

          <div className="space-y-3 text-sm leading-relaxed text-ink">
            {lines.map((line, i) => {
              const isHeading = item.headings.includes(line) && i > 0;
              return isHeading ? (
                <h2 key={i} className="flex items-center gap-2 pt-3 text-base font-extrabold text-brand">
                  <CalendarCheck className="h-4 w-4" />
                  <span>{line}</span>
                </h2>
              ) : (
                <p key={i}>{line}</p>
              );
            })}
          </div>
        </article>
      </main>
    </div>
  );
}

