'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Play,
  Search,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SubjectIcon } from '@/components/SubjectIcon';
import { ImageLightbox } from '@/components/ImageLightbox';
import { CHOICE_LABELS, SUBJECT_MAP, SUBJECTS, type SubjectKey } from '@/lib/constants';
import type { QuestionRecord } from '@/lib/server-db';

interface TopicOption {
  title: string;
  subjectKey: SubjectKey;
  count: number;
}

const IMAGE_PAT = /^(https?:\/\/|\/question-images\/)\S+\.(png|jpe?g|webp|gif)/i;

export default function QuestionBankPage() {
  const [subject, setSubject] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [batch, setBatch] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [hasImage, setHasImage] = useState(false);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<QuestionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [batches, setBatches] = useState<Array<{ batch: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.bookmarks) setBookmarks(d.profile.bookmarks);
      })
      .catch(() => {});
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (topic) params.set('topic', topic);
    if (batch) params.set('batch', batch);
    if (query.trim()) params.set('q', query.trim());
    if (hasImage) params.set('hasImage', '1');
    params.set('page', String(page));
    params.set('limit', '15');

    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setTopics(data.topics || []);
      setBatches(data.batches || []);
    } finally {
      setLoading(false);
    }
  }, [subject, topic, batch, query, hasImage, page]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadQuestions();
    }, 180);
    return () => clearTimeout(t);
  }, [loadQuestions]);

  const toggleBookmark = async (qid: number) => {
    setBookmarks((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggleBookmarkId: qid }),
    }).catch(() => {});
  };

  const buildTopicDrillHref = () => {
    const p = new URLSearchParams();
    if (subject) p.set('subject', subject);
    if (topic) p.set('topic', topic);
    p.set('mode', 'practice');
    p.set('count', '30');
    return `/exam/topic?${p.toString()}`;
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="app" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand">
              <Database className="h-4 w-4" />
              <span>คลังข้อสอบเชิงลึก · 7,038 ข้อ</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              ค้นหาและเจาะลึกข้อสอบ 132 หัวข้อ
            </h1>
          </div>

          {(subject || topic) && (
            <Link
              href={buildTopicDrillHref()}
              className="inline-flex items-center gap-2 rounded-btn bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark"
            >
              <Play className="h-3.5 w-3.5" />
              <span>ฝึกทำเฉพาะหัวข้อที่กรองอยู่ (สูงสุด 30 ข้อ)</span>
            </Link>
          )}
        </div>

        {/* Filter Bar */}
        <section className="mt-5 rounded-card border border-line bg-panel p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาคำถาม ตัวเลือก คำอธิบาย หรือ ID ข้อสอบ..."
                className="w-full rounded-xl border border-line bg-bg2/60 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand"
              />
            </div>

            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic('');
                setPage(1);
              }}
              className="rounded-xl border border-line bg-bg2/60 px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">ทุกรายวิชา (7 วิชา)</option>
              {SUBJECTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-line bg-bg2/60 px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">ทุกหัวข้อย่อย ({topics.length} หัวข้อ)</option>
              {topics.map((t) => (
                <option key={`${t.subjectKey}-${t.title}`} value={t.title}>
                  {t.title} ({t.count})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={batch}
                onChange={(e) => {
                  setBatch(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-line bg-bg2/60 px-3 py-1.5 text-xs font-semibold outline-none focus:border-brand"
              >
                <option value="">ทุกชุดนำเข้า</option>
                {batches.map((b) => (
                  <option key={b.batch} value={b.batch}>
                    {b.batch} ({b.count})
                  </option>
                ))}
              </select>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-bg2/60 px-3 py-1.5 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={hasImage}
                  onChange={(e) => {
                    setHasImage(e.target.checked);
                    setPage(1);
                  }}
                />
                <ImageIcon className="h-3.5 w-3.5 text-brand" />
                <span>เฉพาะข้อที่มีรูปภาพ</span>
              </label>
            </div>

            <div className="font-mono text-xs text-muted">
              พบ <span className="font-bold text-ink">{total.toLocaleString()}</span> ข้อ · หน้า {page}/{totalPages}
            </div>
          </div>
        </section>

        {/* Questions List */}
        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-card border border-line bg-panel p-10 text-center text-sm text-muted">
              กำลังโหลดข้อมูลข้อสอบ…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-card border border-line bg-panel p-10 text-center text-sm text-muted">
              ไม่พบข้อสอบที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            items.map((q) => {
              const revealed = Boolean(revealedIds[q.id]);
              const bookmarked = bookmarks.includes(q.id);
              const meta = SUBJECT_MAP[q.subject_key];

              return (
                <article
                  key={q.id}
                  className="rounded-card border border-line bg-panel p-5 shadow-card"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SubjectIcon subjectKey={q.subject_key} size="sm" />
                      <span className="text-xs font-bold text-ink">{meta?.name || q.subject_key}</span>
                      {q.title && (
                        <span className="rounded-full bg-bg2 px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                          {q.title}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-muted">#{q.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(q.id)}
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-bold transition-colors ${
                          bookmarked
                            ? 'border-gold bg-gold/15 text-gold-ink'
                            : 'border-line text-muted hover:text-ink'
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                        <span>{bookmarked ? 'ติดดาวแล้ว' : 'ติดดาว'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setRevealedIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand"
                      >
                        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{revealed ? 'ซ่อนเฉลย' : 'ดูเฉลย'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 font-exam text-[16px] leading-relaxed text-ink">
                    {q.stem && IMAGE_PAT.test(q.stem.trim()) ? (
                      <ImageLightbox src={q.stem.trim()} alt={`ภาพโจทย์ #${q.id}`} />
                    ) : (
                      <p className="whitespace-pre-wrap">{q.stem}</p>
                    )}
                    {q.img && (
                      <div className="mt-3">
                        <ImageLightbox src={q.img} alt={`ภาพประกอบ #${q.id}`} />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.opts.map((opt, idx) => {
                      const isCorrect = revealed && idx === q.correct_index;
                      const optImg = q.opt_imgs?.[idx];
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                            isCorrect
                              ? 'border-teal bg-teal/15 font-bold text-ink'
                              : 'border-line bg-bg2/40 text-ink'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              isCorrect ? 'bg-teal-ink text-white' : 'bg-line text-muted'
                            }`}
                          >
                            {CHOICE_LABELS[idx] || idx + 1}
                          </span>
                          <div className="min-w-0 font-exam">
                            {opt && IMAGE_PAT.test(opt.trim()) ? (
                              <ImageLightbox src={opt.trim()} alt={`ตัวเลือก ${CHOICE_LABELS[idx]}`} className="max-h-24 rounded-lg bg-white" />
                            ) : (
                              <span>{opt}</span>
                            )}
                            {optImg && (
                              <div className="mt-1">
                                <ImageLightbox src={optImg} alt={`ภาพตัวเลือก ${CHOICE_LABELS[idx]}`} className="max-h-24 rounded-lg bg-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {revealed && (
                    <div className="mt-3 rounded-2xl border border-teal/35 bg-teal/10 p-3.5 text-sm">
                      <div className="font-bold text-teal-ink">
                        เฉลยข้อ {q.correct_label}
                      </div>
                      {q.explanation && (
                        <div className="mt-1 whitespace-pre-wrap font-exam leading-relaxed text-ink">
                          {IMAGE_PAT.test(q.explanation.trim()) ? (
                            <ImageLightbox src={q.explanation.trim()} alt="ภาพคำอธิบายเฉลย" />
                          ) : (
                            q.explanation
                          )}
                        </div>
                      )}
                      {q.explanation_img && (
                        <div className="mt-2">
                          <ImageLightbox src={q.explanation_img} alt="ภาพประกอบคำอธิบาย" />
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-panel px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>ก่อนหน้า</span>
          </button>
          <span className="font-mono text-xs font-bold text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-panel px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            <span>ถัดไป</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

