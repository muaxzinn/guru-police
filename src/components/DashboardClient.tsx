'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Award,
  Bookmark,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Database,
  Download,
  Flame,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CountdownCard } from '@/components/Countdown';
import { SubjectIcon } from '@/components/SubjectIcon';
import { StartExamModalButton } from '@/components/RedeemAndStartModals';
import { SUBJECT_MAP, TRACKS, type SubjectKey } from '@/lib/constants';
import { computePlayerStats } from '@/lib/gamification';
import type { AttemptRecord, ExamProgressRecord, RuntimeState, UserProfile } from '@/lib/server-db';

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
  const [todayIso, setTodayIso] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const currentTrackMeta = TRACKS.find((t) => t.name === selectedTrack) || TRACKS[0];

  const playerStats = useMemo(
    () =>
      computePlayerStats(
        attempts,
        profile.streakDays || 1,
        profile.mistakeIds || [],
        profile.bookmarks || [],
        todayIso
      ),
    [attempts, profile.streakDays, profile.mistakeIds, profile.bookmarks, todayIso]
  );

  useEffect(() => {
    setTodayIso(new Date().toISOString().slice(0, 10));
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

  const openSyncModal = () => {
    const payload = JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        profile,
        attempts,
        examProgress,
      },
      null,
      2
    );
    setSyncText(payload);
    setSyncNotice(null);
    setShowSyncModal(true);
  };

  const handleCopySync = async () => {
    try {
      await navigator.clipboard.writeText(syncText);
      setSyncNotice('คัดลอกข้อมูลสำรองลงคลิปบอร์ดเรียบร้อยแล้ว สามารถนำไปวางในเครื่องอื่นได้ทันที');
    } catch {
      setSyncNotice('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณากดปุ่มดาวน์โหลดไฟล์ .json ด้านล่าง');
    }
  };

  const handleDownloadSync = () => {
    const blob = new Blob([syncText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guru-police-sync-${todayIso || 'backup'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSyncNotice('ดาวน์โหลดไฟล์สำรองข้อมูลเรียบร้อยแล้ว');
  };

  const handleImportSync = async (rawOverride?: string) => {
    const source = (rawOverride ?? syncText).trim();
    if (!source || syncLoading) return;
    setSyncLoading(true);
    setSyncNotice(null);
    try {
      const parsed = JSON.parse(source) as Partial<RuntimeState> & {
        profile?: Partial<UserProfile>;
      };
      if (!parsed || typeof parsed !== 'object' || (!parsed.profile && !Array.isArray(parsed.attempts))) {
        throw new Error('รูปแบบข้อมูลสำรองไม่ถูกต้อง');
      }

      const nextProfile: UserProfile = {
        ...profile,
        ...(parsed.profile || {}),
        bookmarks: Array.isArray(parsed.profile?.bookmarks)
          ? parsed.profile.bookmarks.map(Number)
          : profile.bookmarks,
        mistakeIds: Array.isArray(parsed.profile?.mistakeIds)
          ? parsed.profile.mistakeIds.map(Number)
          : profile.mistakeIds,
      };
      const nextAttempts = Array.isArray(parsed.attempts) ? parsed.attempts : attempts;
      const nextProgress =
        parsed.examProgress !== undefined ? parsed.examProgress : examProgress;

      try {
        const rawLocal = window.localStorage.getItem('gp:runtime:v2');
        const currentLocal = rawLocal ? (JSON.parse(rawLocal) as Partial<RuntimeState>) : {};
        window.localStorage.setItem(
          'gp:runtime:v2',
          JSON.stringify({
            ...currentLocal,
            profile: nextProfile,
            attempts: nextAttempts,
            examProgress: nextProgress,
          })
        );
      } catch {
        // ignore localStorage failure
      }

      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importSync: {
            profile: nextProfile,
            attempts: nextAttempts,
            examProgress: nextProgress,
          },
        }),
      }).catch(() => {});

      setProfile(nextProfile);
      setSelectedTrack(nextProfile.track);
      setLbTrack(nextProfile.track);
      setAttempts(nextAttempts);
      setExamProgress(nextProgress);
      setSyncNotice(`กู้คืนข้อมูลสำเร็จ (${nextAttempts.length} ประวัติการสอบ)`);
    } catch (err) {
      setSyncNotice(err instanceof Error ? err.message : 'นำเข้าข้อมูลไม่สำเร็จ กรุณาตรวจสอบไฟล์ JSON');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-10">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openSyncModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
            >
              <Upload className="h-3.5 w-3.5 text-brand" />
              <span>ซิงก์ข้อมูลข้ามเครื่อง</span>
            </button>
            <Link
              href="/catalog/subject"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
            >
              <Layers className="h-3.5 w-3.5 text-teal-ink" />
              <span>ชุดข้อสอบแยกรายวิชา</span>
            </Link>
            <Link
              href="/catalog/topics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-bg2 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
            >
              <BookOpenCheck className="h-3.5 w-3.5 text-brand" />
              <span>แยกหัวข้อย่อยรายวิชา</span>
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

        {/* Solo Cadet Rank, XP & Daily Missions */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 rounded-card border border-line bg-panel p-5 sm:p-6 shadow-card flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-muted">
                  <Award className="h-4 w-4 text-brand" />
                  <span>ยศและค่าประสบการณ์ส่วนตัว</span>
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-extrabold text-white"
                  style={{ backgroundColor: playerStats.rank.badgeColor }}
                >
                  {playerStats.rank.shortTitle}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-ink">{playerStats.rank.title}</h2>
                <p className="text-xs text-muted mt-1">
                  สะสมแล้ว{' '}
                  <strong className="font-mono text-ink">
                    {playerStats.xp.toLocaleString('en-US')} XP
                  </strong>
                  {playerStats.nextRank && (
                    <span>
                      {' '}
                      · อีก {(playerStats.nextRank.minXp - playerStats.xp).toLocaleString('en-US')} XP เลื่อนขั้นเป็น{' '}
                      {playerStats.nextRank.shortTitle}
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-bg2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${playerStats.levelProgressPct}%`,
                      backgroundColor: playerStats.rank.badgeColor,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                  <span>{playerStats.levelProgressPct}% สู่ขั้นถัดไป</span>
                  <span>{playerStats.nextRank ? playerStats.nextRank.title : 'ยศสูงสุด'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-line">
              <div className="rounded-xl bg-bg2 px-3 py-2">
                <div className="text-[11px] font-bold text-muted">ผ่านเกณฑ์ 60%+</div>
                <div className="font-mono text-base font-extrabold text-teal-ink mt-0.5">
                  {playerStats.passedCount} ครั้ง
                </div>
              </div>
              <div className="rounded-xl bg-bg2 px-3 py-2">
                <div className="text-[11px] font-bold text-muted">ความแม่นยำสะสม</div>
                <div className="font-mono text-base font-extrabold text-brand mt-0.5">
                  {playerStats.overallAccuracy}%
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-card border border-line bg-panel p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-ink flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold-ink" />
                <span>ภารกิจฝึกฝนประจำวัน</span>
              </h2>
              <span className="text-xs font-mono text-muted">
                สำเร็จแล้ว {playerStats.dailyMissions.filter((m) => m.done).length}/
                {playerStats.dailyMissions.length}
              </span>
            </div>

            <div className="space-y-3">
              {playerStats.dailyMissions.map((mission) => {
                const pct = Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100));
                return (
                  <div
                    key={mission.id}
                    className={`rounded-2xl border p-3.5 transition ${
                      mission.done ? 'border-teal/40 bg-teal/5' : 'border-line bg-bg2/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink truncate">{mission.title}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold-ink font-mono text-[11px] font-extrabold shrink-0">
                            +{mission.rewardXp} XP
                          </span>
                        </div>
                        <div className="text-xs font-mono text-muted mt-0.5">
                          ความคืบหน้า {mission.progress}/{mission.target}
                        </div>
                      </div>

                      {mission.done ? (
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-ink shrink-0">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>สำเร็จ</span>
                        </span>
                      ) : (
                        <Link
                          href={mission.href}
                          className="inline-flex items-center gap-1 rounded-xl bg-brand/10 hover:bg-brand hover:text-white px-3 py-1.5 text-xs font-extrabold text-brand transition shrink-0"
                        >
                          <span>ไปทำ</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-panel overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          mission.done ? 'bg-teal' : 'bg-brand'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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

        {/* Personal Weakness Diagnostic Card */}
        <section className="rounded-card border border-line bg-panel p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
                <Target className="h-5 w-5 text-accent" />
                <span>วิเคราะห์จุดอ่อนรายบุคคล — ไม่ถนัดอะไรบ้าง</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                จัดอันดับวิชาและหัวข้อย่อยที่คะแนนน้อยที่สุดจากประวัติการทำข้อสอบทั้งหมดของคุณ
              </p>
            </div>
            {profile.mistakeIds.length > 0 && (
              <Link
                href="/exam/mistakes?mode=practice&fresh=1"
                className="inline-flex items-center gap-1.5 rounded-btn bg-accent hover:bg-accent-dark px-3.5 py-2 text-xs font-extrabold text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>ซ่อมข้อผิดสะสม ({profile.mistakeIds.length} ข้อ)</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Weakest Subjects */}
            <div className="lg:col-span-5 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
                อันดับวิชาที่ควรเร่งเสริม
              </h3>
              {playerStats.weakestSubjects.slice(0, 4).map((s) => (
                <div
                  key={s.key}
                  className="rounded-2xl border border-line bg-bg2/60 p-3 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink truncate">{s.shortName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                          s.status === 'critical'
                            ? 'bg-accent/15 text-accent'
                            : s.status === 'warning'
                              ? 'bg-gold/20 text-gold-ink'
                              : 'bg-teal/15 text-teal-ink'
                        }`}
                      >
                        {s.status === 'critical'
                          ? 'ต้องซ่อมด่วน'
                          : s.status === 'warning'
                            ? 'ควรเสริม'
                            : 'แม่นยำ'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted mt-0.5">
                      {s.total > 0 ? `ถูก ${s.correct}/${s.total} ข้อ (${s.pct}%)` : 'ยังไม่มีสถิติวิชานี้'}
                    </p>
                  </div>
                  <Link
                    href={`/exam/subject-${encodeURIComponent(s.key)}?set=1&count=20&mode=practice&fresh=1`}
                    className="px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand hover:text-white text-brand text-xs font-extrabold shrink-0 transition"
                  >
                    ฝึกซ่อม
                  </Link>
                </div>
              ))}
            </div>

            {/* Weakest Sub-Topics */}
            <div className="lg:col-span-7 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
                หัวข้อย่อยที่พลาดบ่อย (6 อันดับแรก)
              </h3>
              {playerStats.weakestTopics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-bg2/40 p-6 text-center space-y-3">
                  <p className="text-sm font-bold text-ink">
                    ยังไม่มีข้อมูลหัวข้อจุดอ่อนพอสำหรับจัดอันดับ
                  </p>
                  <p className="text-xs text-muted">
                    ลองทำข้อสอบและส่งคำตอบอย่างน้อย 1 ชุด (แนะนำเลือกโหมดเฉลยย้อนหลัง) เพื่อดูหัวข้อที่ยังไม่ถนัด
                  </p>
                  <Link
                    href="/catalog/form"
                    className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2 text-xs font-extrabold text-white"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>เริ่มทำข้อสอบวัดจุดอ่อน</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {playerStats.weakestTopics.slice(0, 6).map((t, idx) => (
                    <div
                      key={`${t.subjectKey}-${t.title}-${idx}`}
                      className="rounded-2xl border border-line bg-bg2/60 p-3 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-brand truncate">{t.subjectShortName}</span>
                          <span
                            className={`font-mono font-extrabold ${
                              t.pct < 60 ? 'text-accent' : 'text-teal-ink'
                            }`}
                          >
                            {t.pct}% ({t.correct}/{t.total})
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-ink line-clamp-2">{t.title}</p>
                      </div>
                      <Link
                        href={`/exam/topic?subject=${encodeURIComponent(t.subjectKey)}&topic=${encodeURIComponent(t.title)}&count=20&mode=practice&fresh=1`}
                        className="inline-flex items-center justify-center gap-1 w-full py-1.5 rounded-xl bg-brand/10 hover:bg-brand hover:text-white text-brand text-xs font-extrabold transition"
                      >
                        <span>เจาะฝึกบทนี้</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Personal Cross-Device Sync & Backup Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-card max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-ink">ซิงก์และสำรองข้อมูลส่วนตัวข้ามเครื่อง</h3>
                <p className="text-xs text-muted mt-1">
                  คัดลอกโค้ด JSON หรือบันทึกไฟล์เก็บไว้เพื่อย้ายประวัติคะแนน ข้อที่ผิด และข้อติดดาวไปเปิดบนมือถือหรือคอมเครื่องอื่นได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="p-1.5 rounded-xl text-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopySync}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-brand text-white text-xs font-extrabold hover:bg-brand-dark transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอก JSON</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSync}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn border border-line bg-bg2 text-ink text-xs font-bold hover:border-brand/50 transition"
              >
                <Download className="w-3.5 h-3.5 text-brand" />
                <span>ดาวน์โหลดไฟล์ .json</span>
              </button>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn border border-line bg-bg2 text-ink text-xs font-bold hover:border-brand/50 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-teal-ink" />
                <span>อัปโหลดไฟล์เพื่อนำเข้า</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const content = String(reader.result || '');
                      setSyncText(content);
                      void handleImportSync(content);
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted block">
                ข้อมูล JSON (วางโค้ดที่คัดลอกจากเครื่องเดิมแล้วกดนำเข้าได้ทันที)
              </label>
              <textarea
                rows={7}
                value={syncText}
                onChange={(e) => setSyncText(e.target.value)}
                className="w-full rounded-2xl border border-line bg-bg2 px-3 py-2.5 font-mono text-xs text-ink focus:outline-none focus:border-brand"
              />
            </div>

            {syncNotice && (
              <div className="rounded-xl border border-brand/30 bg-brand/5 px-3.5 py-2 text-xs font-bold text-ink">
                {syncNotice}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 rounded-btn border border-line text-sm font-bold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                disabled={syncLoading || !syncText.trim()}
                onClick={() => void handleImportSync()}
                className="px-5 py-2 rounded-btn bg-teal hover:opacity-90 text-white text-sm font-extrabold disabled:opacity-50"
              >
                {syncLoading ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูลจากข้อความนี้'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

