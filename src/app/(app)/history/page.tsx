'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  History,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { AttemptRecord, ExamProgressRecord } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [progress, setProgress] = useState<ExamProgressRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, progRes] = await Promise.all([
        fetch('/api/attempts', { cache: 'no-store' }),
        fetch('/api/progress', { cache: 'no-store' }),
      ]);
      if (attRes.ok) {
        const d = await attRes.json();
        setAttempts(d.attempts || []);
      }
      if (progRes.ok) {
        const p = await progRes.json();
        setProgress(p.progress || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearSavedProgress = async () => {
    try {
      window.localStorage.removeItem('gp:progress:v2');
    } catch {
      // ignore
    }
    await fetch('/api/progress', { method: 'DELETE' });
    setProgress(null);
  };

  const stats = useMemo(() => {
    const count = attempts.length;
    if (count === 0) return { count: 0, avgPct: 0, bestPct: 0, passCount: 0 };
    const totalPct = attempts.reduce((acc, a) => acc + a.pct, 0);
    const bestPct = Math.max(...attempts.map((a) => a.pct));
    const passCount = attempts.filter((a) => a.passed).length;
    return {
      count,
      avgPct: Math.round(totalPct / count),
      bestPct,
      passCount,
    };
  }, [attempts]);

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
              <History className="w-6 h-6 text-brand" />
              <span>ประวัติการทำข้อสอบและแนวโน้มคะแนน</span>
            </h1>
            <p className="text-sm text-muted mt-1">
              ติดตามพัฒนาการคะแนนสอบทุกครั้ง พร้อมทบทวนข้อที่ผิดและทำต่อจากที่ค้างไว้
            </p>
          </div>
          <Link
            href="/catalog/form"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-brand hover:bg-brand-dark text-white font-bold text-sm"
          >
            <Play className="w-4 h-4" />
            <span>ทำข้อสอบชุดใหม่</span>
          </Link>
        </div>

        {/* Summary KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-panel border border-line rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs font-bold text-muted">
              <span>จำนวนครั้งที่สอบ</span>
              <FileText className="w-4 h-4 text-brand" />
            </div>
            <p className="text-3xl font-extrabold font-mono mt-2">{stats.count}</p>
            <p className="text-xs text-muted mt-1">ชุดที่ส่งตรวจแล้ว</p>
          </div>

          <div className="bg-panel border border-line rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs font-bold text-muted">
              <span>คะแนนเฉลี่ยรวม</span>
              <BarChart3 className="w-4 h-4 text-teal-ink" />
            </div>
            <p className="text-3xl font-extrabold font-mono mt-2 text-teal-ink">{stats.avgPct}%</p>
            <p className="text-xs text-muted mt-1">เป้าหมายแนะนำ 60%+</p>
          </div>

          <div className="bg-panel border border-line rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs font-bold text-muted">
              <span>สถิติสูงสุด</span>
              <TrendingUp className="w-4 h-4 text-gold-ink" />
            </div>
            <p className="text-3xl font-extrabold font-mono mt-2">{stats.bestPct}%</p>
            <p className="text-xs text-muted mt-1">คะแนนสูงสุดที่ทำได้</p>
          </div>

          <div className="bg-panel border border-line rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between text-xs font-bold text-muted">
              <span>สอบผ่านเกณฑ์</span>
              <Award className="w-4 h-4 text-brand" />
            </div>
            <p className="text-3xl font-extrabold font-mono mt-2">
              {stats.passCount}/{stats.count}
            </p>
            <p className="text-xs text-muted mt-1">ผ่านเกณฑ์ 60% ทั้งสองภาค</p>
          </div>
        </section>

        {/* Saved In-Progress Resume Card */}
        {progress && progress.list?.length > 0 && (
          <section className="p-5 sm:p-6 rounded-card border-2 border-gold/60 bg-gold/10 shadow-card flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="badge-gold">มีข้อสอบที่ทำค้างไว้</span>
              <h2 className="text-lg font-extrabold pt-1">
                ชุดข้อสอบ #{progress.setId} ({progress.mode === 'real' ? 'โหมดจับเวลาจริง' : 'โหมดฝึกซ้อม'})
              </h2>
              <p className="text-sm text-muted">
                ตอบไปแล้ว {progress.answers.filter((a) => a !== null).length} / {progress.list.length} ข้อ · อัปเดตเมื่อ{' '}
                {new Date(progress.updatedAt).toLocaleString('th-TH')}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={clearSavedProgress}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-btn border border-line bg-panel text-xs font-bold text-muted hover:text-accent"
              >
                <Trash2 className="w-4 h-4" />
                <span>ล้างรายการค้าง</span>
              </button>
              <Link
                href={`/exam/${encodeURIComponent(progress.setId)}?mode=${progress.mode}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-brand hover:bg-brand-dark text-white font-extrabold text-sm"
              >
                <Play className="w-4 h-4" />
                <span>ทำข้อสอบต่อ</span>
              </Link>
            </div>
          </section>
        )}

        {/* Attempts List */}
        <section className="bg-panel border border-line rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">รายการผลสอบที่ผ่านมา</h2>
            <Link
              href="/exam/mistakes?fresh=1"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-accent hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ทวนข้อที่เคยตอบผิดทั้งหมด</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="font-bold text-base">ยังไม่มีประวัติการทำข้อสอบ</p>
              <p className="text-sm text-muted">เริ่มทำข้อสอบเสมือนจริงชุดแรกเพื่อวิเคราะห์จุดแข็ง-จุดอ่อนของคุณ</p>
              <Link
                href="/exam/107?mode=practice&fresh=1"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-brand text-white text-sm font-bold"
              >
                <span>ลองทำชุดทดลองสอบ #107</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => {
                const mins = Math.floor(a.durationSec / 60);
                const secs = a.durationSec % 60;
                return (
                  <Link
                    key={a.id}
                    href={`/result/${a.id}`}
                    className="block p-4 sm:p-5 rounded-2xl border border-line bg-bg2/60 hover:border-brand/50 hover:bg-panel transition card-hover"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                              a.passed ? 'bg-teal/15 text-teal-ink' : 'bg-accent/15 text-accent'
                            }`}
                          >
                            {a.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>{a.passed ? 'ผ่านเกณฑ์' : 'ยังไม่ผ่าน'}</span>
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-panel border border-line text-muted">
                            {a.mode === 'real' ? 'จับเวลาจริง' : 'ฝึกซ้อม'}
                          </span>
                          <span className="text-xs font-mono text-muted">
                            {new Date(a.submittedAt).toLocaleString('th-TH')}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold truncate">{a.setTitle}</h3>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-extrabold font-mono text-brand">{a.pct}%</p>
                          <p className="text-xs text-muted font-mono">
                            {a.score}/{a.total} ข้อ ·{' '}
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {mins}:{String(secs).padStart(2, '0')}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

