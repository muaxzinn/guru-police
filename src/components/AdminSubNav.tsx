'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpenCheck,
  Database,
  Flag,
  LayoutGrid,
  Shield,
} from 'lucide-react';

const ADMIN_TABS = [
  { href: '/admin', label: 'ภาพรวมระบบ', Icon: LayoutGrid },
  { href: '/admin/questions', label: 'คลังข้อสอบ', Icon: Database },
  { href: '/admin/sets', label: 'ชุดข้อสอบ', Icon: BookOpenCheck },
  { href: '/admin/reports', label: 'รายงานปัญหา', Icon: Flag },
  { href: '/admin/analytics', label: 'สถิติเชิงลึก', Icon: BarChart3 },
];

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-line bg-panel/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand shrink-0">
          <Shield className="w-4 h-4" />
          <span>ADMIN CONSOLE</span>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {ADMIN_TABS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-brand text-white font-semibold'
                    : 'bg-bg2/60 border border-line text-muted font-medium hover:text-ink'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

