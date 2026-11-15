import React from 'react';
import { DashboardClient } from '@/components/DashboardClient';
import { getAllQuestionsMerged, getStore, readRuntimeState } from '@/lib/server-db';

export default function DashboardPage() {
  const store = getStore();
  const runtime = readRuntimeState();
  const totalQuestions = getAllQuestionsMerged().length;

  return (
    <DashboardClient
      profile={runtime.profile}
      attempts={runtime.attempts}
      examProgress={runtime.examProgress}
      leaderboard={runtime.leaderboard}
      totalQuestions={totalQuestions}
      totalTopics={store.topics.length}
    />
  );
}

