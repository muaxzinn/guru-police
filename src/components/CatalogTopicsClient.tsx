'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Layers,
  Play,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from '@/lib/constants';
import type { SubTopicCatalogItem } from '@/lib/topic-catalog';
import { useProfileHistory } from '@/lib/use-profile-history';
import { SubjectIcon } from '@/components/SubjectIcon';
import { QuestionPoolSettingsBar } from '@/components/QuestionPoolSettingsBar';

export type { SubTopicCatalogItem };

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

  const {
    correctSet,
    mistakeSet,
    allCompletedSet,
    excludeCompleted,
    saving,
    toggleExcludeCompleted,
    resetCompleted,
    resetForTopic,
  } = useProfileHistory();

  const totalCatalogQuestions = useMemo(
    () => SUBJECTS.reduce((sum, s) => sum + (subjectTotals[s.key] || 0), 0),
    [subjectTotals]
  );

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
      <QuestionPoolSettingsBar
        totalQuestions={totalCatalogQuestions}
        correctCount={correctSet.size}
        wrongCount={mistakeSet.size}
        excludeCompleted={excludeCompleted}
        onToggleExclude={toggleExcludeCompleted}
        saving={saving}
        onOpenReset={() => {
          if (
            window.confirm(
              `ต้องการรีเซ็ตประวัติข้อสอบที่เคยทำทั้งหมด (${allCompletedSet.size} ข้อ) เพื่อให้นำกลับมาฝึกใหม่ทุกวิชาใช่หรือไม่?`
            )
          ) {
            void resetCompleted({ scope: 'all', pool: 'all' });
          }
        }}
      />

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
            const doneInSub = subTopics.reduce(
              (acc, t) => acc + t.questionIds.filter((id) => allCompletedSet.has(id)).length,
              0
            );
            const totalInSub = subjectTotals[sub.key] || 0;
            const remainingInSub = Math.max(0, totalInSub - doneInSub);
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
                    {excludeCompleted && doneInSub > 0
                      ? `ใหม่ ${remainingInSub}/${totalInSub}`
                      : `${totalInSub.toLocaleString('en-US')} ข้อ`}
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
            let doneCorrect = 0;
            let doneWrong = 0;
            for (const qid of item.questionIds) {
              if (correctSet.has(qid)) doneCorrect++;
              else if (mistakeSet.has(qid)) doneWrong++;
            }
            const doneTotal = doneCorrect + doneWrong;
            const remainingCount = Math.max(0, item.count - doneTotal);
            const activeCount = excludeCompleted ? remainingCount : item.count;
            const excludeParam = excludeCompleted ? '&excludeCompleted=1' : '&excludeCompleted=0';
            const totalSets = activeCount > 0 ? Math.max(1, Math.ceil(activeCount / chunkSize)) : 0;
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
                        {excludeCompleted ? `${remainingCount} ข้อใหม่` : `${item.count} ข้อ`}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {sharePct}% · {totalSets} ชุดย่อย
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>

                  {doneTotal > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg2/60 px-3 py-1.5 text-[11px]">
                      <span className="font-bold text-ink">
                        ทำแล้ว <span className="font-mono">{doneTotal}/{item.count}</span> ข้อ
                        <span className="text-muted">
                          {' '}
                          (ถูก <span className="text-teal-ink font-bold">{doneCorrect}</span> · ผิด{' '}
                          <span className="text-accent font-bold">{doneWrong}</span>)
                        </span>
                      </span>
                      <span className="font-mono font-bold text-brand">
                        เหลือข้อใหม่ {remainingCount} ข้อ
                      </span>
                    </div>
                  )}

                  {activeCount === 0 ? (
                    <div className="rounded-2xl border border-teal/40 bg-teal/10 p-4 text-center space-y-2.5">
                      <p className="text-xs font-extrabold text-teal-ink inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>ทำครบทุกข้อในบทนี้แล้ว!</span>
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Link
                          href="/catalog/completed"
                          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-extrabold text-white hover:bg-brand-dark"
                        >
                          ไปฝึกทบทวนข้อที่ทำแล้ว
                        </Link>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => {
                            if (window.confirm(`รีเซ็ตประวัติบท "${item.displayTitle}" เพื่อทำใหม่ทั้งหมดหรือไม่?`)) {
                              void resetForTopic(item.subjectKey, item.rawTitles.join('||'), 'all');
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-bold text-muted hover:text-accent"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>รีเซ็ตบทนี้</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Ordered Sub-Set Pills */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-teal-ink" />
                          <span>
                            {excludeCompleted && doneTotal > 0
                              ? `ชุดข้อสอบเฉพาะข้อใหม่ (ชุดละ ${chunkSize} ข้อ)`
                              : `ชุดข้อสอบเรียงตามลำดับ (ชุดละ ${chunkSize} ข้อ)`}
                          </span>
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
                          const endQ = Math.min(activeCount, setNum * chunkSize);
                          return (
                            <Link
                              key={setNum}
                              href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=${setNum}&count=${chunkSize}&mode=practice&fresh=1${excludeParam}`}
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
                  )}
                </div>

                {/* Action Footer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-line pt-3">
                  {activeCount > 0 ? (
                    <>
                      <Link
                        href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1${excludeParam}`}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-brand px-2.5 py-2 text-xs font-extrabold text-white transition hover:bg-brand-dark"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>เริ่มชุดที่ 1</span>
                      </Link>
                      <Link
                        href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&count=20&mode=practice&fresh=1${excludeParam}`}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                      >
                        <Shuffle className="h-3.5 w-3.5 text-brand" />
                        <span>สุ่ม {Math.min(20, activeCount)} ข้อ</span>
                      </Link>
                      <Link
                        href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${activeCount}&mode=practice&fresh=1${excludeParam}`}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-teal/60 hover:text-teal-ink"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal-ink" />
                        <span>ครบ {activeCount} ข้อ</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1&excludeCompleted=0`}
                      className="sm:col-span-3 inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>ฝึกซ้ำครบทั้ง {item.count} ข้อในบทนี้</span>
                    </Link>
                  )}
                  <Link
                    href={`/bank?subject=${item.subjectKey}&topic=${topicParam}`}
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
