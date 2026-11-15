import { NextRequest, NextResponse } from 'next/server';
import { findQuestionById, readRuntimeState, toRunnerQuestion } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const runtime = readRuntimeState();
  const attempt = runtime.attempts.find((a) => String(a.id) === id);
  if (!attempt) {
    return NextResponse.json({ error: 'ไม่พบประวัติการสอบรายการนี้' }, { status: 404 });
  }

  const questions = attempt.questionIds
    .map((qid) => findQuestionById(qid))
    .map((q) => (q ? toRunnerQuestion(q) : null))
    .filter(Boolean);

  return NextResponse.json({ attempt, questions });
}

