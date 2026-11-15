import { NextRequest, NextResponse } from 'next/server';
import {
  computeSubjectBreakdown,
  findQuestionById,
  getAllQuestionsMerged,
  getStore,
  readRuntimeState,
  writeRuntimeState,
  type ExamSetSummary,
} from '@/lib/server-db';
import type { SubjectKey } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = getStore();
  const runtime = readRuntimeState();
  return NextResponse.json({
    sets: [...store.examSets, ...(runtime.customSets || [])],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = String(body.title || '').trim();
  const count = Math.min(150, Math.max(5, Number(body.total || 20)));
  const timeMinutes = Math.max(5, Number(body.timeMinutes || count));
  const subjectKey = body.subjectKey ? (String(body.subjectKey) as SubjectKey) : null;

  if (!title) {
    return NextResponse.json({ error: 'กรุณาระบุชื่อชุดข้อสอบ' }, { status: 400 });
  }

  const runtime = readRuntimeState();
  const store = getStore();
  const maxId = Math.max(
    300,
    ...store.examSets.map((s) => s.id),
    ...(runtime.customSets || []).map((s) => s.id)
  );
  const newId = maxId + 1;

  const pool = getAllQuestionsMerged().filter((q) => !subjectKey || q.subject_key === subjectKey);
  const pickedIds = pool
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((q) => q.id);

  const created: ExamSetSummary = {
    id: newId,
    kind: subjectKey ? 'subject' : 'form',
    title,
    subtitle: 'ชุดข้อสอบสร้างจากคลังแอดมิน',
    total: pickedIds.length,
    timeMinutes,
    subjectKey,
    track: body.track ? String(body.track) : null,
    subjectBreakdown: computeSubjectBreakdown(pickedIds, findQuestionById),
  };

  runtime.customSets = [...(runtime.customSets || []), created];
  runtime.customSetQuestionIds[String(newId)] = pickedIds;
  writeRuntimeState(runtime);

  return NextResponse.json({ ok: true, set: created }, { status: 201 });
}

