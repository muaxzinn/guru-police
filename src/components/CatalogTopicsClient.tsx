'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
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
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey | null>(null);
  const [selectedTopicCard, setSelectedTopicCard] = useState<SubTopicCatalogItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<15 | 20 | 30>(20);
  const [showAllTopicsFlat, setShowAllTopicsFlat] = useState(false);

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
    if (!selectedSubject) return [];
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
      if (selectedSubject !== null && item.subjectKey !== selectedSubject) return false;
      if (selectedSubject !== null && selectedCategory !== 'all' && item.category !== selectedCategory) {
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

  const isLevel1 =
    selectedTopicCard === null &&
    selectedSubject === null &&
    !query.trim() &&
    !showAllTopicsFlat;
  const isLevel2 = selectedTopicCard === null && !isLevel1;
  const isLevel3 = selectedTopicCard !== null;

  const excludeParam = excludeCompleted ? '&excludeCompleted=1' : '&excludeCompleted=0';

  const getTopicStats = (item: SubTopicCatalogItem) => {
    let doneCorrect = 0;
    let doneWrong = 0;
    for (const qid of item.questionIds) {
      if (correctSet.has(qid)) doneCorrect++;
      else if (mistakeSet.has(qid)) doneWrong++;
    }
    const doneTotal = doneCorrect + doneWrong;
    const remainingCount = Math.max(0, item.count - doneTotal);
    const activeCount = excludeCompleted ? remainingCount : item.count;
    const totalSets = activeCount > 0 ? Math.max(1, Math.ceil(activeCount / chunkSize)) : 0;
    return { doneCorrect, doneWrong, doneTotal, remainingCount, activeCount, totalSets };
  };

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

      {/* Step Indicator / Breadcrumb Bar */}
      <nav
        aria-label="ขั้นตอนการเลือกชุดข้อสอบ"
        className="rounded-card border border-line bg-panel p-3.5 sm:p-4 shadow-card space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => {
                setSelectedSubject(null);
                setSelectedTopicCard(null);
                setSelectedCategory('all');
                setShowAllTopicsFlat(false);
                setQuery('');
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition ${
                isLevel1
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-bg2/60 text-ink hover:border-brand/50 hover:text-brand'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>1. เลือกการ์ดวิชาหลัก (7 วิชา)</span>
            </button>

            <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />

            <button
              type="button"
              disabled={isLevel1}
              onClick={() => {
                setSelectedTopicCard(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 transition disabled:opacity-50 ${
                isLevel2
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-bg2/60 text-ink hover:border-brand/50 hover:text-brand'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                2. เลือกการ์ดหัวข้อย่อย
                {selectedSubject ? ` · ${SUBJECT_MAP[selectedSubject].shortName}` : ''}
              </span>
            </button>

            <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                isLevel3
                  ? 'border-brand bg-brand text-white shadow-sm'
                  : 'border-line bg-bg2/40 text-muted'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="max-w-[200px] truncate">
                {selectedTopicCard
                  ? `3. ${selectedTopicCard.displayTitle.replace(/_/g, ' ')}`
                  : '3. เลือกบล็อกชุดข้อสอบ'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-bg2/60 p-1 text-xs font-bold">
            <span className="px-2 text-muted hidden sm:inline">แบ่งชุดย่อย:</span>
            {([15, 20, 30] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setChunkSize(sz)}
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  chunkSize === sz ? 'bg-panel text-brand shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                ชุดละ {sz} ข้อ
              </button>
            ))}
          </div>
        </div>

        {/* Search Input & Quick Flat View Toggle */}
        {!isLevel3 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-line/70">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedTopicCard(null);
                }}
                placeholder="ค้นหาหัวข้อย่อยข้ามวิชาได้ทันที เช่น Word, Excel, เครือข่าย, แพ่ง, อาญา, ร้อยละ..."
                className="w-full rounded-xl border border-line bg-bg2/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              {isLevel1 && (
                <button
                  type="button"
                  onClick={() => setShowAllTopicsFlat(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2/70 px-3 py-2 text-xs font-bold text-muted transition hover:border-brand/50 hover:text-ink"
                >
                  <span>ดูรวมทั้ง {allTopics.length} บท</span>
                </button>
              )}
              <div className="text-xs font-mono text-muted">
                {isLevel1 ? (
                  <>
                    7 วิชาหลัก · <strong className="text-brand">{allTopics.length} บท</strong>
                  </>
                ) : (
                  <>
                    พบ <strong className="text-ink">{filteredTopics.length}</strong> บท ·{' '}
                    <strong className="text-brand">{totalQuestionsFiltered.toLocaleString('en-US')}</strong> ข้อ
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* LEVEL 1: 7 Main Subject Block Cards */}
      {isLevel1 && (
        <section aria-label="การ์ดวิชาหลักทั้ง 7 วิชา" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((sub) => {
            const subTopics = topicsBySubject[sub.key] || [];
            const doneInSub = subTopics.reduce(
              (acc, t) => acc + t.questionIds.filter((id) => allCompletedSet.has(id)).length,
              0
            );
            const totalInSub = subjectTotals[sub.key] || 0;
            const remainingInSub = Math.max(0, totalInSub - doneInSub);
            const progressPct = totalInSub > 0 ? Math.round((doneInSub / totalInSub) * 100) : 0;
            const previewTopics = subTopics.slice(0, 4);
            const extraCount = Math.max(0, subTopics.length - previewTopics.length);

            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => {
                  setSelectedSubject(sub.key);
                  setSelectedTopicCard(null);
                  setSelectedCategory('all');
                }}
                className="group flex flex-col justify-between gap-4 rounded-card border border-line bg-panel p-5 sm:p-6 text-left shadow-card card-hover transition hover:border-brand/60"
              >
                <div className="space-y-3.5 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <SubjectIcon subjectKey={sub.key} size="md" />
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className="rounded-full border border-line bg-bg2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
                        {sub.grp === 'general' ? 'ภาคทั่วไป' : 'ภาคเฉพาะตำแหน่ง'}
                      </span>
                      <span className="rounded-full bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-brand">
                        {subTopics.length} หัวข้อย่อย
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold text-ink leading-snug group-hover:text-brand transition-colors">
                      {sub.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-mono font-bold text-ink">
                        {totalInSub.toLocaleString('en-US')} ข้อ
                      </span>
                      {doneInSub > 0 && (
                        <span>
                          · ทำแล้ว <strong className="text-teal-ink">{doneInSub}</strong> · เหลือข้อใหม่{' '}
                          <strong className="text-brand">{remainingInSub}</strong> ข้อ
                        </span>
                      )}
                    </div>
                  </div>

                  {doneInSub > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                        <span>ความคืบหน้าวิชา</span>
                        <span className="font-bold text-brand">{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg2">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${Math.min(100, progressPct)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview sub-topic block chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {previewTopics.map((tp) => (
                      <span
                        key={tp.title}
                        className="max-w-full truncate rounded-lg border border-line bg-bg2/60 px-2 py-1 text-[11px] font-semibold text-muted"
                      >
                        {tp.displayTitle.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="rounded-lg border border-dashed border-brand/40 bg-brand/5 px-2 py-1 font-mono text-[11px] font-bold text-brand">
                        +{extraCount} หัวข้อ
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 border-t border-line pt-3 text-xs font-extrabold text-brand">
                  <span>คลิกเลือกหัวข้อย่อยในวิชานี้ ({subTopics.length} บท)</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </section>
      )}

      {/* LEVEL 2: Sub-Topic Block Cards (inside selected subject or search) */}
      {isLevel2 && (
        <section className="space-y-4">
          <div className="rounded-card border border-line bg-panel p-4 sm:p-5 shadow-card space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject(null);
                  setSelectedTopicCard(null);
                  setSelectedCategory('all');
                  setQuery('');
                  setShowAllTopicsFlat(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand/35 bg-brand/10 px-3.5 py-2 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>กลับไปเลือกการ์ดวิชาหลัก (7 วิชา)</span>
              </button>

              {selectedSubject && (
                <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
                  <SubjectIcon subjectKey={selectedSubject} size="sm" />
                  <span>{SUBJECT_MAP[selectedSubject].name}</span>
                </div>
              )}
            </div>

            {/* Quick Subject Switcher */}
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((sub) => {
                const active = selectedSubject === sub.key;
                const count = (topicsBySubject[sub.key] || []).length;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.key);
                      setSelectedCategory('all');
                      setShowAllTopicsFlat(false);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                      active
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-bg2 text-muted hover:text-ink'
                    }`}
                  >
                    {sub.shortName} ({count})
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills inside Selected Subject */}
            {categoriesForSubject.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/70">
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
          </div>

          {filteredTopics.length === 0 ? (
            <div className="rounded-card border border-line bg-panel p-10 text-center space-y-2 shadow-card">
              <p className="text-base font-extrabold text-ink">ไม่พบหัวข้อย่อยที่ตรงกับคำค้นหา</p>
              <p className="text-xs text-muted">ลองเปลี่ยนคำค้นหาหรือกดกลับไปเลือกการ์ดวิชาหลักอีกครั้ง</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTopics.map((item) => {
                const subMeta = SUBJECT_MAP[item.subjectKey];
                const subTotal = subjectTotals[item.subjectKey] || 1;
                const sharePct = Math.max(1, Math.round((item.count / subTotal) * 100));
                const stats = getTopicStats(item);
                const topicParam = encodeURIComponent(item.rawTitles.join('||'));
                const cardId = `${item.subjectKey}::${item.title}`;

                return (
                  <article
                    key={cardId}
                    className="flex flex-col justify-between gap-4 overflow-hidden rounded-card border border-line bg-panel p-5 shadow-card card-hover"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <SubjectIcon subjectKey={item.subjectKey} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-brand">
                              {subMeta.shortName}
                            </span>
                            <span className="max-w-full truncate rounded-full border border-line bg-bg2 px-2 py-0.5 text-[11px] font-bold text-muted">
                              {item.category}
                            </span>
                          </div>
                          <h3 className="mt-1 text-base font-extrabold text-ink leading-snug break-words">
                            {item.displayTitle.replace(/_/g, ' ')}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">{item.description}</p>

                      {/* 2-Box Block Metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-line bg-bg2/60 p-2.5">
                          <div className="text-[11px] font-bold text-muted">จำนวนข้อสอบ</div>
                          <div className="mt-0.5 font-mono text-sm font-extrabold text-brand">
                            {excludeCompleted ? `${stats.remainingCount} ข้อใหม่` : `${item.count} ข้อ`}
                          </div>
                          <div className="font-mono text-[10px] text-muted">
                            ทั้งหมด {item.count} ข้อ · {sharePct}%
                          </div>
                        </div>
                        <div className="rounded-xl border border-line bg-bg2/60 p-2.5">
                          <div className="text-[11px] font-bold text-muted">จำนวนชุดย่อย</div>
                          <div className="mt-0.5 font-mono text-sm font-extrabold text-ink">
                            {stats.totalSets} ชุดบล็อก
                          </div>
                          <div className="font-mono text-[10px] text-muted">ชุดละ {chunkSize} ข้อ</div>
                        </div>
                      </div>

                      {stats.doneTotal > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-line bg-bg2/40 px-3 py-1.5 text-[11px]">
                          <span className="font-bold text-ink">
                            ทำแล้ว <span className="font-mono">{stats.doneTotal}/{item.count}</span>
                          </span>
                          <span className="text-muted">
                            ถูก <strong className="text-teal-ink">{stats.doneCorrect}</strong> · ผิด{' '}
                            <strong className="text-accent">{stats.doneWrong}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Block Card Actions */}
                    <div className="space-y-2 border-t border-line pt-3">
                      {stats.activeCount > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSubject(item.subjectKey);
                              setSelectedTopicCard(item);
                            }}
                            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-brand-dark"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>เปิดบล็อกชุดข้อสอบ ({stats.totalSets} ชุด)</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <Link
                            href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1${excludeParam}`}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                          >
                            <Play className="h-3.5 w-3.5 text-brand" />
                            <span>เริ่มชุดที่ 1</span>
                          </Link>
                          <Link
                            href={`/bank?subject=${item.subjectKey}&topic=${topicParam}`}
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-2 text-xs font-bold text-muted transition hover:border-brand/50 hover:text-ink"
                          >
                            <Database className="h-3.5 w-3.5" />
                            <span>ดูในคลัง</span>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-2xl border border-teal/40 bg-teal/10 p-3 text-center">
                          <p className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-ink">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>ทำครบทุกข้อในบทนี้แล้ว!</span>
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Link
                              href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1&excludeCompleted=0`}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs font-bold text-ink hover:border-brand/50"
                            >
                              <Play className="h-3 w-3 text-brand" />
                              <span>ฝึกซ้ำชุดที่ 1</span>
                            </Link>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `รีเซ็ตประวัติบท "${item.displayTitle}" เพื่อทำใหม่ทั้งหมดหรือไม่?`
                                  )
                                ) {
                                  void resetForTopic(item.subjectKey, item.rawTitles.join('||'), 'all');
                                }
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-line bg-panel px-2.5 py-1.5 text-xs font-bold text-muted hover:text-accent"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>รีเซ็ตบทนี้</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* LEVEL 3: Set Block Cards inside Selected Sub-Topic */}
      {isLevel3 && selectedTopicCard && (() => {
        const item = selectedTopicCard;
        const subMeta = SUBJECT_MAP[item.subjectKey];
        const stats = getTopicStats(item);
        const topicParam = encodeURIComponent(item.rawTitles.join('||'));

        return (
          <section aria-label="บล็อกชุดข้อสอบย่อย" className="space-y-5">
            <div className="rounded-card border border-line bg-panel p-5 sm:p-6 shadow-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTopicCard(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand/35 bg-brand/10 px-3.5 py-2 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>กลับไปการ์ดหัวข้อย่อยวิชา{subMeta.shortName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopicCard(null);
                      setSelectedSubject(null);
                      setSelectedCategory('all');
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-line bg-bg2 px-3 py-2 text-xs font-bold text-muted transition hover:border-brand/50 hover:text-ink"
                  >
                    <span>กลับไปการ์ดวิชาหลัก (7 วิชา)</span>
                  </button>
                </div>

                {stats.doneTotal > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (
                        window.confirm(
                          `รีเซ็ตประวัติบท "${item.displayTitle}" เพื่อทำใหม่ทั้งหมดหรือไม่?`
                        )
                      ) {
                        void resetForTopic(item.subjectKey, item.rawTitles.join('||'), 'all');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>รีเซ็ตบทนี้ ({stats.doneTotal} ข้อ)</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <SubjectIcon subjectKey={item.subjectKey} size="md" />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-brand">{subMeta.name}</span>
                      <span className="rounded-full border border-line bg-bg2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
                        {item.category}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-ink leading-snug break-words">
                      {item.displayTitle.replace(/_/g, ' ')}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted">{item.description}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-bg2/60 px-4 py-3 text-left sm:text-right shrink-0">
                  <div className="font-mono text-lg font-extrabold text-brand">
                    {excludeCompleted ? `${stats.remainingCount} ข้อใหม่` : `${item.count} ข้อ`}
                  </div>
                  <div className="font-mono text-xs text-muted">
                    ทั้งหมด {item.count} ข้อ · {stats.totalSets} ชุดบล็อก
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line/70">
                {stats.activeCount > 0 && (
                  <>
                    <Link
                      href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&count=20&mode=practice&fresh=1${excludeParam}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3.5 py-2 text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                    >
                      <Shuffle className="h-3.5 w-3.5 text-brand" />
                      <span>สุ่มฝึก {Math.min(20, stats.activeCount)} ข้อ</span>
                    </Link>
                    <Link
                      href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${stats.activeCount}&mode=practice&fresh=1${excludeParam}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3.5 py-2 text-xs font-bold text-ink transition hover:border-teal/60 hover:text-teal-ink"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-teal-ink" />
                      <span>ทำครบทั้งบท ({stats.activeCount} ข้อ)</span>
                    </Link>
                  </>
                )}
                <Link
                  href={`/bank?subject=${item.subjectKey}&topic=${topicParam}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3.5 py-2 text-xs font-bold text-muted transition hover:border-brand/50 hover:text-ink"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>เปิดดูโจทย์ทั้งหมดในคลัง</span>
                </Link>
              </div>
            </div>

            {stats.totalSets === 0 ? (
              <div className="rounded-card border border-teal/40 bg-teal/10 p-8 text-center space-y-3">
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-teal-ink">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>ทำครบทุกข้อในบทนี้แล้ว!</span>
                </div>
                <p className="text-xs text-muted">
                  คุณสามารถทบทวนข้อที่เคยทำได้ในหน้า &ldquo;ชุดที่เคยทำแล้ว&rdquo; หรือฝึกซ้ำทั้งหมด
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/catalog/completed"
                    className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-dark"
                  >
                    ไปหน้าชุดข้อสอบที่เคยทำแล้ว
                  </Link>
                  <Link
                    href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=1&count=${chunkSize}&mode=practice&fresh=1&excludeCompleted=0`}
                    className="rounded-xl border border-line bg-panel px-4 py-2 text-xs font-bold text-ink hover:border-brand/50"
                  >
                    ฝึกซ้ำชุดที่ 1
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: stats.totalSets }, (_, idx) => {
                  const setNum = idx + 1;
                  const startQ = idx * chunkSize + 1;
                  const endQ = Math.min(stats.activeCount, setNum * chunkSize);
                  const qCount = Math.max(0, endQ - startQ + 1);
                  return (
                    <div
                      key={setNum}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-panel p-4 shadow-card transition hover:border-brand/50"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-xl bg-brand/10 px-2.5 py-1 font-mono text-xs font-extrabold text-brand">
                            ชุดที่ {setNum}
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{Math.max(10, qCount)} นาที</span>
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-ink">
                          ช่วงข้อที่ <span className="font-mono">{startQ}–{endQ}</span> ({qCount} ข้อ)
                        </div>
                        <div className="text-[11px] text-muted truncate">
                          {item.displayTitle.replace(/_/g, ' ')}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=${setNum}&count=${chunkSize}&mode=practice&fresh=1${excludeParam}`}
                          className="rounded-xl border border-line bg-bg2 py-2 text-center text-xs font-bold text-ink transition hover:border-brand/50 hover:text-brand"
                        >
                          โหมดฝึกซ้อม
                        </Link>
                        <Link
                          href={`/exam/topic?subject=${item.subjectKey}&topic=${topicParam}&set=${setNum}&count=${chunkSize}&mode=real&fresh=1${excludeParam}`}
                          className="rounded-xl bg-brand py-2 text-center text-xs font-extrabold text-white transition hover:bg-brand-dark"
                        >
                          จับเวลาจริง
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })()}
    </div>
  );
}
