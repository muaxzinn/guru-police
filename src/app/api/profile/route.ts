import { NextRequest, NextResponse } from 'next/server';
import { readRuntimeState, writeRuntimeState } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = readRuntimeState();
  return NextResponse.json({
    profile: runtime.profile,
    leaderboard: runtime.leaderboard,
    attemptsCount: runtime.attempts.length,
    attempts: runtime.attempts.slice(0, 10),
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const runtime = readRuntimeState();

  if (typeof body.track === 'string' && body.track.trim()) {
    runtime.profile.track = body.track.trim();
  }
  if (body.toggleBookmarkId !== undefined) {
    const bid = Number(body.toggleBookmarkId);
    const set = new Set(runtime.profile.bookmarks || []);
    if (set.has(bid)) set.delete(bid);
    else set.add(bid);
    runtime.profile.bookmarks = Array.from(set);
  }
  if (body.clearMistakes) {
    runtime.profile.mistakeIds = [];
  }
  if (body.clearBookmarks) {
    runtime.profile.bookmarks = [];
  }

  writeRuntimeState(runtime);
  return NextResponse.json({ ok: true, profile: runtime.profile });
}

