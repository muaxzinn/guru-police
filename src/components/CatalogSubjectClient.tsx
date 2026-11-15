'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Layers, Shuffle, Sparkles } from 'lucide-react';
import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from '@/lib/constants';
import { SubjectIcon } from '@/components/SubjectIcon';

export interface SubjectOverviewItem {
  key: SubjectKey;
  count: number;
  subSetCount: number;
  topics: Array<{ title: string; count: number }>;
}

interface CatalogSubjectClientProps {
  items: SubjectOverviewItem[];
}

export function CatalogSubjectClient({ items }: CatalogSubjectClientProps) {
  const [activeKey, setActiveKey] = useState<SubjectKey>(items[0]?.key || 'math');
  const [chunkSize, setChunkSize] = useState<20 | 50>(20);
  const [showAllSets, setShowAllSets] = useState(false);

  const activeMeta = SUBJECT_MAP[activeKey] || SUBJECTS[0];
  const activeData = useMemo(
    () => items.find((i) => i.key === activeKey) || items[0],
    [items, activeKey]
  );

  const totalSets = Math.max(1, Math.ceil((activeData?.count || 0) / chunkSize));
  const setsArray = useMemo(() => {
    const totalQ = activeData?.count || 0;
    return Array.from({ length: totalSets }, (_, idx) => {
      const setNum = idx + 1;
      const startQ = idx * chunkSize + 1;
      const endQ = Math.min(totalQ, setNum * chunkSize);
      const qCount = Math.max(0, endQ - startQ + 1);
      return { setNum, startQ, endQ, qCount };
    });
  }, [activeData?.count, chunkSize, totalSets]);

  const visibleSets = showAllSets ? setsArray : setsArray.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* 7 Subject Selector Tabs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {SUBJECTS.map((sub) => {
          const info = items.find((it) => it.key === sub.key);
          const selected = sub.key === activeKey;
          return (
            <button
              key={sub.key}
              type="button"
              onClick={() => {
                setActiveKey(sub.key);
                setShowAllSets(false);
              }}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                selected
                  ? 'border-brand bg-brand/10 ring-2 ring-brand/25'
                  : 'border-line bg-panel hover:border-brand/50'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <SubjectIcon subjectKey={sub.key} size="sm" />
                <span className="font-mono text-[11px] font-bold text-muted">
                  {info?.count.toLocaleString('en-US')} ข้อ
                </span>
              </div>
              <div className={`text-xs font-extrabold leading-snug ${selected ? 'text-brand' : 'text-ink'}`}>
                {sub.shortName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Subject Banner & Random Intense Drill */}
      <section className="rounded-card border border-line bg-panel p-6 shadow-card">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <SubjectIcon subjectKey={activeMeta.key} size="lg" />
            <div>
              <span className="inline-flex items-center rounded-full bg-bg2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
                {activeMeta.grp === 'general' ? 'ภาคความรู้ความสามารถทั่วไป' : 'ภาคความรู้เฉพาะตำแหน่ง'}
              </span>
              <h2 className="mt-1.5 text-xl font-extrabold text-ink sm:text-2xl">
                {activeMeta.name}
              </h2>
              <p className="mt-1 text-xs text-muted">
                มีข้อสอบทั้งหมด <strong className="font-mono text-ink">{activeData?.count.toLocaleString('en-US')} ข้อ</strong> ·{' '}
                จัดเป็นชุดย่อยเรียงตามข้อได้ <strong className="font-mono text-ink">{totalSets} ชุด</strong> (ชุดละ {chunkSize} ข้อ) ·{' '}
                <strong className="font-mono text-ink">{activeData?.topics.length || 0} หัวข้อย่อย</strong>
              </p>
            </div>
          </div>

          {/* Quick Random Subject Drills */}
          <div className="flex flex-wrap items-center gap-2">
            {[20, 50, 100].map((qty) => (
              <Link
                key={qty}
                href={`/exam/subject-${activeMeta.key}?count=${qty}&mode=practice&fresh=1`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
              >
                <Shuffle className="h-3.5 w-3.5 text-brand" />
                <span>สุ่มฝึก {qty} ข้อ</span>
              </Link>
            ))}
            <Link
              href={`/exam/subject-${activeMeta.key}?count=50&mode=real&fresh=1`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
            >
              <span>สอบจับเวลา 50 ข้อ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Structured Ordered Sub-Sets */}
      <section className="rounded-card border border-line bg-panel p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
              <Layers className="h-4 w-4 text-brand" />
              <span>ชุดข้อสอบแยกรายวิชา (เรียงลำดับไม่ซ้ำข้อ · {totalSets} ชุด)</span>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              ทำไล่ทีละชุดเพื่อให้ครบทุกข้อในวิชา {activeMeta.name} โดยไม่สุ่มซ้ำ
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-bg2 p-1 text-xs font-bold">
            {([20, 50] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => {
                  setChunkSize(sz);
                  setShowAllSets(false);
                }}
                className={`rounded-lg px-3 py-1 transition-colors ${
                  chunkSize === sz ? 'bg-panel text-brand shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                ชุดละ {sz} ข้อ
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSets.map(({ setNum, startQ, endQ, qCount }) => (
            <div
              key={`${activeMeta.key}-${chunkSize}-${setNum}`}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-line bg-bg2/60 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-extrabold text-brand">
                    {activeMeta.shortName} · ชุดที่ {setNum}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-muted">
                    <Clock className="h-3 w-3" />
                    {qCount} นาที
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  ช่วงข้อที่ <span className="font-mono font-bold text-ink">{startQ}–{endQ}</span> ({qCount} ข้อ)
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/exam/subject-${activeMeta.key}?set=${setNum}&count=${chunkSize}&mode=practice&fresh=1`}
                  className="flex-1 rounded-xl border border-line bg-panel py-2 text-center text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
                >
                  โหมดฝึกซ้อม
                </Link>
                <Link
                  href={`/exam/subject-${activeMeta.key}?set=${setNum}&count=${chunkSize}&mode=real&fresh=1`}
                  className="flex-1 rounded-xl bg-brand py-2 text-center text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  จับเวลาจริง
                </Link>
              </div>
            </div>
          ))}
        </div>

        {setsArray.length > 12 && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllSets((v) => !v)}
              className="rounded-btn border border-line bg-bg2 px-5 py-2 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
            >
              {showAllSets
                ? 'ย่อรายการชุดข้อสอบ'
                : `แสดงชุดที่ 13 – ${setsArray.length} เพิ่มเติม (อีก ${setsArray.length - 12} ชุด)`}
            </button>
          </div>
        )}
      </section>

      {/* Sub-Topics Drill List */}
      {activeData?.topics.length > 0 && (
        <section className="rounded-card border border-line bg-panel p-6 shadow-card">
          <div className="flex items-center gap-2 text-base font-extrabold text-ink">
            <BookOpen className="h-4 w-4 text-teal-ink" />
            <span>เจาะลึกตามหัวข้อย่อยในวิชา {activeMeta.shortName} ({activeData.topics.length} หัวข้อ)</span>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {activeData.topics.map((t) => (
              <Link
                key={t.title}
                href={`/exam/topic?subject=${activeMeta.key}&topic=${encodeURIComponent(t.title)}&count=30&mode=practice&fresh=1`}
                className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg2/60 px-3.5 py-2.5 text-xs transition-colors hover:border-brand/50 hover:text-brand"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-ink" />
                  <span className="truncate font-semibold text-ink">{t.title}</span>
                </div>
                <span className="shrink-0 font-mono font-bold text-brand">{t.count} ข้อ</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
