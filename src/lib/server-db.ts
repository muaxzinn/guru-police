import fs from 'node:fs';
import path from 'node:path';
import { SUBJECT_MAP, SUBJECTS, TRACKS, type SubjectKey } from './constants';

export interface QuestionRecord {
  id: number;
  subject_key: SubjectKey;
  set_id: number | null;
  title: string | null;
  batch: string | null;
  stem: string | null;
  img: string | null;
  opts: string[];
  opt_imgs: (string | null)[] | null;
  correct_index: number;
  correct_label: string;
  explanation: string | null;
  explanation_img: string | null;
}

export interface RunnerQuestion {
  id: number;
  subject: SubjectKey;
  title: string | null;
  b: string;
  img: string | null;
  opts: string[];
  optImgs: (string | null)[] | null;
  c: number;
  e: string | null;
  eImg: string | null;
}

export interface ArticleRecord {
  kind: 'article' | 'news';
  slug: string;
  url: string;
  title: string;
  description: string;
  h1: string;
  headings: string[];
  images: string[];
  text: string;
}

export interface ExamSetSummary {
  id: number;
  kind: 'form' | 'subject';
  title: string;
  subtitle: string;
  total: number;
  timeMinutes: number;
  subjectKey: SubjectKey | null;
  track: string | null;
  subjectBreakdown: Partial<Record<SubjectKey, number>>;
}

export interface AttemptSubjectStat {
  key: SubjectKey;
  correct: number;
  total: number;
  pct: number;
}

export interface AttemptTopicStat {
  title: string;
  subjectKey: SubjectKey;
  correct: number;
  total: number;
  pct: number;
}

export interface AttemptGroupStat {
  grp: 'general' | 'specific';
  label: string;
  correct: number;
  total: number;
  pct: number;
  pass: boolean;
}

export interface AttemptRecord {
  id: number;
  setId: string;
  setTitle: string;
  mode: 'real' | 'practice';
  startedAt: string;
  submittedAt: string;
  durationSec: number;
  score: number;
  total: number;
  pct: number;
  passed: boolean;
  perSubject: AttemptSubjectStat[];
  groups: AttemptGroupStat[];
  perTopic: AttemptTopicStat[];
  wrongIndices: number[];
  questionIds: number[];
  answers: (number | null)[];
  bookmarkedIds: number[];
}

