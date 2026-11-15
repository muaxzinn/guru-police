'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Flag, Loader2, RotateCcw } from 'lucide-react';
import type { ReportRecord } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminSubNav } from '@/components/AdminSubNav';

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const toggleStatus = async (rep: ReportRecord) => {
    const nextStatus = rep.status === 'resolved' ? 'open' : 'resolved';
    const res = await fetch('/api/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rep.id, status: nextStatus }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((r) => (r.id === rep.id ? { ...r, status: nextStatus } : r)));
    }
  };

  const filtered = reports.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />
      <AdminSubNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
              <Flag className="w-6 h-6 text-accent" />
              <span>คิวตรวจรับรายงานปัญหา ({reports.length})</span>
            </h1>
            <p className="text-sm text-muted mt-1">
              คัดกรองรายการแจ้งโจทย์คลาดเคลื่อน หรือปัญหาระบบ และเปลี่ยนสถานะเมื่อดำเนินการแล้ว
            </p>
          </div>

          <div className="flex gap-1.5 p-1 rounded-xl bg-panel border border-line text-xs font-bold">
            {(
              [
                ['all', 'ทั้งหมด'],
                ['open', 'รอตรวจสอบ'],
                ['resolved', 'แก้ไขแล้ว'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filter === k ? 'bg-brand text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <section className="space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-panel border border-line rounded-card p-10 text-center text-sm text-muted">
              ไม่มีรายการรายงานในตัวกรองนี้
            </div>
          ) : (
            filtered.map((rep) => (
              <div
                key={rep.id}
                className="bg-panel border border-line rounded-card p-5 shadow-card flex flex-wrap items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-[260px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        rep.status === 'resolved'
                          ? 'bg-teal/15 text-teal-ink'
                          : 'bg-gold/20 text-gold-ink'
                      }`}
                    >
                      {rep.status === 'resolved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{rep.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอตรวจสอบ'}</span>
                    </span>
                    <span className="text-xs font-mono text-muted">
                      Report #{rep.id} · {rep.category === 'question' ? `ข้อสอบ #${rep.questionId}` : 'ปัญหาระบบ'}
                    </span>
                    <span className="text-xs font-mono text-muted">
                      {new Date(rep.createdAt).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold">{rep.reason}</h2>
                  {rep.questionText && <p className="text-xs text-muted">{rep.questionText}</p>}
                  {rep.note && (
                    <p className="text-sm bg-bg2 border border-line rounded-xl px-3.5 py-2">{rep.note}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleStatus(rep)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-btn text-xs font-extrabold transition shrink-0 ${
                    rep.status === 'resolved'
                      ? 'border border-line bg-bg2 text-muted hover:text-ink'
                      : 'bg-teal text-white hover:opacity-90'
                  }`}
                >
                  {rep.status === 'resolved' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>เปิดเคสอีกครั้ง</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ทำเครื่องหมายว่าแก้ไขแล้ว</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

