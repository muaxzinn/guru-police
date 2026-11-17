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
        compact ? 'p-3.5 space-y-2.5' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <SlidersHorizontal className="h-3.5 w-3.5 text-brand shrink-0" />
            <span>ตั้งค่าการจัดชุดข้อสอบ (Question Pool Mode)</span>
          </span>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
            <span>
              ทำแล้ว{' '}
              <strong className="font-semibold text-ink">
                {doneCount.toLocaleString('en-US')}/{totalQuestions.toLocaleString('en-US')}
              </strong>{' '}
              ({donePct}%)
            </span>
            <span className="inline-flex items-center gap-1 text-teal-ink">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ถูก {correctCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1 text-accent">
              <XCircle className="h-3.5 w-3.5" />
              ผิด {wrongCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              เหลือใหม่ {remainingCount.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/catalog/completed"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg2/60 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand/50 hover:text-brand"
          >
            <Archive className="h-3.5 w-3.5 text-brand shrink-0" />
            <span className="tabular-nums">ข้อที่เคยทำแล้ว ({doneCount.toLocaleString('en-US')})</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted shrink-0" />
          </Link>

          {onOpenReset && doneCount > 0 && (
            <button
              type="button"
              onClick={onOpenReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>รีเซ็ต</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div
        role="group"
        aria-label="เลือกโหมดการจัดชุดข้อสอบ"
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl bg-bg2 p-1 border border-line/70"
      >
        <button
          type="button"
          aria-pressed={excludeCompleted}
          disabled={saving}
          onClick={() => onToggleExclude(true)}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
            excludeCompleted
              ? 'bg-panel text-brand font-semibold shadow-sm border border-line'
              : 'text-muted font-medium hover:text-ink border border-transparent'
          }`}
        >
          <Sparkles
            className={`h-3.5 w-3.5 shrink-0 ${excludeCompleted ? 'text-brand' : 'text-muted'}`}
          />
          <span>ไม่นำข้อที่เคยทำมาขึ้นซ้ำ (เฉพาะข้อใหม่)</span>
        </button>

        <button
          type="button"
          aria-pressed={!excludeCompleted}
          disabled={saving}
          onClick={() => onToggleExclude(false)}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
            !excludeCompleted
              ? 'bg-panel text-brand font-semibold shadow-sm border border-line'
              : 'text-muted font-medium hover:text-ink border border-transparent'
          }`}
        >
          <Layers
            className={`h-3.5 w-3.5 shrink-0 ${!excludeCompleted ? 'text-brand' : 'text-muted'}`}
          />
          <span>ใช้ข้อสอบรวมตามเดิม (รวมข้อที่เคยทำ)</span>
        </button>
      </div>
    </section>
  );
}
