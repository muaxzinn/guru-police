import React from 'react';
import { ExamRunnerClient } from '@/components/ExamRunnerClient';
import { SUBJECTS, TRACKS } from '@/lib/constants';
import { getStore, readRuntimeState } from '@/lib/server-db';

export function generateStaticParams() {
  const store = getStore();
  const runtime = readRuntimeState();
  const ids = new Set<string>([
    ...store.examSets.map((s) => String(s.id)),
    ...(runtime.customSets || []).map((s) => String(s.id)),
    ...Array.from({ length: 10 }, (_, i) => String(301 + i)),
    'random',
    ...TRACKS.map((t) => `random-${t.id}`),
    ...SUBJECTS.map((s) => `subject-${s.key}`),
    'mistakes',
    'bookmarks',
    'topic',
  ]);
  return Array.from(ids).map((setId) => ({ setId }));
}

export default function ExamRunnerPage() {
  return <ExamRunnerClient />;
}
