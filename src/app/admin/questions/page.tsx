'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { CHOICE_LABELS, SUBJECTS, SUBJECT_MAP, type SubjectKey } from '@/lib/constants';
import type { QuestionRecord } from '@/lib/server-db';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminSubNav } from '@/components/AdminSubNav';

export default function AdminQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuestionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [hasImage, setHasImage] = useState(false);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState<SubjectKey>('law');
  const [newTitle, setNewTitle] = useState('');
  const [newStem, setNewStem] = useState('');
  const [newOpts, setNewOpts] = useState(['', '', '', '']);
  const [newCorrect, setNewCorrect] = useState(0);
  const [newExp, setNewExp] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (q.trim()) qs.set('q', q.trim());
      if (subject) qs.set('subject', subject);
      if (hasImage) qs.set('hasImage', '1');

      const res = await fetch(`/api/questions?${qs.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, subject, hasImage]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_key: newSubject,
          title: newTitle.trim() || 'เพิ่มโดยแอดมิน',
          stem: newStem,
          opts: newOpts,
          correct_index: newCorrect,
          explanation: newExp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      setShowAdd(false);
      setNewStem('');
      setNewOpts(['', '', '', '']);
      setNewExp('');
      setMsg(`เพิ่มข้อสอบรหัส #${data.question.id} เข้าคลังเรียบร้อยแล้ว`);
      setPage(1);
      loadQuestions();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />
      <AdminSubNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2.5">
              <Database className="w-6 h-6 text-brand" />
              <span>จัดการคลังข้อสอบทั้งหมด ({total.toLocaleString()} ข้อ)</span>
            </h1>
            <p className="text-sm text-muted mt-1">ค้นหา กรองรายวิชา ตรวจสอบเฉลย และเพิ่มข้อสอบใหม่</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-brand hover:bg-brand-dark text-white font-extrabold text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มข้อสอบใหม่</span>
          </button>
        </div>

        {msg && (
          <div className="p-3 rounded-2xl bg-teal/15 border border-teal/40 text-teal-ink text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Filter Bar */}
        <section className="bg-panel border border-line rounded-card p-4 shadow-card grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหารหัส ID, โจทย์, คำอธิบาย..."
              className="w-full rounded-xl border border-line bg-bg2 pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm focus:outline-none focus:border-brand"
            >
              <option value="">ทุกวิชาหลัก ({SUBJECTS.length} วิชา)</option>
              {SUBJECTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="md:col-span-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-bg2 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={hasImage}
              onChange={(e) => {
                setHasImage(e.target.checked);
                setPage(1);
              }}
              className="accent-brand"
            />
            <ImageIcon className="w-4 h-4 text-muted" />
            <span>เฉพาะข้อที่มีภาพประกอบ</span>
          </label>
        </section>

        {/* Questions Table */}
        <section className="bg-panel border border-line rounded-card shadow-card overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-brand" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg2/80 text-xs font-extrabold text-muted">
                    <th className="py-3 px-4 w-20">ID</th>
                    <th className="py-3 px-4 w-36">วิชา</th>
                    <th className="py-3 px-4">โจทย์คำถาม & หัวข้อ</th>
                    <th className="py-3 px-4 w-24">เฉลย</th>
                    <th className="py-3 px-4 w-28">Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-bg2/50">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-brand">#{item.id}</td>
                      <td className="py-3 px-4 text-xs font-bold">
                        {SUBJECT_MAP[item.subject_key]?.shortName || item.subject_key}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-exam font-medium line-clamp-2">{item.stem}</p>
                        {item.title && <p className="text-xs text-muted mt-0.5">{item.title}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal/15 text-teal-ink text-xs font-extrabold">
                          {item.correct_label || CHOICE_LABELS[item.correct_index]}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-muted">{item.batch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-line flex items-center justify-between text-xs font-bold">
            <span className="text-muted">
              หน้า {page} จาก {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-bg2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-bg2 disabled:opacity-40"
              >
                ถัดไป <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Add Question Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="bg-panel border border-line rounded-card max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">เพิ่มข้อสอบใหม่เข้าคลัง</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="p-1.5 text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">รายวิชา</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value as SubjectKey)}
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted block mb-1">ชื่อหัวข้อย่อย</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="เช่น กฎหมายอาญา มาตราสำคัญ"
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted block mb-1">คำถาม / โจทย์</label>
              <textarea
                rows={3}
                required
                value={newStem}
                onChange={(e) => setNewStem(e.target.value)}
                className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {newOpts.map((val, idx) => (
                <div key={idx}>
                  <label className="text-xs font-bold text-muted block mb-1">
                    ตัวเลือก {CHOICE_LABELS[idx]}
                  </label>
                  <input
                    type="text"
                    required
                    value={val}
                    onChange={(e) => {
                      const next = newOpts.slice();
                      next[idx] = e.target.value;
                      setNewOpts(next);
                    }}
                    className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted block mb-1">ข้อที่ถูกต้อง</label>
                <select
                  value={newCorrect}
                  onChange={(e) => setNewCorrect(Number(e.target.value))}
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
                >
                  {CHOICE_LABELS.map((lbl, idx) => (
                    <option key={lbl} value={idx}>
                      ข้อ {lbl}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-muted block mb-1">คำอธิบายเฉลย</label>
                <input
                  type="text"
                  value={newExp}
                  onChange={(e) => setNewExp(e.target.value)}
                  placeholder="เหตุผลประกอบเฉลย..."
                  className="w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-btn border border-line text-sm font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-btn bg-brand text-white text-sm font-extrabold flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>บันทึกข้อสอบ</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
