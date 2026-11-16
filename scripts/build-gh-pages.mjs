import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DATASET_DIR = path.join(ROOT_DIR, 'data', 'dataset');
const Q_IMAGES_DIR = path.join(ROOT_DIR, 'public', 'question-images');
const Q_SVGS_DIR = path.join(ROOT_DIR, 'public', 'question-svgs');
const STATIC_DATA_DIR = path.join(ROOT_DIR, 'public', 'static-data');
const STASH_DIR = path.join(ROOT_DIR, '.gh-pages-stash');
const OUT_DIR = path.join(ROOT_DIR, 'out');
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '/guru-police';

const SUBJECTS = [
  { key: 'math', name: 'ความสามารถทั่วไป', setId: 101 },
  { key: 'thai', name: 'ภาษาไทย', setId: 102 },
  { key: 'eng', name: 'ภาษาอังกฤษ', setId: 103 },
  { key: 'com', name: 'คอมพิวเตอร์', setId: 104 },
  { key: 'doc', name: 'งานสารบรรณ + ลักษณะที่ 54', setId: 105 },
  { key: 'law', name: 'กฎหมาย', setId: 106 },
  { key: 'soc', name: 'สังคม', setId: 107 },
];

const DEFAULT_LEADERBOARD = [
  { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'พงษ*** ถูก***', score: 150, total: 150, durationFormatted: '1:02:50 ชม.', isChampion: true },
  { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'ศศิ*** สกุ***', score: 150, total: 150, durationFormatted: '1:03:09 ชม.' },
  { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'วาร*** คำ***', score: 150, total: 150, durationFormatted: '1:23:43 ชม.' },
  { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'ชัย*** นิร***', score: 150, total: 150, durationFormatted: '2:04:43 ชม.' },
  { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'Pho*** Lhu***', score: 147, total: 150, durationFormatted: '1:53:49 ชม.' },
  { track: 'ปราบปราม (บุคคลทั่วไป)', nameMasked: 'กิต*** พง***', score: 146, total: 150, durationFormatted: '1:18:12 ชม.', isChampion: true },
  { track: 'ปราบปราม (บุคคลทั่วไป)', nameMasked: 'ธน*** สุข***', score: 142, total: 150, durationFormatted: '1:29:44 ชม.' },
  { track: 'ปราบปราม (ทหารเกณฑ์)', nameMasked: 'ณัฐ*** ชัย***', score: 145, total: 150, durationFormatted: '1:11:05 ชม.', isChampion: true },
  { track: 'ปราบปราม (ทหารเกณฑ์)', nameMasked: 'อร*** มี***', score: 139, total: 150, durationFormatted: '1:34:20 ชม.' },
];

const IMAGE_URL_ONLY_RE =
  /^(?:https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg)|\/question-images\/\S+|\/question-svgs\/\S+|\/qimg\/\S+|\/simg\/\S+)$/i;

/**
 * @param {string | null | undefined} raw
 * @param {Map<string, string>} urlMap
 * @returns {string | null}
 */
function resolveLocalImageUrl(raw, urlMap) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/question-images/') || trimmed.startsWith('/question-svgs/')) return trimmed;

  const direct = urlMap.get(trimmed);
  if (direct) return direct;

  if (trimmed.startsWith('/qimg/')) {
    const abs = `https://guru-eng-exam-images.netlify.app/${trimmed.slice('/qimg/'.length)}`;
    return urlMap.get(abs) || trimmed;
  }
  if (trimmed.startsWith('/simg/')) {
    const abs = `https://wnsgsamwljlkzgtvyssx.supabase.co/storage/v1/object/public/${trimmed.slice('/simg/'.length)}`;
    return urlMap.get(abs) || trimmed;
  }
  return trimmed;
}

/**
 * @param {number[]} questionIds
 * @param {Map<number, { subject_key: string }>} byId
 * @returns {Record<string, number>}
 */
function computeSubjectBreakdown(questionIds, byId) {
  /** @type {Record<string, number>} */
  const breakdown = {};
  for (const id of questionIds) {
    const q = byId.get(id);
    if (!q) continue;
    breakdown[q.subject_key] = (breakdown[q.subject_key] || 0) + 1;
  }
  return breakdown;
}

