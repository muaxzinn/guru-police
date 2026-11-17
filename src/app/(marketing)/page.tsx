import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  Layers,
  Newspaper,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { CountdownCard } from '@/components/Countdown';
import { ReviewSlider } from '@/components/ReviewSlider';
import { SubjectIcon } from '@/components/SubjectIcon';
import { SUBJECT_MAP, TRACKS, type SubjectKey } from '@/lib/constants';
import { getAllQuestionsMerged, getStore } from '@/lib/server-db';

const FAQS = [
  {
    q: 'ใช้งานได้เลยไหม ต้องสมัครสมาชิกหรือเข้าสู่ระบบหรือเปล่า?',
    a: 'เข้าใช้งานได้ทันทีโดยไม่ต้องสมัครสมาชิกหรือเข้าสู่ระบบ สามารถทำข้อสอบจำลองครบ 15 ชุด ชุดข้อสอบแยกรายวิชา 7 วิชา เจาะลึก 132 หัวข้อย่อย และดูคลัง 7,038 ข้อได้ฟรีทั้งหมด',
  },
  {
    q: 'ข้อสอบมีกี่แบบ ครอบคลุมสายงานไหนบ้าง?',
    a: 'ครบทั้ง 3 สายสอบหลักของสำนักงานตำรวจแห่งชาติ: สายอำนวยการ / พิสูจน์หลักฐาน, ปราบปราม (บุคคลทั่วไป) และปราบปราม (ทหารเกณฑ์) แบ่งฝึกได้ทั้งโหมดสุ่มครบ 6 วิชา (150 ข้อ), ชุดข้อสอบจำลอง 15 ชุด, ชุดแยกรายวิชา (ชุดละ 20 ข้อ / 50 ข้อ / 100 ข้อ) และเจาะลึก 132 หัวข้อย่อย',
  },
  {
    q: 'เกณฑ์การสอบผ่านข้อเขียนนายสิบตำรวจคิดอย่างไร?',
    a: 'ระบบประเมินผลแบบ 2 ภาคตามเกณฑ์จริง: ต้องได้คะแนนรวมไม่น้อยกว่า 60% และคะแนนเฉลี่ยในภาคความรู้ความสามารถทั่วไป กับภาคความรู้เฉพาะตำแหน่ง ต้องผ่านเกณฑ์ 60% ทั้งสองภาค',
  },
  {
    q: 'ระบบซ่อมจุดอ่อน (Mistake Notebook) ทำงานอย่างไร?',
    a: 'ทุกครั้งที่ส่งคำตอบ ระบบจะบันทึกข้อที่ตอบผิดแยกตามหัวข้อย่อยทั้ง 132 หัวข้อไว้ให้อัตโนมัติ สามารถกดปุ่มซ่อมเฉพาะข้อที่ผิด หรือติดดาวข้อที่ยังไม่มั่นใจเพื่อกลับมาฝึกซ้ำได้ทันทีจากหน้า Dashboard',
  },
  {
    q: 'สามารถฝึกทำเฉพาะรายวิชาในชุดข้อสอบจำลองได้ไหม?',
    a: 'ได้ทันที ทั้งในหน้าชุดข้อสอบจำลอง 15 ชุด หน้าเลือกชุดแยกรายวิชา และระหว่างกำลังทำข้อสอบใน Exam Runner คุณสามารถสลับดูเฉพาะวิชาหรือแยกฝึกเฉพาะวิชานั้นๆ ได้ตามต้องการ',
  },
];

