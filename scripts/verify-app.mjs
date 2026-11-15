import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.VERIFY_PORT || 3199);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RUNTIME_STATE_PATH = path.join(ROOT_DIR, 'data', 'runtime-state.json');

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return await res.json();
    } catch {
      // retry until server responds
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`Next.js server did not become ready on ${BASE_URL} within ${timeoutMs}ms`);
}

/**
 * @param {string} pathname
 * @param {RequestInit} [init]
 */
async function fetchJson(pathname, init) {
  const res = await fetch(`${BASE_URL}${pathname}`, init);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${pathname} (${res.status}): ${text.slice(0, 200)}`);
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const runtimeBackup = fs.existsSync(RUNTIME_STATE_PATH)
    ? fs.readFileSync(RUNTIME_STATE_PATH, 'utf8')
    : null;

  const serverProc = spawn('pnpm', ['start'], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT) },
  });

  let browser;
  try {
    console.log('1) Waiting for production Next.js server via pnpm start on', BASE_URL);
    const health = await waitForServer();
    console.log('   /api/health =>', JSON.stringify(health));
    assert.equal(health.status, 'ok');
    assert.ok(health.questions >= 7038, `Expected >= 7038 questions, got ${health.questions}`);
    assert.equal(health.topics, 132, `Expected 132 topics, got ${health.topics}`);
    assert.equal(health.images, 1386, `Expected 1386 images, got ${health.images}`);
    assert.equal(health.sets, 22, `Expected 22 sets, got ${health.sets}`);
    assert.equal(health.articles, 20, `Expected 20 articles, got ${health.articles}`);

    console.log('2) Verifying API endpoints, removed auth routes & local assets...');
    assert.equal(fs.existsSync(path.join(ROOT_DIR, 'public', 'landing')), false, 'public/landing should be removed');
    assert.equal(
      fs.existsSync(path.join(ROOT_DIR, 'public', 'reviews-landing')),
      false,
      'public/reviews-landing should be removed'
    );

    for (const removedRoute of ['/login', '/register', '/profile', '/api/redeem', '/api/admin/codes']) {
      const deadRes = await fetch(`${BASE_URL}${removedRoute}`);
      assert.equal(deadRes.status, 404, `Expected 404 for removed route ${removedRoute}, got ${deadRes.status}`);
    }

    const qRes = await fetchJson('/api/questions?hasImage=1&limit=50');
    assert.equal(qRes.ok, true);
    assert.ok(Array.isArray(qRes.data.items) && qRes.data.items.length > 0);
    const localImgItem = qRes.data.items.find(
      (/** @type {{ img?: string | null }} */ item) => item.img?.startsWith('/question-images/')
    );
    assert.ok(localImgItem, 'Expected at least one question with local /question-images/ stem image');
    const imgRes = await fetch(`${BASE_URL}${localImgItem.img}`);
    assert.equal(imgRes.status, 200, `Expected 200 for image ${localImgItem.img}`);

    const exam201 = await fetchJson('/api/exam/201');
    assert.equal(exam201.ok, true);
    assert.equal(exam201.data.items.length, 150, 'Set 201 should contain 150 items');
    const urlOnlyRe = /^(?:https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg)|\/question-images\/\S+)$/i;
    for (const item of exam201.data.items) {
      assert.equal(urlOnlyRe.test(String(item.b || '').trim()), false, `Raw image URL left in stem #${item.id}`);
      for (const opt of item.opts || []) {
        assert.equal(urlOnlyRe.test(String(opt || '').trim()), false, `Raw image URL left in opt #${item.id}`);
      }
    }

    const exam201Math = await fetchJson('/api/exam/201?subject=math');
    assert.equal(exam201Math.ok, true);
    assert.equal(exam201Math.data.items.length, 20, 'Set 201 filtered by math should contain 20 items');
    assert.ok(
      exam201Math.data.items.every((/** @type {{ subject: string }} */ q) => q.subject === 'math'),
      'All items in /api/exam/201?subject=math must belong to math'
    );

    const examSubjLawSet2 = await fetchJson('/api/exam/subject-law?set=2&count=20');
    assert.equal(examSubjLawSet2.ok, true);
    assert.equal(examSubjLawSet2.data.items.length, 20, 'subject-law set 2 should contain 20 items');
    assert.ok(
      examSubjLawSet2.data.items.every((/** @type {{ subject: string }} */ q) => q.subject === 'law'),
      'All items in /api/exam/subject-law?set=2 should belong to law'
    );
    assert.ok(String(examSubjLawSet2.data.title).includes('ชุดที่ 2'), 'Title should mention ชุดที่ 2');

    const exam107 = await fetchJson('/api/exam/107');
    assert.equal(exam107.ok, true);
    assert.equal(exam107.data.items.length, 20, 'Set 107 should contain 20 items');

    const examRand = await fetchJson('/api/exam/random-0?track=0&count=25');
    assert.equal(examRand.ok, true);
    assert.equal(examRand.data.items.length, 25, 'Random mock should return 25 items');

    /** @type {Array<{ id: number; c: number }>} */
    const itemsMock = examRand.data.items;
    const answers = itemsMock.map((q, idx) => (idx === 0 ? (q.c + 1) % 4 : idx < 20 ? q.c : null));
    const postAttempt = await fetchJson('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setId: 'random-0',
        setTitle: examRand.data.title,
        mode: 'practice',
        passRule: 'groups',
        durationSec: 210,
        startedAt: new Date(Date.now() - 210000).toISOString(),
        questionIds: itemsMock.map((q) => q.id),
        answers,
        bookmarkedIds: [itemsMock[0].id],
      }),
    });
    assert.equal(postAttempt.ok, true);
    const attemptId = postAttempt.data.id;
    assert.ok(attemptId, 'Expected created attempt ID');

    const getAttempt = await fetchJson(`/api/attempts/${attemptId}`);
    assert.equal(getAttempt.ok, true);
    assert.equal(getAttempt.data.questions.length, 25);
    console.log('   All API checks PASSED (attemptId =', attemptId, ')');

    console.log('3) Verifying UI routes in headless Chrome...');
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });

    /** @type {string[]} */
    const pageErrors = [];
    /** @type {string[]} */
    const consoleErrors = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(`${page.url()}: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`${page.url()}: ${msg.text()}`);
    });

    const routes = [
      '/',
      '/dashboard',
      '/catalog',
      '/catalog/form',
      '/catalog/subject',
      '/bank',
      `/result/${attemptId}`,
      '/admin',
    ];
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);
      const brokenImgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (!img.complete || img.naturalWidth === 0);
          })
          .map((img) => img.getAttribute('src'))
      );
      assert.equal(brokenImgs.length, 0, `[${route}] Broken visible images: ${JSON.stringify(brokenImgs)}`);
      console.log(`   Verified ${route}`);
    }

    await page.goto(`${BASE_URL}/exam/201?mode=practice&fresh=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=ตั้งค่ารูปแบบการทำข้อสอบ', { timeout: 10000 });
    await page.locator('button:has-text("เริ่มทำข้อสอบ")').click();
    await page.waitForSelector('text=ข้อที่ 1.', { timeout: 10000 });
    await page.locator('button:has-text("กฎหมาย")').first().click();
    await page.waitForSelector('text=แยกทำเฉพาะวิชากฎหมาย', { timeout: 5000 });
    await page.locator('main span:text-is("ก")').first().click();
    await page.waitForSelector('text=เฉลยที่ถูกต้อง:', { timeout: 5000 });

    await page.locator('header button:has-text("ส่งข้อสอบ")').click();
    await page.waitForSelector('text=แน่ใจแล้วใช่ไหมที่จะส่งข้อสอบ?', { timeout: 5000 });
    await page.waitForSelector('button:has-text("ย้อนทำเฉพาะข้อที่ยังไม่ได้ทำ")', { timeout: 5000 });
    await page.waitForSelector('button:has-text("ย้อนดูข้อสอบทั้งหมด")', { timeout: 5000 });
    await page.waitForSelector('button:has-text("ยืนยันส่งข้อสอบทันที")', { timeout: 5000 });
    console.log('   Verified /exam/201 setup gate, subject jump, instant reveal & 3-button submit modal');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const mobileDashOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileDashOverflow, false, 'Mobile /dashboard should not overflow horizontally');
    await page.waitForSelector('nav[aria-label="แถบนำทางมือถือ"]', { timeout: 5000 });

    await page.goto(`${BASE_URL}/exam/201?mode=practice&fresh=1&autostart=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=ข้อที่ 1.', { timeout: 10000 });
    const mobileExamOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileExamOverflow, false, 'Mobile /exam should not overflow horizontally');
    console.log('   Verified mobile 390x844 layout & navigation');

    await context.close();
    assert.equal(pageErrors.length, 0, `Uncaught page errors: ${JSON.stringify(pageErrors)}`);
    assert.equal(consoleErrors.length, 0, `Console errors: ${JSON.stringify(consoleErrors)}`);
    console.log('4) All verification checks PASSED with 0 errors!');
  } finally {
    if (browser) await browser.close();
    try {
      if (serverProc.pid) process.kill(-serverProc.pid, 'SIGTERM');
    } catch {
      serverProc.kill('SIGTERM');
    }
    if (runtimeBackup !== null) {
      fs.writeFileSync(RUNTIME_STATE_PATH, runtimeBackup, 'utf8');
    } else if (fs.existsSync(RUNTIME_STATE_PATH)) {
      fs.unlinkSync(RUNTIME_STATE_PATH);
    }
  }
}

main().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