function generateStaticDataset() {
  /** @type {Map<string, string>} */
  const imageUrlMap = new Map();
  const harvestReportPath = path.join(DATASET_DIR, 'harvest-report.json');
  if (fs.existsSync(harvestReportPath)) {
    const harvestReport = JSON.parse(fs.readFileSync(harvestReportPath, 'utf8'));
    for (const item of harvestReport.downloaded_question_images || []) {
      if (item.url && item.file) {
        imageUrlMap.set(item.url, `/question-images/${item.file}`);
      }
    }
  }
  imageUrlMap.set('https://guru-eng-exam-images.netlify.app/i/01-9b4075aa/q269.png', '/question-images/retry-01-q269.png');
  imageUrlMap.set('https://guru-eng-exam-images.netlify.app/i/01-2-b2282906/q31.png', '/question-images/retry-02-q31.png');

  /** @type {Array<Record<string, any>>} */
  const rawQuestions = JSON.parse(
    fs.readFileSync(path.join(DATASET_DIR, 'all-questions.json'), 'utf8')
  );

  /** @type {Array<Record<string, any>>} */
  const questions = rawQuestions.map((q) => {
    const stemTrim = typeof q.stem === 'string' ? q.stem.trim() : '';
    const stemIsImg = Boolean(stemTrim && IMAGE_URL_ONLY_RE.test(stemTrim));
    const resolvedStemImg = stemIsImg ? resolveLocalImageUrl(stemTrim, imageUrlMap) || stemTrim : null;

    const expTrim = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    const expIsImg = Boolean(expTrim && IMAGE_URL_ONLY_RE.test(expTrim));
    const resolvedExpImg = expIsImg ? resolveLocalImageUrl(expTrim, imageUrlMap) || expTrim : null;

    /** @type {string[]} */
    const rawOpts = Array.isArray(q.opts) ? q.opts : [];
    /** @type {Array<string | null>} */
    const existingOptImgs = Array.isArray(q.opt_imgs) ? q.opt_imgs : [];
    const normalizedOptImgs = rawOpts.map((opt, idx) => {
      const existing = resolveLocalImageUrl(existingOptImgs[idx], imageUrlMap);
      if (existing) return existing;
      const optTrim = typeof opt === 'string' ? opt.trim() : '';
      if (optTrim && IMAGE_URL_ONLY_RE.test(optTrim)) {
        return resolveLocalImageUrl(optTrim, imageUrlMap) || optTrim;
      }
      return null;
    });
    const normalizedOpts = rawOpts.map((opt) => {
      const optTrim = typeof opt === 'string' ? opt.trim() : '';
      if (optTrim && IMAGE_URL_ONLY_RE.test(optTrim)) return '';
      return opt;
    });

    return {
      ...q,
      stem: stemIsImg ? 'พิจารณารูปภาพต่อไปนี้แล้วเลือกคำตอบที่ถูกต้อง' : q.stem,
      img: resolveLocalImageUrl(q.img, imageUrlMap) || resolvedStemImg,
      opts: normalizedOpts,
      opt_imgs: normalizedOptImgs.some(Boolean) ? normalizedOptImgs : null,
      explanation: expIsImg ? '' : q.explanation,
      explanation_img: resolveLocalImageUrl(q.explanation_img, imageUrlMap) || resolvedExpImg,
    };
  });

  /** @type {Map<number, any>} */
  const questionsById = new Map();
  /** @type {Map<string, { title: string; subjectKey: string; count: number }>} */
  const topicCounter = new Map();
  /** @type {Map<string, number>} */
  const batchCounter = new Map();

  for (const q of questions) {
    questionsById.set(q.id, q);
    if (q.title) {
      const tKey = `${q.subject_key}::${q.title}`;
      const existing = topicCounter.get(tKey);
      if (existing) existing.count++;
      else topicCounter.set(tKey, { title: q.title, subjectKey: q.subject_key, count: 1 });
    }
    if (q.batch) {
      batchCounter.set(q.batch, (batchCounter.get(q.batch) || 0) + 1);
    }
  }

  /** @type {Record<string, number[]>} */
  const setsMap = {};
  /** @type {Array<Record<string, any>>} */
  const examSets = [];

  for (let i = 0; i < SUBJECTS.length; i++) {
    const s = SUBJECTS[i];
    const sid = String(101 + i);
    const setFile = path.join(DATASET_DIR, 'questions', 'by-set', `set-${sid}.json`);
    /** @type {number[]} */
    let qIds = [];
    if (fs.existsSync(setFile)) {
      const items = JSON.parse(fs.readFileSync(setFile, 'utf8'));
      qIds = items.map((/** @type {{ id: number }} */ it) => it.id).filter((/** @type {number} */ id) => questionsById.has(id));
    }
    setsMap[sid] = qIds;
    examSets.push({
      id: Number(sid),
      kind: 'subject',
      title: `ฝึกรายวิชา · ${s.name}`,
      subtitle: 'เจาะลึกรายวิชา พร้อมเฉลยละเอียด',
      total: qIds.length || 20,
      timeMinutes: qIds.length || 20,
      subjectKey: s.key,
      track: 'ฝึกรายวิชา',
      subjectBreakdown: computeSubjectBreakdown(qIds, questionsById),
    });
  }

  for (let i = 1; i <= 15; i++) {
    const sid = String(200 + i);
    const setFile = path.join(DATASET_DIR, 'questions', 'by-set', `set-${sid}.json`);
    /** @type {number[]} */
    let qIds = [];
    if (fs.existsSync(setFile)) {
      const items = JSON.parse(fs.readFileSync(setFile, 'utf8'));
      qIds = items.map((/** @type {{ id: number }} */ it) => it.id).filter((/** @type {number} */ id) => questionsById.has(id));
    }
    setsMap[sid] = qIds;
    examSets.push({
      id: Number(sid),
      kind: 'form',
      title: `ข้อสอบจำลองนายสิบตำรวจ ชุดที่ ${i}`,
      subtitle: 'แนวข้อสอบเสมือนจริง 150 ข้อ · เวลา 180 นาที',
      total: qIds.length || 150,
      timeMinutes: 180,
      subjectKey: null,
      track: 'ข้อสอบจำลอง 150 ข้อ',
      subjectBreakdown: computeSubjectBreakdown(qIds, questionsById),
    });
  }

  const articlesData = JSON.parse(fs.readFileSync(path.join(DATASET_DIR, 'articles-and-news.json'), 'utf8'));
  const svgCount = fs.existsSync(Q_SVGS_DIR)
    ? fs.readdirSync(Q_SVGS_DIR).filter((f) => f.endsWith('.svg')).length
    : 0;
  const rasterCount = fs.existsSync(Q_IMAGES_DIR)
    ? fs.readdirSync(Q_IMAGES_DIR).filter((f) => !f.startsWith('.')).length
    : 0;
  const imageCount = svgCount + rasterCount;

  const questionMeta = questions.map((q) => ({
    id: q.id,
    s: q.subject_key,
    t: q.title || '',
  }));

  /** @type {Record<string, Array<Record<string, any>>>} */
  const shardsBySubject = {};
  for (const s of SUBJECTS) {
    shardsBySubject[s.key] = [];
  }
  for (const q of questions) {
    if (shardsBySubject[q.subject_key]) {
      shardsBySubject[q.subject_key].push(q);
    }
  }

  const meta = {
    totalQuestions: questions.length,
    examSets,
    setsMap,
    topics: Array.from(topicCounter.values()).sort((a, b) => b.count - a.count),
    batches: Array.from(batchCounter.entries())
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count),
    imageCount,
    articlesCount: (articlesData.articles || []).length,
    defaultLeaderboard: DEFAULT_LEADERBOARD,
    questionMeta,
  };

  fs.mkdirSync(STATIC_DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATIC_DATA_DIR, 'meta.json'), JSON.stringify(meta));
  fs.writeFileSync(path.join(STATIC_DATA_DIR, 'questions.json'), JSON.stringify(questions));
  for (const s of SUBJECTS) {
    fs.writeFileSync(
      path.join(STATIC_DATA_DIR, `questions-${s.key}.json`),
      JSON.stringify(shardsBySubject[s.key] || [])
    );
  }
  console.log(
    `Generated public/static-data/ (questions=${questions.length}, sets=${examSets.length}, topics=${meta.topics.length}, images=${imageCount}, shards=${SUBJECTS.length})`
  );
}

