import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.VERIFY_PORT || 3210);
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

  const serverProc = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
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
    assert.ok(health.images >= 500, `Expected >= 500 SVG images, got ${health.images}`);
    assert.equal(health.sets, 22, `Expected 22 sets, got ${health.sets}`);
    assert.equal(health.articles, 20, `Expected 20 articles, got ${health.articles}`);

    console.log('2) Verifying API endpoints, removed auth routes & SVG assets...');
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
      (/** @type {{ img?: string | null }} */ item) => item.img?.startsWith('/question-svgs/')
    );
    assert.ok(localImgItem, 'Expected at least one question with local /question-svgs/ SVG diagram');
    const imgRes = await fetch(`${BASE_URL}${localImgItem.img}`);
    assert.equal(imgRes.status, 200, `Expected 200 for SVG ${localImgItem.img}`);
    const svgBody = await imgRes.text();
    assert.ok(svgBody.includes('<svg'), `Expected <svg> markup in ${localImgItem.img}`);

    const mathSetCheck = await fetchJson('/api/questions?q=12908&limit=5');
    assert.equal(mathSetCheck.ok, true);
    const q12908 = mathSetCheck.data.items.find((/** @type {{ id: number }} */ q) => q.id === 12908);
    assert.ok(q12908 && !q12908.opt_imgs?.some(Boolean) && q12908.opts[0].includes('A - B'), 'Expected #12908 choices converted from PNG to LaTeX text');

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

    const examComWord = await fetchJson('/api/exam/topic?subject=com&topic=Word&set=1&count=20');
    assert.equal(examComWord.ok, true);
    assert.equal(examComWord.data.items.length, 20, 'com Word set 1 should contain 20 items');
    assert.ok(
      examComWord.data.items.every((/** @type {{ subject: string }} */ q) => q.subject === 'com'),
      'All items in /api/exam/topic?subject=com&topic=Word must belong to com'
    );
    assert.ok(String(examComWord.data.title).includes('ชุดที่ 1'), 'Topic ordered set title should mention ชุดที่ 1');

    const bankMultiVariant = await fetchJson(
      `/api/questions?subject=com&topic=${encodeURIComponent('Data & People||Data and People')}&limit=50`
    );
    assert.equal(bankMultiVariant.ok, true);
    assert.ok(bankMultiVariant.data.total > 0, 'Multi-variant topic query should return matching questions');
    assert.ok(
      bankMultiVariant.data.items.every(
        (/** @type {{ subject_key: string; title: string }} */ q) =>
          q.subject_key === 'com' && /data/i.test(String(q.title || ''))
      ),
      'All items in multi-variant /api/questions filter must belong to com & Data topic'
    );

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

    // Record deterministic question outcomes (correct & wrong) via PATCH /api/profile and verify deduplication + /api/exam/completed-*
    const comWordFull = await fetchJson('/api/exam/topic?subject=com&topic=Word&set=1&count=20');
    assert.equal(comWordFull.ok, true);
    const seedCorrectIds = comWordFull.data.items.slice(0, 3).map((/** @type {{ id: number }} */ q) => q.id);
    const seedWrongIds = comWordFull.data.items.slice(3, 5).map((/** @type {{ id: number }} */ q) => q.id);
    const patchOutcome = await fetchJson('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        excludeCompleted: true,
        questionOutcomes: [
          ...seedCorrectIds.map((/** @type {number} */ id) => ({ id, correct: true })),
          ...seedWrongIds.map((/** @type {number} */ id) => ({ id, correct: false })),
        ],
      }),
    });
    assert.equal(patchOutcome.ok, true);

    const comWordDedup = await fetchJson('/api/exam/topic?subject=com&topic=Word&set=1&count=20&excludeCompleted=1');
    assert.equal(comWordDedup.ok, true);
    const seededSet = new Set([...seedCorrectIds, ...seedWrongIds]);
    for (const q of comWordDedup.data.items) {
      assert.equal(seededSet.has(q.id), false, `Completed question #${q.id} should be excluded when excludeCompleted=1`);
    }

    const compFormRes = await fetchJson('/api/exam/completed-form?pool=all&set=1&count=150');
    assert.equal(compFormRes.ok, true);
    assert.ok(compFormRes.data.items.length >= 5, 'completed-form?pool=all should contain recorded outcomes');

    const compTopicWrong = await fetchJson('/api/exam/completed-topic?pool=wrong&subject=com&topic=Word&set=1');
    assert.equal(compTopicWrong.ok, true);
    assert.ok(
      compTopicWrong.data.items.some((/** @type {{ id: number }} */ q) => q.id === seedWrongIds[0]),
      'completed-topic?pool=wrong should contain wrong Word question'
    );
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
      '/catalog/topics',
      '/catalog/completed',
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

    await page.goto(`${BASE_URL}/bank?subject=com&topic=Word`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("ล้างตัวกรอง")', { timeout: 5000 });
    await page.waitForSelector('article >> text=Word', { timeout: 5000 });
    const bankPreFilteredTotal = await page.locator('select').nth(0).inputValue();
    const bankPreFilteredTopic = await page.locator('select').nth(1).inputValue();
    assert.equal(bankPreFilteredTotal, 'com', '/bank should initialize subject select from URL query');
    assert.equal(bankPreFilteredTopic, 'Word', '/bank should initialize topic select from URL query');
    await page.locator('button:has-text("ล้างตัวกรอง")').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('select').nth(0).inputValue(), '', 'Reset button should clear subject filter');
    console.log('   Verified /bank URL deep-linking & reset filter');

    // Verify /catalog/topics Question Pool Settings toggle
    await page.goto(`${BASE_URL}/catalog/topics`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=ตั้งค่าการจัดชุดข้อสอบ (Question Pool Mode)', { timeout: 5000 });
    await page.locator('button:has-text("ใช้ข้อสอบรวมตามเดิม")').click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("ไม่นำข้อที่เคยทำมาขึ้นซ้ำ")').click();
    await page.waitForTimeout(200);

    // Verify /catalog/completed 3 status tabs & 3 structure views
    await page.goto(`${BASE_URL}/catalog/completed`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=1. เลือกกลุ่มข้อสอบที่เคยทำแล้ว', { timeout: 5000 });
    await page.locator('[role="tab"]:has-text("ทำถูกอย่างเดียว")').click();
    await page.locator('[role="tab"]:has-text("ทำผิดอย่างเดียว")').click();
    await page.locator('[role="tab"]:has-text("รวมที่เคยทำทั้งหมด")').click();
    await page.locator('[role="tab"]:has-text("แยกรายวิชา (7 วิชา)")').click();
    await page.waitForSelector('text=จัดชุดแยกรายวิชา 7 วิชา', { timeout: 5000 });
    await page.locator('[role="tab"]:has-text("แยกหัวข้อย่อยรายบท")').click();
    await page.waitForSelector('input[placeholder*="ค้นหาหัวข้อย่อย"]', { timeout: 5000 });
    await page.locator('[role="tab"]:has-text("ชุดข้อสอบรวม 150 ข้อ")').click();
    console.log('   Verified /catalog/topics pool toggle and /catalog/completed 3 tabs x 3 structures');

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

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${BASE_URL}/catalog/completed`, { waitUntil: 'networkidle' });
    const smallDesktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(smallDesktopOverflow, false, '1024px /catalog/completed should not overflow horizontally');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const tabletDashOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(tabletDashOverflow, false, 'Tablet 768px /dashboard should not overflow horizontally');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/catalog/completed`, { waitUntil: 'networkidle' });
    const mobileCompletedOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileCompletedOverflow, false, 'Mobile /catalog/completed should not overflow horizontally');
    const completedBottomActive = await page.evaluate(() => {
      const link = document.querySelector('nav[aria-label="แถบนำทางมือถือ"] a[href="/catalog/completed"]');
      return link ? link.className.includes('text-brand') : false;
    });
    assert.equal(completedBottomActive, true, 'Mobile bottom bar should highlight ที่ทำแล้ว on /catalog/completed');

    await page.goto(`${BASE_URL}/bank`, { waitUntil: 'networkidle' });
    await page.waitForSelector('article', { timeout: 5000 });
    const mobileBankOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileBankOverflow, false, 'Mobile 390x844 /bank should not overflow horizontally');
    const mobileBottom7Stats390 = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav[aria-label="แถบนำทางมือถือ"] a'));
      return {
        count: links.length,
        allInside: links.every((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.left >= -1 && r.right <= window.innerWidth + 1;
        }),
      };
    });
    assert.equal(mobileBottom7Stats390.count, 7, 'Mobile bottom bar should render all 7 navigation items');
    assert.equal(mobileBottom7Stats390.allInside, true, 'All 7 mobile bottom bar items must fit inside 390px viewport');

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${BASE_URL}/bank`, { waitUntil: 'networkidle' });
    await page.waitForSelector('article', { timeout: 5000 });
    const mobileBankOverflow360 = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileBankOverflow360, false, 'Mobile 360x800 /bank should not overflow horizontally');
    const mobileBottom7Stats360 = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('nav[aria-label="แถบนำทางมือถือ"] a'));
      return links.every((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.left >= -1 && r.right <= window.innerWidth + 1;
      });
    });
    assert.equal(mobileBottom7Stats360, true, 'All 7 mobile bottom bar items must fit inside 360px viewport');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
    const mobileDashOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileDashOverflow, false, 'Mobile /dashboard should not overflow horizontally');
    await page.waitForSelector('nav[aria-label="แถบนำทางมือถือ"]', { timeout: 5000 });

    await page.goto(`${BASE_URL}/catalog/topics`, { waitUntil: 'networkidle' });
    const mobileTopicsOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileTopicsOverflow, false, 'Mobile /catalog/topics should not overflow horizontally');
    const topicsNavActive = await page.evaluate(() => {
      const link = document.querySelector('nav[aria-label="แถบนำทางมือถือ"] a[href="/catalog/topics"]');
      return link ? link.className.includes('text-brand') : false;
    });
    assert.equal(topicsNavActive, true, 'Mobile bottom bar should highlight หัวข้อย่อย on /catalog/topics');

    await page.goto(`${BASE_URL}/exam/201?mode=practice&fresh=1&autostart=1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=ข้อที่ 1.', { timeout: 10000 });
    const mobileExamOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileExamOverflow, false, 'Mobile /exam should not overflow horizontally');

    // Open Mobile Slide-up Drawer and verify quick controls (A+ font scale & ตัดช้อยส์)
    await page.locator('button:has-text("1/150")').click();
    await page.waitForSelector('text=เลือกข้อสอบและตัวกรอง', { timeout: 5000 });
    await page.locator('button[aria-label="ขนาดตัวอักษรมือถือ ใหญ่"]').click();
    await page.locator('button:has-text("ตัดช้อยส์")').last().click();
    await page.waitForSelector('text=โหมดตัดช้อยส์เปิดอยู่:', { timeout: 5000 });
    const lgFontApplied = await page.evaluate(() =>
      Boolean(document.querySelector('.font-exam .text-\\[19px\\]'))
    );
    assert.equal(lgFontApplied, true, 'Mobile drawer A+ button should increase stem font size to 19px');
    await page.locator('button[aria-label="ปิดแผนผังข้อสอบ"]').click();
    console.log('   Verified mobile 390x844 layout, bottom-bar active state, and drawer A+/cut controls');

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

