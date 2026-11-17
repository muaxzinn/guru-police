'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  MessageSquarePlus,
  Send,
} from 'lucide-react';
import type { ReportRecord } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';

const SYSTEM_REASONS = [
  'พบข้อผิดพลาดในการแสดงผลหน้าเว็บ / มือถือ',
  'ระบบจับเวลา หรือส่งคำตอบทำงานผิดปกติ',
  'รูปภาพหรือเฉลยข้อสอบโหลดไม่ขึ้น',
  'ปัญหาเกี่ยวกับโค้ดพรีเมียม / รอบสอบฟรี',
  'ข้อเสนอแนะฟีเจอร์เพิ่มเติม',
];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [category, setCategory] = useState<'system' | 'question'>('system');
  const [questionId, setQuestionId] = useState('');
  const [reason, setReason] = useState(SYSTEM_REASONS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          question_id: category === 'question' && questionId ? Number(questionId) : null,
          question_text: category === 'question' && questionId ? `รหัสข้อสอบ #${questionId}` : 'รายงานปัญหาระบบ',
          reason,
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งรายงานได้');
      }
      setReports((prev) => [data.report, ...prev]);
      setNote('');
      setQuestionId('');
      setFeedback({ type: 'ok', msg: 'บันทึกรายงานของคุณเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด' });
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งรายงาน',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-16">
      <SiteHeader mode="app" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-7 space-y-6">
        <div className="border-b border-line pb-5">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5 sm:text-3xl">
            <Flag className="w-6 h-6 text-accent shrink-0" />
            <span>แจ้งปัญหาการใช้งานและข้อผิดพลาดของข้อสอบ</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            ติดตามสถานะรายงานที่ส่งไว้ และแจ้งปัญหาใหม่ให้ทีมตรวจสอบ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Column */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-panel border border-line rounded-card p-6 shadow-card space-y-4"
          >
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-brand" />
              <span>ส่งรายงานปัญหาใหม่</span>
            </h2>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-bg2 border border-line text-xs font-bold">
              <button
                type="button"
                onClick={() => setCategory('system')}
                className={`py-2 rounded-lg transition ${
                  category === 'system' ? 'bg-panel text-brand shadow-sm' : 'text-muted'
                }`}
              >
                แจ้งปัญหาระบบ
              </button>
              <button
                type="button"
                onClick={() => setCategory('question')}
                className={`py-2 rounded-lg transition ${
                  category === 'question' ? 'bg-panel text-brand shadow-sm' : 'text-muted'
                }`}
              >
                แจ้งโจทย์/เฉลยผิด
              </button>
            </div>

            {category === 'question' && (
              <div>
                <label className="text-xs font-bold text-muted block mb-1.5">
                  รหัสข้อสอบ (#ID) ที่พบปัญหา
                </label>
                <input
                  type="number"
                  value={questionId}
                  onChange={(e) => setQuestionId(e.target.value)}
                  placeholder="เช่น 4125"
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm focus:outline-none focus:border-brand"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted block mb-1.5">หัวข้อปัญหา</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
              >
                {SYSTEM_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted block mb-1.5">
                รายละเอียด {category === 'system' && '(อย่างน้อย 10 ตัวอักษร)'}
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="อธิบายอาการที่พบ หน้าเว็บที่ใช้ หรือเหตุผลที่ควรแก้ไข..."
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'ok'
                    ? 'bg-teal/10 border-teal/30 text-teal-ink'
                    : 'bg-accent/10 border-accent/30 text-accent'
                }`}
              >
                {feedback.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-btn bg-brand hover:bg-brand-dark text-white font-extrabold text-sm flex items-center justify-center gap-2 transition"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>ส่งรายงาน</span>
            </button>
          </form>

          {/* List Column */}
          <section className="lg:col-span-7 bg-panel border border-line rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold">ประวัติรายงานทั้งหมด ({reports.length})</h2>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              </div>
            ) : reports.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">ยังไม่มีรายงานปัญหาในระบบ</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl border border-line bg-bg2/60 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            rep.status === 'resolved'
                              ? 'bg-teal/15 text-teal-ink'
                              : 'bg-gold/20 text-gold-ink'
                          }`}
                        >
                          {rep.status === 'resolved' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{rep.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอตรวจสอบ'}</span>
                        </span>
                        <span className="text-xs font-mono text-muted">
                          #{rep.id} · {rep.category === 'question' ? `ข้อ #${rep.questionId || '-'}` : 'ระบบ'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        {new Date(rep.createdAt).toLocaleString('th-TH')}
                      </span>
                    </div>

                    <p className="text-sm font-bold">{rep.reason}</p>
                    {rep.questionText && (
                      <p className="text-xs text-muted line-clamp-2">{rep.questionText}</p>
                    )}
                    {rep.note && (
                      <p className="text-xs bg-panel border border-line rounded-xl px-3 py-2 text-ink/90">
                        {rep.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

