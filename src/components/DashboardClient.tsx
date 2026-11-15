'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  Flame,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CountdownCard } from '@/components/Countdown';
import { SubjectIcon } from '@/components/SubjectIcon';
import { StartExamModalButton } from '@/components/RedeemAndStartModals';
import { SUBJECT_MAP, TRACKS, type SubjectKey } from '@/lib/constants';
import type { AttemptRecord, ExamProgressRecord, UserProfile } from '@/lib/server-db';

interface DashboardClientProps {
  profile: UserProfile;
  attempts: AttemptRecord[];
  examProgress: ExamProgressRecord | null;
  leaderboard: Array<{
    track: string;
    nameMasked: string;
    score: number;
    total: number;
    durationFormatted: string;
    isChampion?: boolean;
  }>;
  totalQuestions: number;
  totalTopics: number;
}

export function DashboardClient({
  profile: initialProfile,
  attempts: initialAttempts,
  examProgress: initialExamProgress,
  leaderboard: initialLeaderboard,
  totalQuestions: initialTotalQuestions,
  totalTopics,
}: DashboardClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [attempts, setAttempts] = useState<AttemptRecord[]>(initialAttempts);
  const [examProgress, setExamProgress] = useState<ExamProgressRecord | null>(initialExamProgress);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [totalQuestions, setTotalQuestions] = useState<number>(initialTotalQuestions);
  const [selectedTrack, setSelectedTrack] = useState<string>(initialProfile.track || TRACKS[0].name);
  const [savingTrack, setSavingTrack] = useState(false);
  const [lbTrack, setLbTrack] = useState<string>(initialProfile.track || TRACKS[0].name);
  const currentTrackMeta = TRACKS.find((t) => t.name === selectedTrack) || TRACKS[0];

  useEffect(() => {
    let active = true;
    const syncRuntime = async () => {
      try {
        const [profRes, attRes, progRes, healthRes] = await Promise.all([
          fetch('/api/profile', { cache: 'no-store' }),
          fetch('/api/attempts', { cache: 'no-store' }),
          fetch('/api/progress', { cache: 'no-store' }),
          fetch('/api/health', { cache: 'no-store' }),
        ]);
        if (!active) return;
        if (profRes.ok) {
          const p = await profRes.json();
          if (p.profile) {
            setProfile(p.profile);
            if (p.profile.track) {
              setSelectedTrack(p.profile.track);
              setLbTrack(p.profile.track);
            }
          }
          if (Array.isArray(p.leaderboard) && p.leaderboard.length > 0) {
            setLeaderboard(p.leaderboard);
          }
        }
        if (attRes.ok) {
          const a = await attRes.json();
          if (Array.isArray(a.attempts)) setAttempts(a.attempts);
        }
        if (progRes.ok) {
          const pr = await progRes.json();
          setExamProgress(pr.progress || null);
        }
        if (healthRes.ok) {
          const h = await healthRes.json();
          if (typeof h.questions === 'number') setTotalQuestions(h.questions);
        }
      } catch {
        // keep initial server-rendered snapshot
      }
    };
    void syncRuntime();
    return () => {
      active = false;
    };
  }, []);

  const handleTrackSwitch = async (nextTrack: string) => {
    if (nextTrack === selectedTrack || savingTrack) return;
    setSelectedTrack(nextTrack);
    setLbTrack(nextTrack);
    setSavingTrack(true);
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: nextTrack }),
      });
      router.refresh();
    } catch {
      // keep optimistic UI track
    } finally {
      setSavingTrack(false);
    }
  };

  // Aggregate subject accuracy from real attempts
  const subjectTotals = new Map<SubjectKey, { correct: number; total: number }>();
  for (const sk of currentTrackMeta.subjects) {
    subjectTotals.set(sk, { correct: 0, total: 0 });
  }
  for (const att of attempts) {
    for (const ps of att.perSubject || []) {
      const prev = subjectTotals.get(ps.key) || { correct: 0, total: 0 };
      subjectTotals.set(ps.key, {
        correct: prev.correct + ps.correct,
        total: prev.total + ps.total,
      });
    }
  }

  let totalAnsweredCorrect = 0;
  let totalAnsweredCount = 0;
  const subjectBars = currentTrackMeta.subjects.map((sk) => {
    const stat = subjectTotals.get(sk) || { correct: 0, total: 0 };
    totalAnsweredCorrect += stat.correct;
    totalAnsweredCount += stat.total;
    const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    return {
      meta: SUBJECT_MAP[sk],
      pct,
      correct: stat.correct,
      total: stat.total,
    };
  });

  const overallReadiness =
    totalAnsweredCount > 0 ? Math.round((totalAnsweredCorrect / totalAnsweredCount) * 100) : 0;
  const filteredLeaderboard = leaderboard.filter((l) => l.track === lbTrack);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="app" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:py-9">
        {/* Track Switcher & Quick Exam Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-muted">
              <Compass className="h-4 w-4 text-brand" />
              <span>สายสอบหลัก:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TRACKS.map((t) => {
                const active = t.name === currentTrackMeta.name;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={savingTrack}
                    onClick={() => handleTrackSwitch(t.name)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-bg2 text-muted hover:border-brand/50 hover:text-ink'
                    }`}
                  >
                    {t.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/catalog/subject"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
            >
              <Layers className="h-3.5 w-3.5 text-teal-ink" />
              <span>ชุดข้อสอบแยกรายวิชา</span>
            </Link>
          </div>
        </div>

        {/* Resume active exam banner if saved in progress */}
        {examProgress && examProgress.list?.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-gold/45 bg-gold/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/25 text-gold-ink">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-ink">มีข้อสอบที่ทำค้างไว้</div>
                <div className="text-xs text-muted">
                  ตอบแล้ว <span className="font-mono font-bold">{examProgress.answers.filter((a) => a !== null).length}</span> /{' '}
                  <span className="font-mono font-bold">{examProgress.list.length}</span> ข้อ
                </div>
              </div>
            </div>
            <Link
              href={`/exam/${examProgress.setId}?mode=${examProgress.mode}`}
              className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2 text-xs font-bold text-white"
            >
              <Play className="h-3.5 w-3.5" />
              <span>ทำต่อทันที</span>
            </Link>
          </div>
        )}

        {/* Hero Greeting Card */}
        <section className="rounded-card border border-line bg-panel p-6 shadow-card sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-[11px] font-bold text-teal-ink">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>เปิดฝึกทำครบทุกชุด · ไม่ต้องเข้าสู่ระบบ</span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                ศูนย์ฝึกสอบ {currentTrackMeta.name}
              </h1>
              <p className="mt-1.5 text-sm text-muted">
                คลังข้อสอบนายสิบตำรวจ {totalQuestions.toLocaleString('en-US')} ข้อ · ครบ {currentTrackMeta.subjects.length} วิชาตามสายสอบของคุณ
              </p>
            </div>
            <StartExamModalButton defaultTrack={currentTrackMeta.name} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CountdownCard
              title={TRACKS[0].name}
              dateLabel={TRACKS[0].examDateLabel}
              targetIso={TRACKS[0].examDateIso}
              accentColor="brand"
            />
            <CountdownCard
              title="ปราบปราม"
              dateLabel={TRACKS[1].examDateLabel}
              targetIso={TRACKS[1].examDateIso}
              accentColor="gold"
            />
          </div>
        </section>

        {/* Proactive Upgrade Action Row */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-line bg-panel p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">สถิติต่อเนื่อง</div>
                <div className="font-mono text-xl font-extrabold text-ink">
                  {profile.streakDays || 1} วัน
                </div>
              </div>
            </div>
          </div>

          <Link
            href={profile.mistakeIds.length > 0 ? '/exam/mistakes?mode=practice' : '/catalog/subject'}
            className="card-hover rounded-card border border-line bg-panel p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">สมุดซ่อมจุดอ่อน</div>
                  <div className="font-mono text-xl font-extrabold text-ink">
                    {profile.mistakeIds.length} ข้อ
                  </div>
                </div>
              </div>
              <RotateCcw className="h-4 w-4 text-muted" />
            </div>
          </Link>

          <Link
            href={profile.bookmarks.length > 0 ? '/exam/bookmarks?mode=practice' : '/bank'}
            className="card-hover rounded-card border border-line bg-panel p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold-ink">
                  <Bookmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">ข้อที่ติดดาวไว้</div>
                  <div className="font-mono text-xl font-extrabold text-ink">
                    {profile.bookmarks.length} ข้อ
                  </div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted" />
            </div>
          </Link>

          <Link
            href="/bank"
            className="card-hover rounded-card border border-line bg-panel p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">คลังเจาะลึก</div>
                  <div className="font-mono text-xl font-extrabold text-brand">{totalTopics} บท</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-brand" />
            </div>
          </Link>
        </section>

        {/* Subject Accuracy & Readiness */}
        <section className="rounded-card border border-line bg-panel p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-ink">ความแม่นรายวิชา</h2>
              <span className="text-xs text-muted">
                ทำข้อสอบแล้ว <span className="font-mono font-bold text-ink">{attempts.length}</span> ครั้ง
              </span>
            </div>
            <Link
              href="/catalog/subject"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-bold text-brand hover:border-brand/50"
            >
              <span>ดูชุดแยกรายวิชาทั้งหมด</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {subjectBars.map(({ meta, pct, correct, total }) => (
              <div key={meta.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold">
                  <div className="flex items-center gap-2.5 text-ink">
                    <SubjectIcon subjectKey={meta.key} size="sm" />
                    <span>{meta.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-muted">
                      {total > 0 ? (
                        <>
                          <span className="text-ink">{correct}/{total}</span> ({pct}%)
                        </>
                      ) : (
                        '0%'
                      )}
                    </div>
                    <Link
                      href={`/exam/subject-${meta.key}?set=1&count=20&mode=practice&fresh=1`}
                      className="rounded-lg border border-line bg-bg2 px-2.5 py-1 text-[11px] font-bold text-brand transition-colors hover:border-brand/50 hover:bg-brand/10"
                    >
                      ฝึกวิชานี้
                    </Link>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-bg2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: meta.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col items-center border-t border-line pt-6 text-center">
            <div className="text-sm font-bold text-ink">ระดับความพร้อมโดยรวม</div>
            <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-full border-8 border-line bg-bg2/60">
              <span className="font-mono text-2xl font-extrabold text-ink">{overallReadiness}%</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {totalAnsweredCount > 0
                ? overallReadiness >= 60
                  ? 'ผ่านเกณฑ์ขั้นต่ำ 60% แล้ว รักษาความสม่ำเสมอต่อไป'
                  : 'ตั้งเป้าหมายความแม่นยำรายภาคให้ถึง 60% ทั้งภาคทั่วไปและเฉพาะตำแหน่ง'
                : 'ยังไม่มีประวัติการทำข้อสอบ เริ่มทำชุดแรกเพื่อวัดความพร้อม'}
            </p>
          </div>
        </section>

        {/* Leaderboard */}
        <section className="rounded-card border border-line bg-panel p-6 shadow-card">
          <div className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <Trophy className="h-5 w-5 text-gold-ink" />
            <h2>กระดานคะแนน</h2>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setLbTrack(t.name)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  lbTrack === t.name
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-bg2 text-muted hover:text-ink'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {filteredLeaderboard.map((row, idx) => (
              <div
                key={`${row.nameMasked}-${idx}`}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  idx === 0
                    ? 'border-gold/50 bg-gradient-to-r from-gold/25 to-gold/5'
                    : idx === 1
                      ? 'border-line bg-bg2'
                      : idx === 2
                        ? 'border-amber-700/25 bg-amber-500/5'
                        : 'border-line bg-panel'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel font-mono text-xs font-extrabold text-ink shadow-sm">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">{row.nameMasked}</div>
                    {row.isChampion && (
                      <div className="text-[11px] font-bold text-gold-ink">GURU Test Champion</div>
                    )}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-extrabold text-brand">
                    {row.score}/{row.total}
                  </div>
                  <div className="text-[11px] text-muted">{row.durationFormatted}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line bg-bg2/60 px-4 py-2 text-xs font-semibold text-brand">
            <CheckCircle2 className="h-4 w-4" />
            <span>นับคะแนนจากโหมดสุ่ม 150 ข้อ คะแนนเท่ากันตัดสินจากเวลาที่ใช้น้อยกว่า</span>
          </div>
        </section>
      </main>
    </div>
  );
}

