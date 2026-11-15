'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, CheckCircle2, Clock, Loader2, Play, Plus } from 'lucide-react';
import { SUBJECTS, SUBJECT_MAP, TRACKS } from '@/lib/constants';
import type { ExamSetSummary } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminSubNav } from '@/components/AdminSubNav';

export default function AdminSetsPage() {
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<ExamSetSummary[]>([]);

  const [title, setTitle] = useState('');
  const [total, setTotal] = useState(25);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [subjectKey, setSubjectKey] = useState('');
  const [track, setTrack] = useState('สายอำนวยการ / พิสูจน์หลักฐาน');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSets(data.sets || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          total,
          timeMinutes,
          subjectKey: subjectKey || null,
          track: track || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'สร้างชุดข้อสอบไม่สำเร็จ');
      setSets((prev) => [...prev, data.set]);
      setTitle('');
      setNotice(`สร้างชุดข้อสอบ #${data.set.id} "${data.set.title}" เรียบร้อยแล้ว`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />
      <AdminSubNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-brand" />
            <span>จัดการชุดข้อสอบทั้งหมด ({sets.length} ชุด)</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            ตรวจสอบชุดข้อสอบมาตรฐาน 22 ชุด และสร้างชุดข้อสอบใหม่แบบกำหนดจำนวนข้อ/วิชาได้ทันที
          </p>
        </div>

        {notice && (
          <div className="p-3.5 rounded-2xl bg-teal/15 border border-teal/40 text-teal-ink text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create Set Form */}
          <form
            onSubmit={handleCreate}
            className="lg:col-span-4 bg-panel border border-line rounded-card p-6 shadow-card space-y-4"
          >
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand" />
              <span>สร้างชุดข้อสอบใหม่</span>
            </h2>

            <div>
              <label className="text-xs font-bold text-muted block mb-1">ชื่อชุดข้อสอบ</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น โค้งสุดท้าย ปราบปราม #1"
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">จำนวนข้อ (5-150)</label>
                <input
                  type="number"
                  min={5}
                  max={150}
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">เวลาสอบ (นาที)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted block mb-1">เจาะจงรายวิชา (ไม่เลือก = สุ่มทุกวิชา)</label>
              <select
                value={subjectKey}
                onChange={(e) => setSubjectKey(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
              >
                <option value="">คละทุกวิชา</option>
                {SUBJECTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted block mb-1">สายสอบ</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
              >
                {TRACKS.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-btn bg-brand hover:bg-brand-dark text-white font-extrabold text-sm flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>สร้างชุดข้อสอบ</span>
            </button>
          </form>

          {/* Sets Table */}
          <section className="lg:col-span-8 bg-panel border border-line rounded-card p-6 shadow-card space-y-4">
            <h2 className="text-base font-extrabold">รายการชุดข้อสอบในระบบ</h2>
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sets.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl border border-line bg-bg2/60 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-extrabold text-brand">SET #{s.id}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-panel border border-line text-muted">
                          {s.subjectKey ? SUBJECT_MAP[s.subjectKey]?.shortName : s.kind === 'form' ? '150 ข้อ/แบบฟอร์ม' : 'ชุดผสม'}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold mt-1">{s.title}</h3>
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{s.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs">
                      <span className="text-muted font-mono">
                        {s.total} ข้อ · <Clock className="w-3 h-3 inline mr-0.5" />
                        {s.timeMinutes} นาที
                      </span>
                      <Link
                        href={`/exam/${s.id}?mode=practice&fresh=1`}
                        className="inline-flex items-center gap-1 font-extrabold text-brand hover:underline"
                      >
                        <Play className="w-3.5 h-3.5" /> ทดสอบเปิด
                      </Link>
                    </div>
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
