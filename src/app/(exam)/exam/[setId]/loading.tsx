import React from 'react';
import { AppLoadingScreen } from '@/components/AppLoadingScreen';

export default function ExamSetLoading() {
  return (
    <AppLoadingScreen
      variant="exam"
      includeHeader={false}
      title="กำลังจัดเตรียมกระดาษคำตอบและชุดข้อสอบ..."
      subtitle="ดึงโจทย์ ตัวเลือก และกู้คืนเวลาสอบล่าสุดของคุณ"
    />
  );
}
