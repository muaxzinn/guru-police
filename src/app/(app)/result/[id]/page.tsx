import React from 'react';
import { ResultDetailClient } from '@/components/ResultDetailClient';
import { readRuntimeState } from '@/lib/server-db';

export function generateStaticParams() {
  const runtime = readRuntimeState();
  const ids = new Set<string>();
  for (let i = 1001; i <= 1050; i++) {
    ids.add(String(i));
  }
  for (const att of runtime.attempts || []) {
    ids.add(String(att.id));
  }
  return Array.from(ids).map((id) => ({ id }));
}

export default function ResultDetailPage() {
  return <ResultDetailClient />;
}
