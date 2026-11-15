'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, CheckCircle2, Clock, Sparkles, Target, X } from 'lucide-react';
import { SUBJECT_MAP, type SubjectKey } from '@/lib/constants';
import { SubjectIcon } from '@/components/SubjectIcon';

interface PassScorecase {
  id: string;
  trackKey: 'admin' | 'general' | 'soldier';
  trackLabel: string;
  examYear: string;
  totalScore: number;
  maxScore: number;
  generalPct: number;
  specificPct: number;
  durationUsed: string;
  strongestSubject: SubjectKey;
  highlight: string;
  strategy: string[];
  subjectScores: Array<{ subject: SubjectKey; score: number; total: number }>;
}

const PASS_SCORECARDS: PassScorecase[] = [
  {
    id: 'adm-01',
    trackKey: 'admin',
    trackLabel: 'สายอำนวยการ / พิสูจน์หลักฐาน',
    examYear: 'รอบสอบ 2568',
    totalScore: 132,
    maxScore: 150,
    generalPct: 85,
    specificPct: 89,
    durationUsed: '1:54 ชม.',
    strongestSubject: 'doc',
    highlight: 'เน้นเก็บเต็มงานสารบรรณ 30 ข้อ และคอมพิวเตอร์ 40 ข้อ ทำให้ภาคเฉพาะตำแหน่งดึงคะแนนรวมเกินเกณฑ์',
    strategy: [
      'ฝึกชุดแยกรายวิชา งานสารบรรณ + ลักษณะที่ 54 วันละ 1 ชุด (20 ข้อ) ต่อเนื่อง 3 สัปดาห์',
      'ใช้โหมดตัดช้อยส์ช่วยคัดคำตอบหลอกในวิชาภาษาไทยและอนุกรมคณิตศาสตร์',
      'ซ่อมข้อที่ตอบผิดจาก Mistake Notebook ทุกครั้งก่อนขึ้นชุดจำลองใหม่',
    ],
    subjectScores: [
      { subject: 'math', score: 17, total: 20 },
      { subject: 'thai', score: 17, total: 20 },
      { subject: 'com', score: 36, total: 40 },
      { subject: 'doc', score: 28, total: 30 },
      { subject: 'law', score: 22, total: 25 },
      { subject: 'eng', score: 12, total: 15 },
    ],
  },
  {
    id: 'gen-01',
    trackKey: 'general',
    trackLabel: 'ปราบปราม (บุคคลทั่วไป)',
    examYear: 'รอบสอบ 2568',
    totalScore: 124,
    maxScore: 150,
    generalPct: 78,
    specificPct: 85,
    durationUsed: '2:12 ชม.',
    strongestSubject: 'law',
    highlight: 'แยกฝึกวิชาสังคม-อาเซียน และกฎหมายอาญา/ป.วิ.อาญา ช่วยดันคะแนนภาคเฉพาะตำแหน่งสูงกว่าเกณฑ์ 60% ชัดเจน',
    strategy: [
      'เปิดโหมดฝึกซ้อมแยกรายวิชากฎหมายและสังคมเพื่อจำมาตราสำคัญกับเหตุการณ์ปัจจุบัน',
      'ทำชุดข้อสอบจำลอง 150 ข้อ แบบจับเวลาจริงสัปดาห์ละ 2 ชุด เพื่อฝึกบริหารเวลาให้ทัน 180 นาที',
      'เน้นโจทย์ภาษาอังกฤษส่วน Reading & Conversation จากคลังหัวข้อย่อย',
    ],
    subjectScores: [
      { subject: 'math', score: 23, total: 30 },
      { subject: 'thai', score: 20, total: 25 },
      { subject: 'com', score: 22, total: 25 },
      { subject: 'law', score: 18, total: 20 },
      { subject: 'eng', score: 23, total: 30 },
      { subject: 'soc', score: 18, total: 20 },
    ],
  },
  {
    id: 'sol-01',
    trackKey: 'soldier',
    trackLabel: 'ปราบปราม (ทหารเกณฑ์)',
    examYear: 'รอบสอบ 2568',
    totalScore: 121,
    maxScore: 150,
    generalPct: 76,
    specificPct: 83,
    durationUsed: '2:05 ชม.',
    strongestSubject: 'com',
    highlight: 'เน้นความแม่นยำในวิชากฎหมาย 30 ข้อ และคอมพิวเตอร์ 25 ข้อ ลดข้อผิดซ้ำจากคลังทบทวน',
    strategy: [
      'แบ่งรอบทำข้อสอบชุดละ 20 ข้อ แยกทีละวิชาในเวลาพัก ลดความล้าและจำเฉลยได้แม่นยำ',
      'ติดดาวข้อโจทย์ตารางและเงื่อนไขสัญลักษณ์ไว้กลับมาคำนวณซ้ำ',
      'เช็กผลคะแนนแบบแยก 2 ภาคหลังส่งทุกชุดเพื่อดูว่าภาคไหนต่ำกว่า 60%',
    ],
    subjectScores: [
      { subject: 'math', score: 19, total: 25 },
      { subject: 'thai', score: 19, total: 25 },
      { subject: 'com', score: 23, total: 25 },
      { subject: 'law', score: 26, total: 30 },
      { subject: 'eng', score: 18, total: 25 },
      { subject: 'soc', score: 16, total: 20 },
    ],
  },
  {
    id: 'adm-02',
    trackKey: 'admin',
    trackLabel: 'สายอำนวยการ / พิสูจน์หลักฐาน',
    examYear: 'รอบฝึกเข้มข้น',
    totalScore: 138,
    maxScore: 150,
    generalPct: 90,
    specificPct: 93,
    durationUsed: '1:41 ชม.',
    strongestSubject: 'com',
    highlight: 'ทำครบทั้ง 15 ชุดจำลองและเก็บชุดแยกรายวิชาคอมพิวเตอร์ครบทุกชุด ทำให้ทำความเร็วเฉลี่ยข้อละไม่ถึง 40 วินาที',
    strategy: [
      'ตั้งเป้าทำข้อสอบเฉพาะวิชาคอมพิวเตอร์ 40 ข้อใน 20 นาที เพื่อเหลือเวลาคิดคณิตศาสตร์',
      'เช็กความเข้าใจเรื่องระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณและลักษณะที่ 54 แบบเจาะรายบท',
      'ฝึกโหมดจับเวลาจริงครบ 150 ข้อโดยไม่ข้ามการตรวจเฉลยละเอียด',
    ],
    subjectScores: [
      { subject: 'math', score: 18, total: 20 },
      { subject: 'thai', score: 18, total: 20 },
      { subject: 'com', score: 38, total: 40 },
      { subject: 'doc', score: 28, total: 30 },
      { subject: 'law', score: 23, total: 25 },
      { subject: 'eng', score: 13, total: 15 },
    ],
  },
];