export default function LandingPage() {
  const store = getStore();
  const totalQ = getAllQuestionsMerged().length;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <SiteHeader mode="public" />
      <div className="beam-line" />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 gp-rise">
              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl">
                ติวสอบนายสิบตำรวจ <span className="text-brand">ครบ {totalQ.toLocaleString()} ข้อ</span>{' '}
                พร้อมวิเคราะห์จุดอ่อนรายหัวข้อ
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                ฝึกทำข้อสอบจำลองเสมือนจริง 150 ข้อ จับเวลา 3 ชั่วโมง เฉลยละเอียดทุกข้อ ตัดช้อยส์ระหว่างทำ
                ติดดาวทบทวน และระบบซ่อมจุดอ่อนอัตโนมัติตามเกณฑ์ 60% ทั้งสองภาค
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-btn bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  <span>เข้า Dashboard ทำข้อสอบทันที</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/bank"
                  className="inline-flex items-center gap-2 rounded-btn border border-line bg-panel px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-brand/50 hover:text-brand"
                >
                  <Database className="h-4 w-4 text-brand" />
                  <span>สำรวจคลัง {totalQ.toLocaleString()} ข้อ</span>
                </Link>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3 sm:max-w-lg">
                <div className="rounded-card border border-line bg-panel p-3.5">
                  <div className="font-mono text-2xl font-bold tabular-nums text-brand">
                    {totalQ.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">ข้อสอบพร้อมเฉลย</div>
                </div>
                <div className="rounded-card border border-line bg-panel p-3.5">
                  <div className="font-mono text-2xl font-bold tabular-nums text-teal-ink">
                    {store.topics.length}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">หัวข้อเจาะลึกรายบท</div>
                </div>
                <div className="rounded-card border border-line bg-panel p-3.5">
                  <div className="font-mono text-2xl font-bold tabular-nums text-ink">
                    {store.examSets.length}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">ชุดสอบ &amp; ฝึกรายวิชา</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-card border border-line bg-panel p-5 shadow-card space-y-3.5">
                {/* Exam Blueprint & Readiness Panel */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-ink">
                      เกณฑ์ผ่าน 2 ภาค (≥ 60% ทั้งสองภาค)
                    </h2>
                    <span className="rounded-lg bg-brand/10 px-2.5 py-1 font-mono text-xs font-semibold text-brand tabular-nums">
                      150 ข้อ · 180 นาที
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-line bg-bg2/40 p-3">
                      <div className="text-xs font-medium text-muted">ภาคทั่วไป</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-mono text-base font-bold tabular-nums text-teal-ink">40–55 ข้อ</span>
                        <span className="font-mono text-[11px] font-semibold text-teal-ink">≥ 60%</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted">ความสามารถทั่วไป · ภาษาไทย</div>
                    </div>
                    <div className="rounded-xl border border-line bg-bg2/40 p-3">
                      <div className="text-xs font-medium text-muted">ภาคเฉพาะตำแหน่ง</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-mono text-base font-bold tabular-nums text-brand">95–110 ข้อ</span>
                        <span className="font-mono text-[11px] font-semibold text-brand">≥ 60%</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted">คอมฯ · สารบรรณ · กฎหมาย · อังกฤษ · สังคม</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/catalog/subject"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>ฝึกชุดแยกรายวิชา (7 วิชา)</span>
                    </Link>
                    <Link
                      href="/catalog/form"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-xs font-bold text-ink transition-colors hover:border-brand/50 hover:text-brand"
                    >
                      <span>ชุดจำลอง 15 ชุด</span>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <CountdownCard
                    title={TRACKS[0].name}
                    dateLabel={TRACKS[0].examDateLabel}
                    targetIso={TRACKS[0].examDateIso}
                    accentColor="brand"
                  />
                  <CountdownCard
                    title="ปราบปราม (บุคคลทั่วไป / ทหารเกณฑ์)"
                    dateLabel={TRACKS[1].examDateLabel}
                    targetIso={TRACKS[1].examDateIso}
                    accentColor="gold"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-line bg-bg2/45 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                UPGRADED EXAM SYSTEM
              </span>
              <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                ยกระดับระบบฝึกทำข้อสอบให้เก่งขึ้นกว่าเดิม
              </h2>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Target,
                  title: 'ประเมินเกณฑ์ผ่าน 2 ภาคจริง',
                  desc: 'ตรวจผลตามสัดส่วนสายงาน ภาคความรู้ความสามารถทั่วไป ≥ 60% และภาคความรู้เฉพาะตำแหน่ง ≥ 60%',
                },
                {
                  icon: Zap,
                  title: 'ตัดช้อยส์ + ติดดาว + คีย์ลัด',
                  desc: 'กดตัดตัวเลือกที่ไม่ใช่ กด B ติดดาวข้อไม่มั่นใจ ใช้ปุ่ม 1–4 และลูกศรสลับข้อได้ไวเหมือนทำบนโต๊ะสอบ',
                },
                {
                  icon: BookmarkCheck,
                  title: 'สมุดซ่อมจุดอ่อนอัตโนมัติ',
                  desc: 'ทุกข้อที่ตอบผิดถูกเก็บเข้า Mistake Notebook เพื่อนำกลับมาฝึกซ้ำจนกว่าจะทำถูกทุกข้อ',
                },
                {
                  icon: Layers,
                  title: 'คลังเจาะลึก 132 หัวข้อย่อย',
                  desc: 'ค้นหาข้อสอบจากคีย์เวิร์ดหรือเลือกเฉพาะบทที่ยังไม่แม่น เช่น อนุกรม การอนุมาน อาเซียน และกฎหมาย',
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="card-hover rounded-card border border-line bg-panel p-5 shadow-card"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-ink">{feat.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{feat.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Police Tracks & Weights */}
        <section id="tracks" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">โครงสร้างข้อสอบ 150 ข้อ แยกตามสายงานจริง</h2>
          <p className="mt-1 text-sm text-muted">
            สัดส่วนการสุ่มข้อสอบครบทุกวิชาของแต่ละสายสอบ อ้างอิงประกาศสำนักงานตำรวจแห่งชาติ
          </p>

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {TRACKS.map((track) => (
              <div
                key={track.id}
                className="flex flex-col justify-between rounded-card border border-line bg-panel p-6 shadow-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                      สอบ {track.examDateLabel}
                    </span>
                    <span className="font-mono text-xs font-bold text-muted">150 ข้อ · 180 นาที</span>
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold text-ink">{track.name}</h3>
                  <p className="mt-0.5 text-xs text-muted">{track.quotaLabel}</p>

                  <div className="mt-4 space-y-2">
                    {(Object.entries(track.weights) as Array<[SubjectKey, number]>)
                      .filter(([, count]) => count > 0)
                      .map(([sk, count]) => {
                        const s = SUBJECT_MAP[sk];
                        return (
                          <div
                            key={sk}
                            className="flex items-center justify-between rounded-xl border border-line/70 bg-bg2/50 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 font-semibold text-ink">
                              <SubjectIcon subjectKey={sk} size="sm" />
                              <span>{s.name}</span>
                            </div>
                            <span className="font-mono font-bold text-brand">{count} ข้อ</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <Link
                  href={`/exam/random-${track.id}?mode=real`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-brand px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  <span>สุ่มข้อสอบสายนี้ 150 ข้อ</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="border-t border-line bg-bg2/45 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-ink">
                  <Award className="h-4 w-4" />
                  <span>ผลลัพธ์และแผนเก็บคะแนนสอบจริง</span>
                </div>
                <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">ตัวอย่างคะแนนสอบผ่านและกลยุทธ์รายวิชา</h2>
              </div>
              <p className="text-xs text-muted">คลิกที่การ์ดเพื่อดูสัดส่วนคะแนนแต่ละวิชาและแผนฝึกทำข้อสอบ</p>
            </div>

            <div className="mt-6">
              <ReviewSlider />
            </div>
          </div>
        </section>

        {/* Articles & News Highlights */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-card border border-line bg-panel p-6 shadow-card">
              <div className="flex items-center gap-2 text-xs font-bold text-accent">
                <Newspaper className="h-4 w-4" />
                <span>ประกาศรับสมัครล่าสุด</span>
              </div>
              <h3 className="mt-2 text-lg font-extrabold leading-snug">
                {store.news[0]?.h1 || 'เปิดรับสมัครนายสิบตำรวจ 2569'}
              </h3>
              <p className="mt-2 text-sm text-muted">{store.news[0]?.description}</p>
              <Link
                href={store.news[0] ? `/news/${store.news[0].slug}` : '/news'}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              >
                <span>อ่านรายละเอียดและสถิติคะแนนติด</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-card border border-line bg-panel p-6 shadow-card lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-brand">
                  <BookOpen className="h-4 w-4" />
                  <span>คลังบทความเตรียมสอบ ({store.articles.length} บทความ)</span>
                </div>
                <Link href="/articles" className="text-xs font-bold text-brand hover:underline">
                  ดูทั้งหมด →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {store.articles.slice(0, 4).map((art) => (
                  <Link
                    key={art.slug}
                    href={`/articles/${art.slug}`}
                    className="rounded-2xl border border-line bg-bg2/60 p-3.5 transition-colors hover:border-brand/50"
                  >
                    <div className="line-clamp-1 text-sm font-bold text-ink">{art.h1}</div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{art.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-4xl px-4 pb-14">
          <div className="flex items-center gap-2 text-sm font-bold text-brand">
            <HelpCircle className="h-4 w-4" />
            <span>คำถามที่พบบ่อย</span>
          </div>
          <h2 className="mt-1 text-2xl font-extrabold">ไขข้อสงสัยก่อนเริ่มติว</h2>

          <div className="mt-5 space-y-3">
            {FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-line bg-panel px-5 py-4 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-ink">
                  <span>{item.q}</span>
                  <span className="ml-4 text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-card bg-gradient-to-br from-brand to-brand-dark p-8 text-white shadow-xl sm:p-10">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>พร้อมสนามสอบ 2569–2570</span>
                </div>
                <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                  เริ่มฝึกวันละ 20 ข้อ สร้างความพร้อมสู่เครื่องแบบ
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  เข้าถึงข้อสอบจริง 7,038 ข้อ ครบทุกสายสอบพร้อมเฉลยละเอียดทันที
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-btn bg-white px-6 py-3.5 text-sm font-extrabold text-brand transition-transform hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>เริ่มทำข้อสอบเลย</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-panel py-8 text-center text-xs text-muted">
        <div className="mx-auto max-w-6xl px-4">
          GURU POLICE V2 · ติวสอบนายสิบตำรวจ · ข้อมูลข้อสอบและบทความครบถ้วนเพื่อการเตรียมสอบ
        </div>
      </footer>
    </div>
  );
}

