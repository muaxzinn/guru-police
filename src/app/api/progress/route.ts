import { NextRequest, NextResponse } from 'next/server';
import { readRuntimeState, writeRuntimeState } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = readRuntimeState();
  return NextResponse.json({ progress: runtime.examProgress });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const runtime = readRuntimeState();
  runtime.examProgress = body.progress || null;
  writeRuntimeState(runtime);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const runtime = readRuntimeState();
  runtime.examProgress = null;
  writeRuntimeState(runtime);
  return NextResponse.json({ ok: true });
}