const TRACK_FILTERS: Array<{ key: 'all' | PassScorecase['trackKey']; label: string }> = [
  { key: 'all', label: 'ทุกสายสอบ' },
  { key: 'admin', label: 'อำนวยการ / พฐ.' },
  { key: 'general', label: 'ปราบปราม ทั่วไป' },
  { key: 'soldier', label: 'ปราบปราม ทหารเกณฑ์' },
];

export function ReviewSlider() {
  const [trackFilter, setTrackFilter] = useState<'all' | PassScorecase['trackKey']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visibleCards = useMemo(
    () => (trackFilter === 'all' ? PASS_SCORECARDS : PASS_SCORECARDS.filter((c) => c.trackKey === trackFilter)),
    [trackFilter]
  );

  const selectedCard = useMemo(
    () => PASS_SCORECARDS.find((c) => c.id === selectedId) || null,
    [selectedId]
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TRACK_FILTERS.map((tf) => (
          <button
            key={tf.key}
            type="button"
            onClick={() => setTrackFilter(tf.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              trackFilter === tf.key
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-panel text-muted hover:border-brand/50 hover:text-ink'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleCards.map((item) => {
          const pct = Math.round((item.totalScore / item.maxScore) * 100);
          const strongMeta = SUBJECT_MAP[item.strongestSubject];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="card-hover flex flex-col justify-between rounded-card border border-line bg-panel p-5 text-left shadow-card transition-all"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                    <Award className="h-3.5 w-3.5" />
                    <span>{item.trackLabel}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-muted">{item.examYear}</span>
                </div>

                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted">คะแนนรวมสอบผ่านเกณฑ์ 2 ภาค</div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="font-mono text-3xl font-extrabold text-ink">
                        {item.totalScore}
                      </span>
                      <span className="font-mono text-sm font-bold text-muted">/ {item.maxScore} ข้อ ({pct}%)</span>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-bg2 px-2.5 py-1 font-mono text-xs font-bold text-ink">
                    <Clock className="h-3.5 w-3.5 text-brand" />
                    <span>{item.durationUsed}</span>
                  </div>
                </div>

                {/* 2-Part Threshold Bars */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-bg2/60 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted">ภาคทั่วไป (≥ 60%)</span>
                      <span className="font-mono text-teal-ink">{item.generalPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${item.generalPct}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg2/60 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-muted">เฉพาะตำแหน่ง (≥ 60%)</span>
                      <span className="font-mono text-brand">{item.specificPct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${item.specificPct}%` }} />
                    </div>
                  </div>
                </div>

                <p className="mt-3.5 text-xs leading-relaxed text-muted">{item.highlight}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <SubjectIcon subjectKey={item.strongestSubject} size="sm" />
                  <span>วิชาดึงคะแนน: {strongMeta?.shortName}</span>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-brand">
                  <span>ดูสัดส่วนคะแนน</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCard && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-card border border-line bg-panel p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                  <Target className="h-4 w-4" />
                  <span>{selectedCard.trackLabel}</span>
                </div>
                <h3 className="mt-1 text-xl font-extrabold text-ink">
                  สรุปผล {selectedCard.totalScore}/{selectedCard.maxScore} ข้อ · แนวทางฝึกซ้อม
                </h3>
              </div>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1.5 text-muted hover:bg-bg2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {selectedCard.subjectScores.map((row) => {
                const m = SUBJECT_MAP[row.subject];
                const subPct = Math.round((row.score / row.total) * 100);
                return (
                  <div key={row.subject} className="rounded-xl border border-line bg-bg2/60 p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 text-ink">
                        <SubjectIcon subjectKey={row.subject} size="sm" />
                        <span>{m.name}</span>
                      </div>
                      <span className="font-mono text-ink">
                        {row.score}/{row.total} ({subPct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-panel">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${subPct}%`, backgroundColor: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-teal/35 bg-teal/5 p-4">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-ink">
                <Sparkles className="h-4 w-4" />
                <span>แผนฝึกทำข้อสอบที่ใช้ได้ผลจริง</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">
                {selectedCard.strategy.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-ink" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                href={`/exam/subject-${selectedCard.strongestSubject}?set=1&count=20&mode=practice&fresh=1`}
                onClick={() => setSelectedId(null)}
                className="inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark"
              >
                <span>ลองฝึกวิชา {SUBJECT_MAP[selectedCard.strongestSubject]?.shortName}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
