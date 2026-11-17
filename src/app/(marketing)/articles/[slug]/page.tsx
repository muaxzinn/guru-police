import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { getStore } from '@/lib/server-db';

export function generateStaticParams() {
  return getStore().articles.map((a) => ({ slug: a.slug }));
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore();
  const article = store.articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const paragraphs = article.text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('←'));

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="public" />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/articles" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-brand">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>กลับไปบทความทั้งหมด</span>
        </Link>

        <article className="mt-4 rounded-card border border-line bg-panel p-6 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            <BookOpen className="h-3.5 w-3.5" />
            <span>บทความเตรียมสอบ นายสิบ โปร</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">{article.h1}</h1>
          <p className="mt-2 text-sm text-muted">{article.description}</p>

          <hr className="my-6 border-line" />

          <div className="space-y-4 font-exam text-[16px] leading-relaxed text-ink">
            {paragraphs.map((line, i) => {
              const isHeading = article.headings.includes(line) && i > 0;
              return isHeading ? (
                <h2 key={i} className="pt-3 font-sans text-lg font-extrabold text-brand">
                  {line}
                </h2>
              ) : (
                <p key={i}>{line}</p>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-bg2/60 p-5">
            <div className="text-sm font-bold text-ink">พร้อมทดสอบความรู้ด้วยข้อสอบจริงหรือยัง?</div>
            <p className="mt-1 text-xs text-muted">
              เลือกฝึกทำจากคลังข้อสอบ 7,038 ข้อ พร้อมเฉลยละเอียดทันที
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2 text-xs font-bold text-white"
              >
                <span>เริ่มทำข้อสอบ</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/bank"
                className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-panel px-4 py-2 text-xs font-bold text-ink"
              >
                <span>ค้นหาในคลังข้อสอบ</span>
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

