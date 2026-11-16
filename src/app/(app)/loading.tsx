import React from 'react';
import { SiteHeader } from '@/components/SiteHeader';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function AppSectionLoading() {
  return (
    <div className="min-h-screen bg-bg text-ink pb-24 md:pb-12">
      <SiteHeader mode="app" />
      <AppLoadingScreen
        variant="catalog"
        includeHeader={false}
        title="กำลังโหลดหน้าคลังข้อสอบและสถิติ..."
        subtitle="ซิงก์ข้อมูลความคืบหน้าและชุดข้อสอบล่าสุด"
      />
    </div>
  );
}
