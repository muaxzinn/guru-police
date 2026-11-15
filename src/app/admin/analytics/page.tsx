import React from 'react';
import Link from 'next/link';
import { BarChart3, Database, Image as ImageIcon, Layers } from 'lucide-react';
import { SUBJECTS, SUBJECT_MAP } from '@/lib/constants';
import { getAllQuestionsMerged, getStore } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminSubNav } from '@/components/AdminSubNav';
import { SubjectIcon } from '@/components/SubjectIcon';

export default function AdminAnalyticsPage() {
  const store = getStore();
  const all = getAllQuestionsMerged();
  const total = all.length;

  const subjectStats = SUBJECTS.map((s) => {
    const subQs = all.filter((q) => q.subject_key === s.key);
    const withImg = subQs.filter(
      (q) => Boolean(q.img) || Boolean(q.explanation_img) || Boolean(q.opt_imgs?.some(Boolean))
    ).length;
    const topicsCount = store.topics.filter((t) => t.subjectKey === s.key).length;
    return {
      ...s,
      count: subQs.length,
      pct: total > 0 ? Math.round((subQs.length / total) * 1000) / 10 : 0,
      withImg,
      topicsCount,
    };
  });

  const batchCounts = new Map<string, number>();
  for (const q of all) {
    const key = q.batch || 'unknown';
    batchCounts.set(key, (batchCounts.get(key) || 0) + 1);
  }
  const batches = Array.from(batchCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />
      <AdminSubNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-brand" />
            <span>สถิติคลังข้อสอบเชิงลึก ({total.toLocaleString()} ข้อ)</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            กระจายตาม 6 วิชาสอบมาตรฐาน, {store.topics.length} หัวข้อย่อย, และ {batches.length} แหล่งที่มา (Batch)
          </p>
        </div>

        {/* 6 Subjects Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectStats.map((s) => (
            <div key={s.key} className="bg-panel border border-line rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <SubjectIcon subjectKey={s.key} size="md" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold truncate">{s.name}</h2>
                    <p className="text-xs text-muted">{s.topicsCount} หัวข้อย่อย</p>
                  </div>
                </div>
                <span className="font-mono font-extrabold text-lg text-brand">{s.count.toLocaleString()}</span>
              </div>

              <div className="h-2.5 rounded-full bg-bg2 overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, s.pct * 2.5)}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs text-muted">
                <span>สัดส่วนคลัง: {s.pct}%</span>
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> มีภาพ {s.withImg.toLocaleString()} ข้อ
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Top Subtopics & Batch Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-panel border border-line rounded-card p-6 shadow-card space-y-4">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-ink" />
              <span>หัวข้อย่อยที่มีจำนวนข้อสูงสุด (Top 20 / {store.topics.length} หัวข้อ)</span>
            </h2>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {store.topics
                .slice()
                .sort((a, b) => b.count - a.count)
                .slice(0, 20)
                .map((tp) => (
                  <div
                    key={tp.subjectKey + '-' + tp.title}
                    className="p-3 rounded-2xl border border-line bg-bg2/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{tp.title}</p>
                      <p className="text-xs text-muted">{SUBJECT_MAP[tp.subjectKey]?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-extrabold text-brand">{tp.count} ข้อ</span>
                      <Link
                        href={`/exam/topic?subject=${encodeURIComponent(tp.subjectKey)}&topic=${encodeURIComponent(tp.title)}&count=20&mode=practice&fresh=1`}
                        className="px-2.5 py-1 rounded-lg bg-brand/10 text-brand text-xs font-bold hover:bg-brand hover:text-white transition"
                      >
                        ฝึก
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-panel border border-line rounded-card p-6 shadow-card space-y-4">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Database className="w-5 h-5 text-brand" />
              <span>แหล่งข้อมูลตาม Batch ({batches.length})</span>
            </h2>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {batches.map(([batch, count]) => {
                const pct = Math.round((count / Math.max(1, total)) * 100);
                return (
                  <div key={batch} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="font-mono">{batch}</span>
                      <span className="font-mono text-muted">
                        {count.toLocaleString()} ข้อ ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg2 overflow-hidden">
                      <div className="h-full bg-teal rounded-full" style={{ width: `${Math.max(3, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
