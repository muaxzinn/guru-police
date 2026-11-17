'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Layers } from 'lucide-react';
import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from '@/lib/constants';
import type { AttemptRecord, ExamSetSummary } from '@/lib/server-db';
import { useProfileHistory } from '@/lib/use-profile-history';
import { SubjectIcon } from '@/components/SubjectIcon';
import { QuestionPoolSettingsBar } from '@/components/QuestionPoolSettingsBar';

interface CatalogFormClientProps {
  sets: ExamSetSummary[];
  attempts: AttemptRecord[];
}

export function CatalogFormClient({
  sets: initialSets,
  attempts: initialAttempts,
}: CatalogFormClientProps) {
  const [sets, setSets] = useState<ExamSetSummary[]>(initialSets);
  const [attempts, setAttempts] = useState<AttemptRecord[]>(initialAttempts);
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey | ''>('');
  const [totalQuestions, setTotalQuestions] = useState<number>(7038);

  const {
    correctSet,
    mistakeSet,
    allCompletedSet,
    excludeCompleted,
    saving,
    toggleExcludeCompleted,
    resetCompleted,
  } = useProfileHistory();

  useEffect(() => {
    let active = true;
    const syncData = async () => {
      try {
        const [setsRes, attRes, healthRes] = await Promise.all([
          fetch('/api/admin/sets', { cache: 'no-store' }),
          fetch('/api/attempts', { cache: 'no-store' }),
          fetch('/api/health', { cache: 'no-store' }),
        ]);
        if (!active) return;
        if (setsRes.ok) {
          const d = await setsRes.json();
          if (Array.isArray(d.sets)) {
            setSets(d.sets.filter((s: ExamSetSummary) => s.kind === 'form'));
          }
        }
        if (attRes.ok) {
          const a = await attRes.json();
          if (Array.isArray(a.attempts)) setAttempts(a.attempts);
        }
        if (healthRes.ok) {
          const h = await healthRes.json();
          if (typeof h.questions === 'number') setTotalQuestions(h.questions);
        }
      } catch {
        // keep initial snapshot
      }
    };
    void syncData();
    return () => {
      active = false;
    };
  }, []);

  const availableSubjects = useMemo(() => {
    const keys = new Set<SubjectKey>();
    for (const s of sets) {
      for (const [k, count] of Object.entries(s.subjectBreakdown || {})) {
        if ((count || 0) > 0) keys.add(k as SubjectKey);
      }
    }
    return SUBJECTS.filter((sub) => keys.has(sub.key));
  }, [sets]);

  const visibleSets = useMemo(() => {
    if (!selectedSubject) return sets;
    return sets.filter((s) => (s.subjectBreakdown?.[selectedSubject] || 0) > 0);
  }, [sets, selectedSubject]);

  const excludeParam = excludeCompleted ? '&excludeCompleted=1' : '&excludeCompleted=0';

  return (
    <div className="space-y-6">
      <QuestionPoolSettingsBar
        totalQuestions={totalQuestions}
        correctCount={correctSet.size}
        wrongCount={mistakeSet.size}
        excludeCompleted={excludeCompleted}
        onToggleExclude={toggleExcludeCompleted}
        saving={saving}
        onOpenReset={() => {
          if (
            window.confirm(
              `ต้องการรีเซ็ตประวัติข้อสอบที่เคยทำทั้งหมด (${allCompletedSet.size} ข้อ) เพื่อให้นำกลับมาฝึกใหม่ใช่หรือไม่?`
            )
          ) {
            void resetCompleted({ scope: 'all', pool: 'all' });
          }
        }}
      />

      {/* Subject Filter Strip */}
      <div className="rounded-card border border-line bg-panel p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Layers className="h-4 w-4 text-brand" />
            <span>เลือกรูปแบบการทำข้อสอบในชุด:</span>
          </div>
          {selectedSubject && (
            <span className="text-xs font-medium text-brand">
              กำลังกรอง: {SUBJECT_MAP[selectedSubject]?.name}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSubject('')}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              selectedSubject === ''
                ? 'border-brand bg-brand text-white font-semibold'
                : 'border-line bg-bg2/50 text-muted font-medium hover:border-brand/50 hover:text-ink'
            }`}
          >
            ครบทุกวิชา (150 ข้อ)
          </button>

          {availableSubjects.map((sub) => {
            const active = selectedSubject === sub.key;
            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => setSelectedSubject(active ? '' : sub.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? 'border-brand bg-brand text-white font-semibold'
                    : 'border-line bg-bg2/50 text-ink font-medium hover:border-brand/50 hover:text-brand'
                }`}
              >
                <SubjectIcon subjectKey={sub.key} size="sm" />
                <span>เฉพาะ {sub.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sets List */}
      <div className="space-y-3.5">
        {visibleSets.map((s, idx) => {
          const bestAttempt = attempts
            .filter((a) => a.setId === String(s.id))
            .sort((a, b) => b.score - a.score)[0];

          const breakdownEntries = SUBJECTS.map((sub) => ({
            sub,
            count: s.subjectBreakdown?.[sub.key] || 0,
          })).filter((entry) => entry.count > 0);

          const filteredCount = selectedSubject ? s.subjectBreakdown?.[selectedSubject] || 0 : s.total;
          const filteredMinutes = selectedSubject ? Math.max(5, filteredCount) : s.timeMinutes;
          const subjectParam = selectedSubject ? `&subject=${selectedSubject}` : '';

          return (
            <div
              key={s.id}
              className="rounded-card border border-line bg-panel p-5 shadow-card"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand font-mono text-sm font-extrabold text-white">
                    {idx + 1}
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-ink">
                      {s.title}
                      {selectedSubject && (
                        <span className="ml-2 text-sm font-bold text-brand">
                          · เฉพาะ {SUBJECT_MAP[selectedSubject]?.shortName}
                        </span>
                      )}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="font-mono font-semibold">{filteredCount} ข้อ</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3.5 w-3.5" />
                        {filteredMinutes} นาที
                      </span>
                      {bestAttempt && !selectedSubject && (
                        <span className="rounded-full bg-teal/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-teal-ink">
                          สถิติสูงสุด {bestAttempt.score}/{bestAttempt.total} ({bestAttempt.pct}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/exam/${s.id}?mode=practice&fresh=1${subjectParam}${excludeParam}`}
                    className="rounded-xl border border-line bg-bg2 px-3.5 py-2 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
                  >
                    โหมดฝึกซ้อม
                  </Link>
                  <Link
                    href={`/exam/${s.id}?mode=real&fresh=1${subjectParam}${excludeParam}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    <span>เริ่มสอบจริง</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Per-Subject Drill Chips */}
              {breakdownEntries.length > 0 && (
                <div className="mt-4 border-t border-line/70 pt-3">
                  <div className="mb-2 text-[11px] font-bold text-muted">
                    คลิกเลือกทำเฉพาะวิชาภายในชุดนี้:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {breakdownEntries.map(({ sub, count }) => {
                      const highlighted = selectedSubject === sub.key;
                      return (
                        <Link
                          key={sub.key}
                          href={`/exam/${s.id}?subject=${sub.key}&mode=practice&fresh=1${excludeParam}`}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold transition-colors ${
                            highlighted
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-line bg-bg2/60 text-ink hover:border-brand/50 hover:text-brand'
                          }`}
                        >
                          <SubjectIcon subjectKey={sub.key} size="sm" />
                          <span>{sub.shortName}</span>
                          <span className="font-mono text-[11px] text-muted">{count} ข้อ</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