export interface ReportRecord {
  id: number;
  questionId: number | null;
  questionText: string;
  category: 'question' | 'system';
  reason: string;
  note: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface ExamProgressRecord {
  setId: string;
  mode: 'real' | 'practice';
  list: Array<{ id: number; subject: SubjectKey }>;
  answers: (number | null)[];
  cur: number;
  startedAt: string;
  endAt: number;
  updatedAt: number;
  activeSec: number;
  awayAt: number | null;
}

export interface UserProfile {
  track: string;
  bookmarks: number[];
  mistakeIds: number[];
  streakDays: number;
  lastActiveDate: string | null;
}

export interface RuntimeState {
  profile: UserProfile;
  attempts: AttemptRecord[];
  examProgress: ExamProgressRecord | null;
  reports: ReportRecord[];
  customSets: ExamSetSummary[];
  customSetQuestionIds: Record<string, number[]>;
  customQuestions: QuestionRecord[];
  leaderboard: Array<{
    track: string;
    nameMasked: string;
    score: number;
    total: number;
    durationFormatted: string;
    isChampion?: boolean;
  }>;
}

const KB_DATASET_DIR = path.join(process.cwd(), 'data', 'dataset');
const KB_Q_IMAGES_DIR = path.join(process.cwd(), 'public', 'question-images');
const KB_Q_SVGS_DIR = path.join(process.cwd(), 'public', 'question-svgs');
const RUNTIME_STATE_PATH = path.join(process.cwd(), 'data', 'runtime-state.json');
const TMP_RUNTIME_STATE_PATH = '/tmp/guru-runtime-state.json';

interface StoreCache {
  questions: QuestionRecord[];
  questionsById: Map<number, QuestionRecord>;
  setsMap: Map<string, number[]>;
  examSets: ExamSetSummary[];
  articles: ArticleRecord[];
  news: ArticleRecord[];
  imageUrlMap: Map<string, string>;
  imageCount: number;
  topics: Array<{ title: string; subjectKey: SubjectKey; count: number }>;
  batches: Array<{ batch: string; count: number }>;
}

const globalForStore = globalThis as typeof globalThis & {
  __guruStore?: StoreCache;
  __guruRuntime?: RuntimeState;
};

const IMAGE_URL_ONLY_RE =
  /^(?:https?:\/\/\S+\.(?:png|jpe?g|webp|gif|svg)|\/question-images\/\S+|\/question-svgs\/\S+|\/qimg\/\S+|\/simg\/\S+)$/i;

function resolveLocalImageUrl(raw: string | null | undefined, urlMap: Map<string, string>): string | null {
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

function buildStore(): StoreCache {
  if (globalForStore.__guruStore) return globalForStore.__guruStore;

  const imageUrlMap = new Map<string, string>();
  const harvestReportPath = path.join(KB_DATASET_DIR, 'harvest-report.json');
  if (fs.existsSync(harvestReportPath)) {
    const harvestReport = JSON.parse(fs.readFileSync(harvestReportPath, 'utf8'));
    for (const item of harvestReport.downloaded_question_images || []) {
      if (item.url && item.file) {
        imageUrlMap.set(item.url, `/question-images/${item.file}`);
      }
    }
  }
  // Map the 2 proxy-retried images observed in harvest-report
  imageUrlMap.set('https://guru-eng-exam-images.netlify.app/i/01-9b4075aa/q269.png', '/question-images/retry-01-q269.png');
  imageUrlMap.set('https://guru-eng-exam-images.netlify.app/i/01-2-b2282906/q31.png', '/question-images/retry-02-q31.png');

  const rawQuestions: QuestionRecord[] = JSON.parse(
    fs.readFileSync(path.join(KB_DATASET_DIR, 'all-questions.json'), 'utf8')
  );

  const questions: QuestionRecord[] = rawQuestions.map((q) => {
    const stemTrim = typeof q.stem === 'string' ? q.stem.trim() : '';
    const stemIsImg = Boolean(stemTrim && IMAGE_URL_ONLY_RE.test(stemTrim));
    const resolvedStemImg = stemIsImg ? resolveLocalImageUrl(stemTrim, imageUrlMap) || stemTrim : null;

    const expTrim = typeof q.explanation === 'string' ? q.explanation.trim() : '';
    const expIsImg = Boolean(expTrim && IMAGE_URL_ONLY_RE.test(expTrim));
    const resolvedExpImg = expIsImg ? resolveLocalImageUrl(expTrim, imageUrlMap) || expTrim : null;

    const rawOpts = Array.isArray(q.opts) ? q.opts : [];
    const existingOptImgs = Array.isArray(q.opt_imgs) ? q.opt_imgs : [];
    const normalizedOptImgs: (string | null)[] = rawOpts.map((opt, idx) => {
      const existing = resolveLocalImageUrl(existingOptImgs[idx], imageUrlMap);
      if (existing) return existing;
      const optTrim = typeof opt === 'string' ? opt.trim() : '';
      if (optTrim && IMAGE_URL_ONLY_RE.test(optTrim)) {
        return resolveLocalImageUrl(optTrim, imageUrlMap) || optTrim;
      }
      return null;
    });
    const normalizedOpts: string[] = rawOpts.map((opt) => {
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

  const questionsById = new Map<number, QuestionRecord>();
  const topicCounter = new Map<string, { title: string; subjectKey: SubjectKey; count: number }>();
  const batchCounter = new Map<string, number>();

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

  // Load 22 sets (101..107, 201..215)
  const setsMap = new Map<string, number[]>();
  const examSets: ExamSetSummary[] = [];

  for (let i = 0; i < SUBJECTS.length; i++) {
    const s = SUBJECTS[i];
    const sid = String(101 + i);
    const setFile = path.join(KB_DATASET_DIR, 'questions', 'by-set', `set-${sid}.json`);
    let qIds: number[] = [];
    if (fs.existsSync(setFile)) {
      const items = JSON.parse(fs.readFileSync(setFile, 'utf8'));
      qIds = items.map((it: { id: number }) => it.id).filter((id: number) => questionsById.has(id));
    }
    setsMap.set(sid, qIds);
    examSets.push({
      id: Number(sid),
      kind: 'subject',
      title: `ฝึกรายวิชา · ${s.name}`,
      subtitle: 'เจาะลึกรายวิชา พร้อมเฉลยละเอียด',
      total: qIds.length || 20,
      timeMinutes: qIds.length || 20,
      subjectKey: s.key,
      track: 'ฝึกรายวิชา',
      subjectBreakdown: computeSubjectBreakdown(qIds, (id) => questionsById.get(id)),
    });
  }

  for (let i = 1; i <= 15; i++) {
    const sid = String(200 + i);
    const setFile = path.join(KB_DATASET_DIR, 'questions', 'by-set', `set-${sid}.json`);
    let qIds: number[] = [];
    if (fs.existsSync(setFile)) {
      const items = JSON.parse(fs.readFileSync(setFile, 'utf8'));
      qIds = items.map((it: { id: number }) => it.id).filter((id: number) => questionsById.has(id));
    }
    setsMap.set(sid, qIds);
    examSets.push({
      id: Number(sid),
      kind: 'form',
      title: `ข้อสอบจำลองนายสิบตำรวจ ชุดที่ ${i}`,
      subtitle: 'แนวข้อสอบเสมือนจริง 150 ข้อ · เวลา 180 นาที',
      total: qIds.length || 150,
      timeMinutes: 180,
      subjectKey: null,
      track: 'ข้อสอบจำลอง 150 ข้อ',
      subjectBreakdown: computeSubjectBreakdown(qIds, (id) => questionsById.get(id)),
    });
  }

  const articlesData = JSON.parse(fs.readFileSync(path.join(KB_DATASET_DIR, 'articles-and-news.json'), 'utf8'));
  const svgCount = fs.existsSync(KB_Q_SVGS_DIR)
    ? fs.readdirSync(KB_Q_SVGS_DIR).filter((f) => f.endsWith('.svg')).length
    : 0;
  const rasterCount = fs.existsSync(KB_Q_IMAGES_DIR)
    ? fs.readdirSync(KB_Q_IMAGES_DIR).filter((f) => !f.startsWith('.')).length
    : 0;
  const imageCount = svgCount + rasterCount;

  const store: StoreCache = {
    questions,
    questionsById,
    setsMap,
    examSets,
    articles: articlesData.articles || [],
    news: articlesData.news || [],
    imageUrlMap,
    imageCount,
    topics: Array.from(topicCounter.values()).sort((a, b) => b.count - a.count),
    batches: Array.from(batchCounter.entries())
      .map(([batch, count]) => ({ batch, count }))
      .sort((a, b) => b.count - a.count),
  };

  globalForStore.__guruStore = store;
  return store;
}

export function computeSubjectBreakdown(
  questionIds: number[],
  lookup: (id: number) => QuestionRecord | undefined
): Partial<Record<SubjectKey, number>> {
  const breakdown: Partial<Record<SubjectKey, number>> = {};
  for (const id of questionIds) {
    const q = lookup(id);
    if (!q) continue;
    breakdown[q.subject_key] = (breakdown[q.subject_key] || 0) + 1;
  }
  return breakdown;
}

export function getStore(): StoreCache {
  return buildStore();
}

export function toRunnerQuestion(q: QuestionRecord): RunnerQuestion {
  return {
    id: q.id,
    subject: q.subject_key,
    title: q.title,
    b: q.stem || '',
    img: q.img,
    opts: q.opts,
    optImgs: q.opt_imgs,
    c: q.correct_index,
    e: q.explanation,
    eImg: q.explanation_img,
  };
}

function getDefaultRuntimeState(): RuntimeState {
  return {
    profile: {
      track: 'สายอำนวยการ / พิสูจน์หลักฐาน',
      bookmarks: [],
      mistakeIds: [],
      streakDays: 1,
      lastActiveDate: null,
    },
    attempts: [],
    examProgress: null,
    reports: [],
    customSets: [],
    customSetQuestionIds: {},
    customQuestions: [],
    leaderboard: [
      { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'พงษ*** ถูก***', score: 150, total: 150, durationFormatted: '1:02:50 ชม.', isChampion: true },
      { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'ศศิ*** สกุ***', score: 150, total: 150, durationFormatted: '1:03:09 ชม.' },
      { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'วาร*** คำ***', score: 150, total: 150, durationFormatted: '1:23:43 ชม.' },
      { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'ชัย*** นิร***', score: 150, total: 150, durationFormatted: '2:04:43 ชม.' },
      { track: 'สายอำนวยการ / พิสูจน์หลักฐาน', nameMasked: 'Pho*** Lhu***', score: 147, total: 150, durationFormatted: '1:53:49 ชม.' },
      { track: 'ปราบปราม (บุคคลทั่วไป)', nameMasked: 'กิต*** พง***', score: 146, total: 150, durationFormatted: '1:18:12 ชม.', isChampion: true },
      { track: 'ปราบปราม (บุคคลทั่วไป)', nameMasked: 'ธน*** สุข***', score: 142, total: 150, durationFormatted: '1:29:44 ชม.' },
      { track: 'ปราบปราม (ทหารเกณฑ์)', nameMasked: 'ณัฐ*** ชัย***', score: 145, total: 150, durationFormatted: '1:11:05 ชม.', isChampion: true },
      { track: 'ปราบปราม (ทหารเกณฑ์)', nameMasked: 'อร*** มี***', score: 139, total: 150, durationFormatted: '1:34:20 ชม.' },
    ],
  };
}

export function readRuntimeState(): RuntimeState {
  if (globalForStore.__guruRuntime) {
    return globalForStore.__guruRuntime;
  }

  let raw: Partial<RuntimeState> | null = null;
  const sourcePath = fs.existsSync(TMP_RUNTIME_STATE_PATH)
    ? TMP_RUNTIME_STATE_PATH
    : fs.existsSync(RUNTIME_STATE_PATH)
      ? RUNTIME_STATE_PATH
      : null;

  if (sourcePath) {
    try {
      raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as Partial<RuntimeState>;
    } catch {
      raw = null;
    }
  }

  if (!raw) {
    const initial = getDefaultRuntimeState();
    writeRuntimeState(initial);
    return initial;
  }

  const defaults = getDefaultRuntimeState();
  const rawProf = raw?.profile;
  const customSetQuestionIds: Record<string, number[]> = raw?.customSetQuestionIds || {};
  const store = getStore();
  const customSets: ExamSetSummary[] = Array.isArray(raw?.customSets)
    ? raw.customSets.map((s: ExamSetSummary) => {
        if (s.subjectBreakdown && Object.keys(s.subjectBreakdown).length > 0) return s;
        const ids = customSetQuestionIds[String(s.id)] || [];
        return {
          ...s,
          subjectBreakdown: computeSubjectBreakdown(ids, (id) => store.questionsById.get(id)),
        };
      })
    : [];

  const normalized: RuntimeState = {
    profile: {
      track: typeof rawProf?.track === 'string' && rawProf.track ? rawProf.track : defaults.profile.track,
      bookmarks: Array.isArray(rawProf?.bookmarks) ? rawProf.bookmarks.map(Number) : [],
      mistakeIds: Array.isArray(rawProf?.mistakeIds) ? rawProf.mistakeIds.map(Number) : [],
      streakDays: typeof rawProf?.streakDays === 'number' ? rawProf.streakDays : 1,
      lastActiveDate: typeof rawProf?.lastActiveDate === 'string' ? rawProf.lastActiveDate : null,
    },
    attempts: Array.isArray(raw?.attempts) ? raw.attempts : [],
    examProgress: raw?.examProgress || null,
    reports: Array.isArray(raw?.reports) ? raw.reports : [],
    customSets,
    customSetQuestionIds,
    customQuestions: Array.isArray(raw?.customQuestions) ? raw.customQuestions : [],
    leaderboard:
      Array.isArray(raw?.leaderboard) && raw.leaderboard.length > 0
        ? raw.leaderboard
        : defaults.leaderboard,
  };
  globalForStore.__guruRuntime = normalized;
  return normalized;
}

export function writeRuntimeState(state: RuntimeState): void {
  globalForStore.__guruRuntime = state;
  const serialized = JSON.stringify(state, null, 2);
  try {
    fs.mkdirSync(path.dirname(RUNTIME_STATE_PATH), { recursive: true });
    const tmpPath = `${RUNTIME_STATE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, serialized);
    fs.renameSync(tmpPath, RUNTIME_STATE_PATH);
  } catch {
    try {
      fs.writeFileSync(TMP_RUNTIME_STATE_PATH, serialized);
    } catch {
      // ignore read-only environments without /tmp writable access
    }
  }
}

export function getAllQuestionsMerged(): QuestionRecord[] {
  const store = getStore();
  const runtime = readRuntimeState();
  if (!runtime.customQuestions?.length) return store.questions;
  return [...runtime.customQuestions, ...store.questions];
}

export function findQuestionById(id: number): QuestionRecord | undefined {
  const store = getStore();
  const found = store.questionsById.get(id);
  if (found) return found;
  const runtime = readRuntimeState();
  return runtime.customQuestions?.find((q) => q.id === id);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function withSubjectFilter(
  picked: QuestionRecord[],
  baseTitle: string,
  durationMin: number,
  passRule: 'groups' | 'overall',
  subjectFilter?: string
): { title: string; durationSec: number; passRule: 'groups' | 'overall'; items: RunnerQuestion[] } {
  const validSubject =
    subjectFilter && Object.prototype.hasOwnProperty.call(SUBJECT_MAP, subjectFilter)
      ? (subjectFilter as SubjectKey)
      : null;

  if (validSubject) {
    const filtered = picked.filter((q) => q.subject_key === validSubject);
    const meta = SUBJECT_MAP[validSubject];
    return {
      title: `${baseTitle} · เฉพาะวิชา${meta.name} (${filtered.length} ข้อ)`,
      durationSec: Math.max(5, filtered.length) * 60,
      passRule: 'overall',
      items: filtered.map(toRunnerQuestion),
    };
  }

  return {
    title: baseTitle,
    durationSec: durationMin * 60,
    passRule,
    items: picked.map(toRunnerQuestion),
  };
}

export function buildExamForSetId(
  setId: string,
  options?: {
    trackName?: string;
    count?: number;
    subject?: string;
    topic?: string;
    shuffleMode?: boolean;
    setIndex?: number;
  }
): { title: string; durationSec: number; passRule: 'groups' | 'overall'; items: RunnerQuestion[] } {
  const store = getStore();
  const runtime = readRuntimeState();
  const all = getAllQuestionsMerged();

  // 1. Mistake notebook drill
  if (setId === 'mistakes') {
    const ids = runtime.profile.mistakeIds;
    const picked = ids.map((id) => findQuestionById(id)).filter((q): q is QuestionRecord => Boolean(q));
    return withSubjectFilter(picked, 'ซ่อมข้อสอบที่ตอบผิด', Math.max(10, picked.length), 'overall', options?.subject);
  }

  // 2. Bookmarked questions drill
  if (setId === 'bookmarks') {
    const ids = runtime.profile.bookmarks;
    const picked = ids.map((id) => findQuestionById(id)).filter((q): q is QuestionRecord => Boolean(q));
    return withSubjectFilter(picked, 'ทบทวนข้อสอบที่ติดดาวไว้', Math.max(10, picked.length), 'overall', options?.subject);
  }

  // 3. Specific Sub-Topic drill
  if (setId === 'topic') {
    const filtered = all.filter(
      (q) =>
        (!options?.subject || q.subject_key === options.subject) &&
        (!options?.topic || q.title === options.topic)
    );
    const limit = Math.min(options?.count || 30, filtered.length);
    const picked = shuffle(filtered).slice(0, limit);
    return {
      title: `เจาะลึกหัวข้อ · ${options?.topic || 'รวม'}`,
      durationSec: Math.max(10, picked.length) * 60,
      passRule: 'overall',
      items: picked.map(toRunnerQuestion),
    };
  }

  // 4. Random track-weighted mock exam (exact weights, supports optional count & subject filter)
  if (setId.startsWith('random')) {
    const idxMatch = /^random-(\d+)$/.exec(setId);
    const track =
      (idxMatch && TRACKS[Number(idxMatch[1])]) ||
      TRACKS.find((t) => t.name === options?.trackName) ||
      TRACKS[0];

    const totalWeight = Object.values(track.weights).reduce((acc, w) => acc + w, 0) || 150;
    const desiredTotal =
      options?.count && options.count > 0 && options.count < totalWeight
        ? options.count
        : totalWeight;

    const collected: QuestionRecord[] = [];
    const entries = (Object.keys(track.weights) as SubjectKey[]).filter((sk) => track.weights[sk] > 0);
    for (let i = 0; i < entries.length; i++) {
      const sk = entries[i];
      const weight = track.weights[sk];
      const targetCount =
        i === entries.length - 1
          ? Math.max(0, desiredTotal - collected.length)
          : Math.max(1, Math.round((weight / totalWeight) * desiredTotal));
      if (!targetCount) continue;
      const pool = shuffle(all.filter((q) => q.subject_key === sk));
      collected.push(...pool.slice(0, targetCount));
    }
    const finalItems = collected.slice(0, desiredTotal);
    return withSubjectFilter(
      finalItems,
      `ข้อสอบสุ่มครบทุกวิชา · ${track.name}`,
      desiredTotal === 150 ? 180 : Math.max(15, desiredTotal),
      'groups',
      options?.subject
    );
  }

  // 5. Dynamic Subject Drill (`subject-math`, supports sequential chunking via `setIndex` or random `count`)
  if (setId.startsWith('subject-')) {
    const sk = setId.replace('subject-', '') as SubjectKey;
    const meta = SUBJECT_MAP[sk] || SUBJECTS[0];
    const chunkSize = Math.max(5, Math.min(150, options?.count || 20));
    const subjectPool = all
      .filter((q) => q.subject_key === meta.key)
      .slice()
      .sort((a, b) => a.id - b.id);

    if (options?.setIndex && Number.isFinite(options.setIndex) && options.setIndex >= 1) {
      const totalSets = Math.max(1, Math.ceil(subjectPool.length / chunkSize));
      const safeSetIdx = Math.min(Math.floor(options.setIndex), totalSets);
      const start = (safeSetIdx - 1) * chunkSize;
      const picked = subjectPool.slice(start, start + chunkSize);
      return {
        title: `ชุดข้อสอบแยกวิชา · ${meta.name} ชุดที่ ${safeSetIdx}`,
        durationSec: Math.max(5, picked.length) * 60,
        passRule: 'overall',
        items: picked.map(toRunnerQuestion),
      };
    }

    const pool = shuffle(subjectPool).slice(0, chunkSize);
    return {
      title: `ฝึกรายวิชา · ${meta.name} (${pool.length} ข้อ)`,
      durationSec: Math.max(5, pool.length) * 60,
      passRule: 'overall',
      items: pool.map(toRunnerQuestion),
    };
  }

  // 6. Custom admin set or built-in catalog set (`101..107`, `201..215`)
  const customIds = runtime.customSetQuestionIds[setId];
  if (customIds?.length) {
    const customMeta = runtime.customSets.find((s) => String(s.id) === setId);
    const picked = customIds.map((id) => findQuestionById(id)).filter((q): q is QuestionRecord => Boolean(q));
    return withSubjectFilter(
      picked,
      customMeta?.title || `ชุดข้อสอบกำหนดเอง #${setId}`,
      customMeta?.timeMinutes || picked.length,
      customMeta?.subjectKey ? 'overall' : 'groups',
      options?.subject
    );
  }

  const fixedIds = store.setsMap.get(setId);
  const setMeta = store.examSets.find((s) => String(s.id) === setId);
  if (fixedIds && fixedIds.length > 0) {
    let picked = fixedIds.map((id) => store.questionsById.get(id)).filter((q): q is QuestionRecord => Boolean(q));
    if (options?.shuffleMode && setMeta?.subjectKey) {
      picked = shuffle(all.filter((q) => q.subject_key === setMeta.subjectKey)).slice(0, options?.count || 20);
    }
    return withSubjectFilter(
      picked,
      setMeta?.title || `ชุดข้อสอบ #${setId}`,
      setMeta?.timeMinutes || picked.length,
      setMeta?.kind === 'subject' ? 'overall' : 'groups',
      options?.subject
    );
  }

  // Fallback
  const fallback = shuffle(all).slice(0, 20);
  return {
    title: `ชุดข้อสอบฝึกหัด #${setId}`,
    durationSec: 20 * 60,
    passRule: 'overall',
    items: fallback.map(toRunnerQuestion),
  };
}
