import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/server-db';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const segments = (await context.params).path || [];
  const store = getStore();
  const originUrl = `https://guru-eng-exam-images.netlify.app/${segments.join('/')}`;
  const mapped = store.imageUrlMap.get(originUrl);
  if (mapped && mapped.startsWith('/question-images/')) {
    const filePath = path.join(
      process.cwd(),
      'public',
      'question-images',
      mapped.slice('/question-images/'.length)
    );
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const ct = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
      return new NextResponse(buf, { headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=31536000' } });
    }
  }
  return NextResponse.redirect(originUrl);
}

