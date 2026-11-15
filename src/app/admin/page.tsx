'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Database,
  Flag,
  Image as ImageIcon,
  Layers,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { AdminSubNav } from '@/components/AdminSubNav';

interface HealthData {
  status: string;
  db: string;
  questions: number;
  topics: number;
  images: number;
  sets: number;
  articles: number;
  ms: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [hRes, rRes] = await Promise.all([
          fetch('/api/health', { cache: 'no-store' }),
          fetch('/api/reports', { cache: 'no-store' }),
        ]);
        if (!active) return;
        if (hRes.ok) setHealth(await hRes.json());
        if (rRes.ok) {
          const rJson = await rRes.json();
          const list = Array.isArray(rJson.reports) ? rJson.reports : [];
          setOpenReports(list.filter((r: { status: string }) => r.status === 'open').length);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const modules = [
    {
      href: '/admin/questions',
      title: 'จัดการคลังข้อสอบ (7,038+ ข้อ)',
      desc: 'ค้นหาตามรหัส ข้อความ รายวิชา 132 หัวข้อย่อย และเพิ่มข้อสอบใหม่เข้าคลัง',
      Icon: Database,
      badge: health ? `${health.questions.toLocaleString()} ข้อ` : 'คลังหลัก',
    },
    {
      href: '/admin/sets',
      title: 'จัดการชุดข้อสอบและแบบฟอร์ม',
      desc: 'สร้างชุดข้อสอบใหม่แบบกำหนดวิชา/สายสอบ และตรวจสอบเวลาสอบมาตรฐาน',
      Icon: BookOpenCheck,
      badge: health ? `${health.sets} ชุดมาตรฐาน` : 'ชุดสอบ',
    },
    {
      href: '/admin/reports',
      title: 'ตรวจรับรายงานปัญหา (Reports)',
      desc: 'คัดกรองและปิดสถานะรายการแจ้งโจทย์ผิด เฉลยคลาดเคลื่อน หรือปัญหาระบบ',
      Icon: Flag,
      badge: `${openReports} รอตรวจสอบ`,
    },
    {
      href: '/admin/analytics',
      title: 'สถิติคลังข้อสอบ 7 วิชา & 132 หัวข้อ',
      desc: 'ดูการกระจายสัดส่วนข้อสอบตามรายวิชา แหล่งที่มา (Batch) และภาพประกอบ',
      Icon: BarChart3,
      badge: health ? `${health.topics} หัวข้อย่อย` : 'วิเคราะห์',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <SiteHeader mode="app" />
      <AdminSubNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">ศูนย์ควบคุมระบบแอดมิน (Admin Backoffice)</h1>
            <p className="text-sm text-muted mt-1">
              บริหารจัดการข้อสอบทั้งหมด ภาพประกอบ ชุดข้อสอบ และคิวรายงานปัญหาในที่เดียว
            </p>
          </div>
          {health && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-teal/40 bg-teal/10 text-teal-ink text-xs font-extrabold">
              <ShieldCheck className="w-4 h-4" />
              <span>
                ระบบปกติ · DB {health.db.toUpperCase()} · {health.ms} ms
              </span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-brand" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-panel border border-line rounded-card p-5 shadow-card">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>ข้อสอบในคลัง</span>
                  <Database className="w-4 h-4 text-brand" />
                </div>
                <p className="text-2xl font-extrabold font-mono mt-2">
                  {health?.questions.toLocaleString() || '-'}
                </p>
              </div>
              <div className="bg-panel border border-line rounded-card p-5 shadow-card">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>หัวข้อย่อย</span>
                  <Layers className="w-4 h-4 text-teal-ink" />
                </div>
                <p className="text-2xl font-extrabold font-mono mt-2">{health?.topics || '-'}</p>
              </div>
              <div className="bg-panel border border-line rounded-card p-5 shadow-card">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>ภาพประกอบจริง</span>
                  <ImageIcon className="w-4 h-4 text-gold-ink" />
                </div>
                <p className="text-2xl font-extrabold font-mono mt-2">
                  {health?.images.toLocaleString() || '-'}
                </p>
              </div>
              <div className="bg-panel border border-line rounded-card p-5 shadow-card">
                <div className="flex items-center justify-between text-xs font-bold text-muted">
                  <span>รายงานรอแก้</span>
                  <Activity className="w-4 h-4 text-accent" />
                </div>
                <p className="text-2xl font-extrabold font-mono mt-2 text-accent">{openReports}</p>
              </div>
            </section>

            {/* Modules Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map(({ href, title, desc, Icon, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="bg-panel border border-line rounded-card p-6 shadow-card card-hover flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-bg2 border border-line text-xs font-bold text-muted">
                        {badge}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold">{title}</h2>
                    <p className="text-sm text-muted leading-relaxed">{desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand">
                    <span>เปิดเครื่องมือ</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

