import React from 'react';
import {
  BookOpenCheck,
  Clock,
  Database,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

export type LoadingVariant = 'page' | 'exam' | 'catalog' | 'bank' | 'result';

interface AppLoadingScreenProps {
  variant?: LoadingVariant;
  title?: string;
  subtitle?: string;
  includeHeader?: boolean;
}

const DEFAULT_COPY: Record<LoadingVariant, { title: string; subtitle: string; badge: string }> = {
  page: {
    badge: 'GURU POLICE V2 · FAST ENGINE',
    title: 'กำลังเตรียมระบบ GURU POLICE V2...',
    subtitle: 'กำลังโหลดคลังข้อสอบนายสิบตำรวจและสถานะล่าสุดของคุณ',
  },
  exam: {
    badge: 'EXAM RUNNER INITIALIZING',
    title: 'กำลังจัดเตรียมกระดาษคำตอบและชุดข้อสอบ...',
    subtitle: 'โหลดเฉพาะชุดวิชาที่เลือกและกู้คืนความคืบหน้าล่าสุดอัตโนมัติ',
  },
  catalog: {
    badge: 'EXAM CATALOG SYNC',
    title: 'กำลังโหลดคลังชุดข้อสอบและสถิติความคืบหน้า...',
    subtitle: 'จัดเรียงชุดข้อสอบจำลอง รายวิชา 7 วิชา และหัวข้อย่อย 132 บท',
  },
  bank: {
    badge: 'QUESTION BANK SEARCH',
    title: 'กำลังดึงรายการข้อสอบจากคลัง...',
    subtitle: 'เตรียมโจทย์ ตัวเลือก เฉลยละเอียด และภาพประกอบ SVG ความคมชัดสูง',
  },
  result: {
    badge: 'DIAGNOSTIC ANALYTICS',
    title: 'กำลังวิเคราะห์ผลคะแนนและจุดอ่อนรายหัวข้อ...',
    subtitle: 'ประเมินเกณฑ์ผ่าน 2 ภาค (60%) และคัดกรองข้อที่ควรทบทวนซ้ำ',
  },
};

export function AppLoadingScreen({
  variant = 'page',
  title,
  subtitle,
  includeHeader = false,
}: AppLoadingScreenProps) {
  const copy = DEFAULT_COPY[variant];
  const resolvedTitle = title || copy.title;
  const resolvedSubtitle = subtitle || copy.subtitle;

  const VariantIcon =
    variant === 'exam'
      ? Clock
      : variant === 'catalog'
        ? BookOpenCheck
        : variant === 'bank'
          ? Database
          : variant === 'result'
            ? Target
            : Layers;

  const isInlineBank = variant === 'bank' && !includeHeader;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={isInlineBank ? 'w-full space-y-4' : 'min-h-screen bg-bg text-ink pb-20 md:pb-12'}
    >
      {includeHeader && (
        <header className="sticky top-0 z-30 border-b border-line bg-panel/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-2.5 font-extrabold tracking-tight text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-base sm:text-lg">
                GURU <span className="text-brand">POLICE</span>
              </span>
            </div>
            <div className="hidden items-center gap-2 xl:flex">
              <div className="h-7 w-20 animate-pulse rounded-xl bg-bg2" />
              <div className="h-7 w-24 animate-pulse rounded-xl bg-bg2" />
              <div className="h-7 w-20 animate-pulse rounded-xl bg-bg2" />
              <div className="h-7 w-24 animate-pulse rounded-xl bg-bg2" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse rounded-xl bg-bg2" />
              <div className="h-8 w-24 animate-pulse rounded-xl bg-brand/15" />
            </div>
          </div>
        </header>
      )}

      <div className={isInlineBank ? 'space-y-4' : 'mx-auto max-w-5xl px-4 py-8 sm:py-10 space-y-6'}>
        {/* Status & Indeterminate Tactical Progress Card */}
        <div className="rounded-card border border-line bg-panel p-5 sm:p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <VariantIcon className="h-5 w-5" />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-panel shadow-sm">
                  <Loader2 className="h-3 w-3 animate-spin text-brand" />
                </span>
              </div>
              <div className="min-w-0 space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand">
                  <Sparkles className="h-3 w-3" />
                  <span>{copy.badge}</span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-ink leading-snug">
                  {resolvedTitle}
                </h2>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{resolvedSubtitle}</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl border border-line bg-bg2/70 px-3 py-1.5 text-xs font-bold text-muted shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
              <span>กำลังเชื่อมต่อข้อมูล...</span>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-bg2"
          >
            <div className="gp-loading-bar h-full w-2/5 rounded-full bg-gradient-to-r from-brand via-teal to-brand" />
          </div>
        </div>

        {/* Route-Specific Non-Article Skeleton Placeholders */}
        {variant === 'exam' ? (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-card border border-line bg-panel p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-6 w-28 animate-pulse rounded-full bg-bg2" />
                  <div className="h-6 w-20 animate-pulse rounded-xl bg-bg2" />
                </div>
                <div className="space-y-2.5 pt-1">
                  <div className="h-5 w-full animate-pulse rounded-lg bg-bg2" />
                  <div className="h-5 w-11/12 animate-pulse rounded-lg bg-bg2" />
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-bg2" />
                </div>
                <div className="grid gap-2.5 pt-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-bg2/40 p-3.5"
                    >
                      <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-bg2" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-bg2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-card border border-line bg-panel p-5 shadow-card space-y-3">
                <div className="h-4 w-32 animate-pulse rounded bg-bg2" />
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 15 }, (_, idx) => (
                    <div key={idx} className="h-9 animate-pulse rounded-xl bg-bg2" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : variant === 'result' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="rounded-card border border-line bg-panel p-5 shadow-card space-y-2.5"
                >
                  <div className="h-3.5 w-24 animate-pulse rounded bg-bg2" />
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-bg2" />
                  <div className="h-3 w-28 animate-pulse rounded bg-bg2" />
                </div>
              ))}
            </div>
            <div className="rounded-card border border-line bg-panel p-6 shadow-card space-y-3">
              <div className="h-5 w-48 animate-pulse rounded bg-bg2" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-bg2/70" />
            </div>
          </div>
        ) : variant === 'bank' ? (
          <div className="space-y-4">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-card border border-line bg-panel p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 animate-pulse rounded-lg bg-bg2" />
                    <div className="h-4 w-32 animate-pulse rounded bg-bg2" />
                    <div className="h-5 w-24 animate-pulse rounded-full bg-bg2" />
                  </div>
                  <div className="h-7 w-28 animate-pulse rounded-xl bg-bg2" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-bg2" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-bg2" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <div className="h-10 animate-pulse rounded-xl bg-bg2/60" />
                  <div className="h-10 animate-pulse rounded-xl bg-bg2/60" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="rounded-card border border-line bg-panel p-5 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-10 w-10 animate-pulse rounded-2xl bg-bg2" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-bg2" />
                </div>
                <div className="h-5 w-3/4 animate-pulse rounded bg-bg2" />
                <div className="h-3.5 w-full animate-pulse rounded bg-bg2" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-bg2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
