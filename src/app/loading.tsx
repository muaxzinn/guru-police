import React from 'react';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function RootLoading() {
  return (
    <AppLoadingScreen
      variant="page"
      includeHeader={true}
      title="กำลังเตรียมระบบ นายสิบ โปร..."
      subtitle="กำลังโหลดคลังข้อสอบนายสิบตำรวจ 7,038 ข้อ และข้อมูลผู้ใช้งาน"
    />
  );
}
