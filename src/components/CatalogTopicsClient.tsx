'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Database,
  Layers,
  Play,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from '@/lib/constants';
import { SubjectIcon } from '@/components/SubjectIcon';

export interface SubTopicCatalogItem {
  subjectKey: SubjectKey;
  title: string;
  displayTitle: string;
  rawTitles: string[];
  count: number;
  category: string;
  description: string;
}

interface CatalogTopicsClientProps {
  topicsBySubject: Record<SubjectKey, SubTopicCatalogItem[]>;
  subjectTotals: Record<SubjectKey, number>;
}

export function CatalogTopicsClient({
  topicsBySubject,
  subjectTotals,
}: CatalogTopicsClientProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<15 | 20 | 30>(20);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const allTopics = useMemo(
    () => SUBJECTS.flatMap((s) => topicsBySubject[s.key] || []),
    [topicsBySubject]
  );

  const categoriesForSubject = useMemo(() => {
    if (selectedSubject === 'all') return [];
    const list = topicsBySubject[selectedSubject] || [];
    const seen = new Map<string, number>();
    for (const item of list) {
      seen.set(item.category, (seen.get(item.category) || 0) + 1);
    }
    return Array.from(seen.entries()).map(([name, count]) => ({ name, count }));
  }, [selectedSubject, topicsBySubject]);

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTopics.filter((item) => {
      if (selectedSubject !== 'all' && item.subjectKey !== selectedSubject) return false;
      if (selectedSubject !== 'all' && selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.displayTitle.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.rawTitles.some((rt) => rt.toLowerCase().includes(q)) ||
        SUBJECT_MAP[item.subjectKey].name.toLowerCase().includes(q)
      );
    });
  }, [allTopics, selectedSubject, selectedCategory, query]);

  const totalQuestionsFiltered = useMemo(
    () => filteredTopics.reduce((sum, t) => sum + t.count, 0),
    [filteredTopics]
  );

  return (
    <div className="space-y-6">
      {/* Subject Selector Grid */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setSelectedCategory('all');
            }}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold transition ${
              selectedSubject === 'all'
                ? 'border-brand bg-brand text-white shadow-sm'
                : 'border-line bg-panel text-ink hover:border-brand/50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>รวมทุกวิชา (7 วิชา · {allTopics.length} หัวข้อย่อย)</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-panel p-1 text-xs font-bold">
            <span className="px-2 text-muted hidden sm:inline">แบ่งชุดย่อย:</span>
            {([15, 20, 30] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setChunkSize(sz)}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  chunkSize === sz ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                ชุดละ {sz} ข้อ
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {SUBJECTS.map((sub) => {
            const subTopics = topicsBySubject[sub.key] || [];
            const selected = selectedSubject === sub.key;
            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => {
                  setSelectedSubject(sub.key);
                  setSelectedCategory('all');
                }}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                  selected
                    ? 'border-brand bg-brand/10 ring-2 ring-brand/25'
                    : 'border-line bg-panel hover:border-brand/50'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-1.5">
                  <SubjectIcon subjectKey={sub.key} size="sm" />
                  <span className="font-mono text-[11px] font-bold text-muted">
                    {subTopics.length} บท
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div
                    className={`text-xs font-extrabold leading-snug ${
                      selected ? 'text-brand' : 'text-ink'
                    }`}
                  >
                    {sub.shortName}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {(subjectTotals[sub.key] || 0).toLocaleString('en-US')} ข้อ
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <section className="rounded-card border border-line bg-panel p-4 sm:p-5 shadow-card space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาเนื้อหาย่อย เช่น Word, Excel, PowerPoint, เครือข่าย, แพ่ง, อาญา, ร้อยละ, เซต..."
              className="w-full rounded-xl border border-line bg-bg2/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="text-xs font-mono text-muted shrink-0">
            แสดง <strong className="text-ink">{filteredTopics.length}</strong> หัวข้อย่อย ·{' '}
            <strong className="text-brand">{totalQuestionsFiltered.toLocaleString('en-US')}</strong> ข้อ
          </div>
        </div>

        {categoriesForSubject.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-muted mr-1">หมวดเนื้อหา:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                selectedCategory === 'all'
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-bg2 text-muted hover:text-ink'
              }`}
            >
              ทั้งหมด ({(topicsBySubject[selectedSubject as SubjectKey] || []).length})
            </button>
            {categoriesForSubject.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  selectedCategory === cat.name
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-bg2 text-muted hover:text-ink'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Empty State */}
      {filteredTopics.length === 0 ? (
        <div className="rounded-card border border-line bg-panel p-10 text-center space-y-2 shadow-card">
          <p className="text-base font-extrabold text-ink">ไม่พบหัวข้อย่อยที่ตรงกับคำค้นหา</p>
          <p className="text-xs text-muted">ลองเปลี่ยนคำค้นหาหรือกดดูรวมทุกวิชาใหม่อีกครั้ง</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTopics.map((item) => {
            const subMeta = SUBJECT_MAP[item.subjectKey];
            const subTotal = subjectTotals[item.subjectKey] || 1;
            const sharePct = Math.max(1, Math.round((item.count / subTotal) * 100));
            const totalSets = Math.max(1, Math.ceil(item.count / chunkSize));
            const topicParam = encodeURIComponent(item.rawTitles.join('||'));
            const cardId = `${item.subjectKey}::${item.title}`;
            const isExpanded = Boolean(expandedCards[cardId]);
            const visibleSetCount = isExpanded ? totalSets : Math.min(totalSets, 6);

            return (
              <article
                key={cardId}
                className="flex flex-col justify-between gap-4 rounded-card border border-line bg-panel p-5 shadow-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <SubjectIcon subjectKey={item.subjectKey} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-brand">
                            {subMeta.shortName}
                          </span>
                          <span className="rounded-full border border-line bg-bg2 px-2 py-0.5 text-[11px] font-bold text-muted">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="mt-1 text-base font-extrabold text-ink leading-snug">
                          {item.displayTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm font-extrabold text-brand">
                        {item.count} ข้อ
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {sharePct}% · {totalSets} ชุดย่อย
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>

                  {/* Ordered Sub-Set Pills */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-teal-ink" />
                        <span>ชุดข้อสอบเรียงตามลำดับ (ชุดละ {chunkSize} ข้อ)</span>
                      </span>
                      {totalSets > 6 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCards((prev) => ({
                              ...prev,
                              [cardId]: !prev[cardId],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-brand hover:underline"
                        >
                          <span>{isExpanded ? 'ย่อลง' : `ดูครบทั้ง ${totalSets} ชุด`}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {Array.from({ length: visibleSetCount }, (_, idx) => {
                        const setNum = idx + 1;
                        const startQ = idx * chunkSize + 1;
                        const endQ = Math.min(item.count, setNum * chunkSize);
                        return (
                          <Link
                            key={setNum}
                            href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=${setNum}&count=${chunkSize}&mode=practice&fresh=1`}
                            className="flex items-center justify-between gap-1 rounded-xl border border-line bg-bg2/60 px-2.5 py-1.5 text-[11px] font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                          >
                            <span>ชุดที่ {setNum}</span>
                            <span className="font-mono text-[10px] text-muted">
                              {startQ}–{endQ}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-line pt-3">
                  <Link
                    href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand px-2.5 py-2 text-xs font-extrabold text-white transition hover:bg-brand-dark"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>เริ่มชุดที่ 1</span>
                  </Link>
                  <Link
                    href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&count=20&mode=practice&fresh=1`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                  >
                    <Shuffle className="h-3.5 w-3.5 text-brand" />
                    <span>สุ่ม 20 ข้อ</span>
                  </Link>
                  <Link
                    href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${item.count}&mode=practice&fresh=1`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-teal/60 hover:text-teal-ink"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-ink" />
                    <span>ครบ {item.count} ข้อ</span>
                  </Link>
                  <Link
                    href={`/bank?subject=${item.subjectKey}&topic=${encodeURIComponent(item.rawTitles[0])}`}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-muted transition hover:border-brand/50 hover:text-ink"
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>ดูในคลัง</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
