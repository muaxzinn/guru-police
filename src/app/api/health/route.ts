import { NextResponse } from 'next/server';
import { getStore, getAllQuestionsMerged } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  const store = getStore();
  const allQuestions = getAllQuestionsMerged();
  return NextResponse.json({
    status: 'ok',
    db: 'ok',
    questions: allQuestions.length,
    topics: store.topics.length,
    images: store.imageCount,
    sets: store.examSets.length,
    articles: store.articles.length,
    ms: Date.now() - t0,
    ts: new Date().toISOString(),
  });
}