const STASH_TARGETS = [
  ['src/app/api', 'api'],
  ['src/app/qimg', 'qimg'],
  ['src/app/simg', 'simg'],
];

function stashServerRoutes() {
  fs.mkdirSync(STASH_DIR, { recursive: true });
  for (const [srcRel, name] of STASH_TARGETS) {
    const srcAbs = path.join(ROOT_DIR, srcRel);
    const dstAbs = path.join(STASH_DIR, name);
    if (fs.existsSync(srcAbs)) {
      if (fs.existsSync(dstAbs)) fs.rmSync(dstAbs, { recursive: true, force: true });
      fs.renameSync(srcAbs, dstAbs);
    }
  }
}

function restoreServerRoutes() {
  for (const [srcRel, name] of STASH_TARGETS) {
    const srcAbs = path.join(ROOT_DIR, srcRel);
    const dstAbs = path.join(STASH_DIR, name);
    if (fs.existsSync(dstAbs)) {
      if (fs.existsSync(srcAbs)) fs.rmSync(srcAbs, { recursive: true, force: true });
      fs.renameSync(dstAbs, srcAbs);
    }
  }
  if (fs.existsSync(STASH_DIR)) {
    fs.rmSync(STASH_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(STATIC_DATA_DIR)) {
    fs.rmSync(STATIC_DATA_DIR, { recursive: true, force: true });
  }
}

function main() {
  try {
    generateStaticDataset();
    stashServerRoutes();

    fs.rmSync(path.join(ROOT_DIR, '.next'), { recursive: true, force: true });
    fs.rmSync(OUT_DIR, { recursive: true, force: true });

    console.log(`Building static export for GitHub Pages (basePath=${BASE_PATH})...`);
    execSync('pnpm exec next build', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        GITHUB_PAGES: '1',
        NEXT_PUBLIC_STATIC_EXPORT: '1',
        NEXT_PUBLIC_BASE_PATH: BASE_PATH,
      },
    });

    fs.writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');
    const notFoundPath = path.join(OUT_DIR, '404.html');
    const indexPath = path.join(OUT_DIR, 'index.html');
    if (!fs.existsSync(notFoundPath) && fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, notFoundPath);
    }
    console.log('Static export ready at out/ (.nojekyll included)');
  } finally {
    restoreServerRoutes();
  }
}

main();
