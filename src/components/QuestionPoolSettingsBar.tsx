'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from 'lucide-react';

export interface QuestionPoolSettingsBarProps {
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  excludeCompleted: boolean;
  onToggleExclude: (next: boolean) => void;
  saving?: boolean;
  onOpenReset?: () => void;
  compact?: boolean;
}

export function QuestionPoolSettingsBar({
  totalQuestions,
  correctCount,
  wrongCount,
  excludeCompleted,
  onToggleExclude,
  saving = false,
  onOpenReset,
  compact = false,
}: QuestionPoolSettingsBarProps) {
  const doneCount = correctCount + wrongCount;
  const remainingCount = Math.max(0, totalQuestions - doneCount);
  const donePct = totalQuestions > 0 ? Math.min(100, Math.round((doneCount / totalQuestions) * 100)) : 0;

  return (
    <section
      aria-label="ตั้งค่าการคัดกรองข้อสอบที่เคยทำแล้ว"
      className={`rounded-card border border-line bg-panel shadow-card ${
        compact ? 'p-4 space-y-3' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-ink">
              <SlidersHorizontal className="h-4 w-4 text-brand shrink-0" />
              <span>ตั้งค่าการจัดชุดข้อสอบ (Question Pool Mode)</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                excludeCompleted
                  ? 'bg-teal/15 text-teal-ink'
                  : 'bg-bg2 border border-line text-muted'
              }`}
            >
              {excludeCompleted ? 'คัดเฉพาะข้อใหม่ (ไม่ซ้ำข้อที่เคยทำ)' : 'รวมข้อสอบทั้งหมดตามเดิม'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              ทำไปแล้วทั้งหมด{' '}
              <strong className="font-mono text-ink">
                {doneCount.toLocaleString('en-US')} / {totalQuestions.toLocaleString('en-US')} ข้อ
              </strong>{' '}
              ({donePct}%)
            </span>
            <span className="hidden sm:inline text-line">·</span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-teal-ink">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ถูก {correctCount.toLocaleString('en-US')} ข้อ
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-accent">
              <XCircle className="h-3.5 w-3.5" />
              ผิด {wrongCount.toLocaleString('en-US')} ข้อ
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              เหลือข้อใหม่ {remainingCount.toLocaleString('en-US')} ข้อ
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/catalog/completed"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/35 bg-brand/10 px-3 py-2 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white"
          >
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span>ไปหน้าชุดข้อสอบที่เคยทำแล้ว ({doneCount.toLocaleString('en-US')} ข้อ)</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>

          {onOpenReset && doneCount > 0 && (
            <button
              type="button"
              onClick={onOpenReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-2 text-xs font-bold text-muted transition hover:border-accent/50 hover:text-accent disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ตประวัติ</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="group"
        aria-label="เลือกโหมดการจัดชุดข้อสอบ"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <button
          type="button"
          aria-pressed={excludeCompleted}
          disabled={saving}
          onClick={() => onToggleExclude(true)}
          className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-xs transition ${
            excludeCompleted
              ? 'border-brand bg-brand/10 text-ink ring-2 ring-brand/20'
              : 'border-line bg-bg2/60 text-muted hover:border-brand/40 hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Sparkles
              className={`h-4 w-4 shrink-0 ${excludeCompleted ? 'text-brand' : 'text-muted'}`}
            />
            <span className="font-extrabold">ไม่นำข้อที่เคยทำมาขึ้นซ้ำ (เฉพาะข้อใหม่)</span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              excludeCompleted ? 'bg-brand text-white' : 'bg-panel text-muted border border-line'
            }`}
          >
            {excludeCompleted ? 'ใช้งานอยู่' : 'เลือก'}
          </span>
        </button>

        <button
          type="button"
          aria-pressed={!excludeCompleted}
          disabled={saving}
          onClick={() => onToggleExclude(false)}
          className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-xs transition ${
            !excludeCompleted
              ? 'border-brand bg-brand/10 text-ink ring-2 ring-brand/20'
              : 'border-line bg-bg2/60 text-muted hover:border-brand/40 hover:text-ink'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Layers
              className={`h-4 w-4 shrink-0 ${!excludeCompleted ? 'text-brand' : 'text-muted'}`}
            />
            <span className="font-extrabold">ใช้ข้อสอบรวมตามเดิม (รวมข้อที่เคยทำ)</span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              !excludeCompleted ? 'bg-brand text-white' : 'bg-panel text-muted border border-line'
            }`}
          >
            {!excludeCompleted ? 'ใช้งานอยู่' : 'เลือก'}
          </span>
        </button>
      </div>
    </section>
  );
}
