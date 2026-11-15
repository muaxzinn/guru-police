import { NextRequest, NextResponse } from 'next/server';
import { readRuntimeState, writeRuntimeState, type ReportRecord } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = readRuntimeState();
  return NextResponse.json({ reports: runtime.reports });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reason = String(body.reason || '').trim();
  const note = body.note ? String(body.note).trim() : null;
  const category = body.category === 'system' ? 'system' : 'question';

  if (!reason) {
    return NextResponse.json({ error: 'เลือกประเภทปัญหาที่พบก่อนส่ง' }, { status: 400 });
  }
  if (category === 'system' && (!note || note.length < 10)) {
    return NextResponse.json(
      { error: 'อธิบายปัญหาที่เจอ อย่างน้อย 10 ตัวอักษร เพื่อให้ทีมงานตามแก้ได้ตรงจุด' },
      { status: 400 }
    );
  }

  const runtime = readRuntimeState();
  const nextId = (runtime.reports[0]?.id || 500) + 1;
  const record: ReportRecord = {
    id: nextId,
    questionId: body.question_id ? Number(body.question_id) : null,
    questionText: String(body.question_text || ''),
    category,
    reason,
    note,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  runtime.reports = [record, ...runtime.reports];
  writeRuntimeState(runtime);

  return NextResponse.json({ ok: true, report: record }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const id = Number(body.id);
  const status = body.status === 'resolved' ? 'resolved' : 'open';
  const runtime = readRuntimeState();
  const target = runtime.reports.find((r) => r.id === id);
  if (!target) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  target.status = status;
  writeRuntimeState(runtime);
  return NextResponse.json({ ok: true, report: target });
}

