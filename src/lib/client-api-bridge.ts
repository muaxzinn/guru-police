'use client';

import {
  CHOICE_LABELS,
  resolveTopicSelection,
  SUBJECT_MAP,
  TRACKS,
  type SubjectKey,
} from './constants';
import {
  applyQuestionOutcomes,
  backfillProfileHistoryFromAttempts,
  buildExamFromSource,
  computeSubjectBreakdown,
  getCompletedIdSets,
  resetCompletedHistory,
  shufflePool,
  toRunnerQuestion,
  type BuildExamOptions,
  type CompletedPoolMode,
  type QuestionOutcome,
} from './question-pool';
import type {
  AttemptGroupStat,
  AttemptRecord,
  AttemptSubjectStat,
  AttemptTopicStat,
  ExamSetSummary,
  QuestionRecord,
  ReportRecord,
  RuntimeState,
} from './server-db';

interface StaticMetaPayload {
  examSets: ExamSetSummary[];
  setsMap: Record<string, number[]>;
  topics: Array<{ title: string; subjectKey: SubjectKey; count: number }>;
  batches: Array<{ batch: string; count: number }>;
  imageCount: number;
  articlesCount: number;
  defaultLeaderboard: RuntimeState['leaderboard'];
}

interface StaticStore {
  meta: StaticMetaPayload;
  questions: QuestionRecord[];
  questionsById: Map<number, QuestionRecord>;
}

const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
const RUNTIME_STORAGE_KEY = 'gp:runtime:v2';

let staticStorePromise: Promise<StaticStore> | null = null;
let memoryRuntimeFallback: RuntimeState | null = null;
let bridgeInstalled = false;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getDefaultRuntimeState(defaultLeaderboard?: RuntimeState['leaderboard']): RuntimeState {
  return {
    profile: {
      track: TRACKS[0].name,
      bookmarks: [],
      mistakeIds: [],
      correctIds: [],
      excludeCompleted: true,
      streakDays: 1,
      lastActiveDate: null,
    },
    attempts: [],
    examProgress: null,
    reports: [],
    customSets: [],
    customSetQuestionIds: {},
    customQuestions: [],
    leaderboard: defaultLeaderboard && defaultLeaderboard.length > 0 ? defaultLeaderboard : [],
  };
}

async function loadStaticStore(nativeFetch: typeof window.fetch): Promise<StaticStore> {
  if (!staticStorePromise) {
    staticStorePromise = (async () => {
      const [metaRes, qRes] = await Promise.all([
        nativeFetch(`${BASE_PATH}/static-data/meta.json`),
        nativeFetch(`${BASE_PATH}/static-data/questions.json`),
      ]);
      if (!metaRes.ok || !qRes.ok) {
        throw new Error('Failed to load static exam dataset');
      }
      const meta = (await metaRes.json()) as StaticMetaPayload;
      const questions = (await qRes.json()) as QuestionRecord[];
      const questionsById = new Map<number, QuestionRecord>();
      for (const q of questions) {
        questionsById.set(q.id, q);
      }
      return { meta, questions, questionsById };
    })().catch((err) => {
      staticStorePromise = null;
      throw err;
    });
  }
  return staticStorePromise;
}

function readRuntimeStateClient(store: StaticStore): RuntimeState {
  const defaults = getDefaultRuntimeState(store.meta.defaultLeaderboard);
  let raw: Partial<RuntimeState> | null = memoryRuntimeFallback;

  if (typeof window !== 'undefined') {
    try {
      const serialized = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
      if (serialized) {
        raw = JSON.parse(serialized) as Partial<RuntimeState>;
      }
    } catch {
      // ignore localStorage read failure
    }
  }

  if (!raw) return defaults;

  const rawProf = raw.profile || ({} as Partial<RuntimeState['profile']>);
  const customSetQuestionIds: Record<string, number[]> = raw.customSetQuestionIds || {};
  const customQuestions = Array.isArray(raw.customQuestions) ? raw.customQuestions : [];

  const lookupMerged = (id: number) =>
    store.questionsById.get(id) || customQuestions.find((q) => q.id === id);

  const customSets: ExamSetSummary[] = Array.isArray(raw.customSets)
    ? raw.customSets.map((s) => {
        if (s.subjectBreakdown && Object.keys(s.subjectBreakdown).length > 0) return s;
        const ids = customSetQuestionIds[String(s.id)] || [];
        return {
          ...s,
          subjectBreakdown: computeSubjectBreakdown(ids, lookupMerged),
        };
      })
    : [];

  const attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
  const profile: RuntimeState['profile'] = {
    track: typeof rawProf.track === 'string' && rawProf.track ? rawProf.track : defaults.profile.track,
    bookmarks: Array.isArray(rawProf.bookmarks) ? rawProf.bookmarks.map(Number) : [],
    mistakeIds: Array.isArray(rawProf.mistakeIds) ? rawProf.mistakeIds.map(Number) : [],
    correctIds: Array.isArray(rawProf.correctIds) ? rawProf.correctIds.map(Number) : [],
    excludeCompleted:
      typeof rawProf.excludeCompleted === 'boolean' ? rawProf.excludeCompleted : true,
    streakDays: typeof rawProf.streakDays === 'number' ? rawProf.streakDays : 1,
    lastActiveDate: typeof rawProf.lastActiveDate === 'string' ? rawProf.lastActiveDate : null,
  };

  if (!Array.isArray(rawProf.correctIds) && attempts.length > 0) {
    backfillProfileHistoryFromAttempts(
      profile,
      attempts,
      (qid) => lookupMerged(qid)?.correct_index
    );
  } else {
    const sets = getCompletedIdSets(profile);
    profile.correctIds = Array.from(sets.correctSet);
    profile.mistakeIds = Array.from(sets.mistakeSet);
  }

  return {
    profile,
    attempts,
    examProgress: raw.examProgress || null,
    reports: Array.isArray(raw.reports) ? raw.reports : [],
    customSets,
    customSetQuestionIds,
    customQuestions,
    leaderboard:
      Array.isArray(raw.leaderboard) && raw.leaderboard.length > 0
        ? raw.leaderboard
        : defaults.leaderboard,
  };
}

function writeRuntimeStateClient(state: RuntimeState): void {
  memoryRuntimeFallback = state;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('gp:runtime-updated'));
    } catch {
      // ignore quota failure
    }
  }
}

function getAllQuestionsMergedClient(store: StaticStore, runtime: RuntimeState): QuestionRecord[] {
  if (!runtime.customQuestions?.length) return store.questions;
  return [...runtime.customQuestions, ...store.questions];
}

function findQuestionByIdClient(
  id: number,
  store: StaticStore,
  runtime: RuntimeState
): QuestionRecord | undefined {
  return store.questionsById.get(id) || runtime.customQuestions?.find((q) => q.id === id);
}

function buildExamForSetIdClient(
  store: StaticStore,
  runtime: RuntimeState,
  setId: string,
  options: BuildExamOptions
) {
  const all = getAllQuestionsMergedClient(store, runtime);
  return buildExamFromSource(
    {
      allQuestions: all,
      findById: (id) => findQuestionByIdClient(id, store, runtime),
      fixedIdsForSet: (sid) => runtime.customSetQuestionIds[sid] || store.meta.setsMap[sid],
      setMetaForSet: (sid) =>
        runtime.customSets.find((s) => String(s.id) === sid) ||
        store.meta.examSets.find((s) => String(s.id) === sid),
      profile: runtime.profile,
    },
    setId,
    options
  );
}

async function readBodyJson(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  if (typeof init?.body === 'string') {
    try {
      return JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try {
      return (await input.clone().json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

async function handleApiRequest(
  apiPath: string,
  searchParams: URLSearchParams,
  method: string,
  body: Record<string, unknown>,
  nativeFetch: typeof window.fetch
): Promise<Response> {
  const t0 = Date.now();
  const store = await loadStaticStore(nativeFetch);
  const runtime = readRuntimeStateClient(store);

  // /api/health
  if (apiPath === '/api/health' && method === 'GET') {
    const all = getAllQuestionsMergedClient(store, runtime);
    return jsonResponse({
      status: 'ok',
      db: 'static-local',
      questions: all.length,
      topics: store.meta.topics.length,
      images: store.meta.imageCount,
      sets: store.meta.examSets.length,
      articles: store.meta.articlesCount,
      ms: Date.now() - t0,
      ts: new Date().toISOString(),
    });
  }

  // /api/profile
  if (apiPath === '/api/profile') {
    if (method === 'GET') {
      return jsonResponse({
        profile: runtime.profile,
        leaderboard: runtime.leaderboard,
        attemptsCount: runtime.attempts.length,
        attempts: runtime.attempts.slice(0, 10),
      });
    }
    if (method === 'PATCH') {
      if (typeof body.track === 'string' && body.track.trim()) {
        runtime.profile.track = body.track.trim();
      }
      if (typeof body.excludeCompleted === 'boolean') {
        runtime.profile.excludeCompleted = body.excludeCompleted;
      }
      if (body.toggleBookmarkId !== undefined) {
        const bid = Number(body.toggleBookmarkId);
        const set = new Set(runtime.profile.bookmarks || []);
        if (set.has(bid)) set.delete(bid);
        else set.add(bid);
        runtime.profile.bookmarks = Array.from(set);
      }
      if (Array.isArray(body.questionOutcomes)) {
        const sanitized = body.questionOutcomes
          .filter(
            (item: unknown): item is { id: number; correct: boolean } =>
              Boolean(item && typeof item === 'object' && 'id' in item)
          )
          .map((item: { id: unknown; correct: unknown }) => ({
            id: Number(item.id),
            correct: Boolean(item.correct),
          }));
        applyQuestionOutcomes(runtime.profile, sanitized);
      }
      if (body.clearMistakes) {
        runtime.profile.mistakeIds = [];
      }
      if (body.clearCorrect) {
        runtime.profile.correctIds = [];
      }
      if (body.clearBookmarks) {
        runtime.profile.bookmarks = [];
      }
      if (body.resetCompleted && typeof body.resetCompleted === 'object') {
        const rc = body.resetCompleted as {
          scope?: 'all' | 'subject' | 'topic';
          subject?: SubjectKey;
          topic?: string;
          pool?: CompletedPoolMode;
        };
        resetCompletedHistory(runtime.profile, rc, getAllQuestionsMergedClient(store, runtime));
      }
      if (body.importSync && typeof body.importSync === 'object') {
        const imp = body.importSync as Partial<RuntimeState>;
        if (imp.profile && typeof imp.profile === 'object') {
          runtime.profile = {
            ...runtime.profile,
            ...imp.profile,
            bookmarks: Array.isArray(imp.profile.bookmarks)
              ? imp.profile.bookmarks.map(Number)
              : runtime.profile.bookmarks,
            mistakeIds: Array.isArray(imp.profile.mistakeIds)
              ? imp.profile.mistakeIds.map(Number)
              : runtime.profile.mistakeIds,
            correctIds: Array.isArray(imp.profile.correctIds)
              ? imp.profile.correctIds.map(Number)
              : runtime.profile.correctIds || [],
            excludeCompleted:
              typeof imp.profile.excludeCompleted === 'boolean'
                ? imp.profile.excludeCompleted
                : runtime.profile.excludeCompleted ?? true,
          };
        }
        if (Array.isArray(imp.attempts)) {
          runtime.attempts = imp.attempts;
        }
        if (imp.examProgress !== undefined) {
          runtime.examProgress = imp.examProgress;
        }
      }
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, profile: runtime.profile });
    }
  }

  // /api/progress
  if (apiPath === '/api/progress') {
    if (method === 'GET') {
      return jsonResponse({ progress: runtime.examProgress });
    }
    if (method === 'POST') {
      runtime.examProgress = (body.progress as RuntimeState['examProgress']) || null;
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true });
    }
    if (method === 'DELETE') {
      runtime.examProgress = null;
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true });
    }
  }

  // /api/exam/:setId
  if (apiPath.startsWith('/api/exam/') && method === 'GET') {
    const setId = decodeURIComponent(apiPath.slice('/api/exam/'.length));
    const trackName = searchParams.get('track') || undefined;
    const count = searchParams.get('count') ? Number(searchParams.get('count')) : undefined;
    const subject = searchParams.get('subject') || undefined;
    const topic = searchParams.get('topic') || undefined;
    const shuffleMode = searchParams.get('shuffle') === '1';
    const rawSet = searchParams.get('set');
    const setIndex = rawSet ? Number(rawSet) : undefined;
    const excludeParam = searchParams.get('excludeCompleted');
    const excludeCompleted =
      excludeParam === '1' ? true : excludeParam === '0' ? false : undefined;
    const rawPool = searchParams.get('pool');
    const pool: CompletedPoolMode | undefined =
      rawPool === 'correct' || rawPool === 'wrong' || rawPool === 'all' ? rawPool : undefined;

    const result = buildExamForSetIdClient(store, runtime, setId, {
      trackName,
      count,
      subject,
      topic,
      shuffleMode,
      setIndex,
      excludeCompleted,
      pool,
    });
    return jsonResponse({
      setId,
      ...result,
      total: result.items.length,
    });
  }

  // /api/attempts/:id
  if (apiPath.startsWith('/api/attempts/') && method === 'GET') {
    const id = decodeURIComponent(apiPath.slice('/api/attempts/'.length));
    const attempt = runtime.attempts.find((a) => String(a.id) === id);
    if (!attempt) {
      return jsonResponse({ error: 'ไม่พบประวัติการสอบรายการนี้' }, 404);
    }
    const questions = attempt.questionIds
      .map((qid) => findQuestionByIdClient(qid, store, runtime))
      .map((q) => (q ? toRunnerQuestion(q) : null))
      .filter(Boolean);
    return jsonResponse({ attempt, questions });
  }

  // /api/attempts
  if (apiPath === '/api/attempts') {
    if (method === 'GET') {
      return jsonResponse({ attempts: runtime.attempts });
    }
    if (method === 'POST') {
      const questionIds: number[] = Array.isArray(body.questionIds)
        ? body.questionIds.map(Number)
        : [];
      const answers: (number | null)[] = Array.isArray(body.answers)
        ? (body.answers as (number | null)[])
        : [];
      const bookmarkedIds: number[] = Array.isArray(body.bookmarkedIds)
        ? body.bookmarkedIds.map(Number)
        : [];
      const setId = String(body.setId || 'custom');
      const setTitle = String(body.setTitle || `ชุดข้อสอบ #${setId}`);
      const mode = body.mode === 'practice' ? 'practice' : 'real';
      const passRule = body.passRule === 'overall' ? 'overall' : 'groups';
      const durationSec = Math.max(1, Number(body.durationSec || 0));
      const startedAt = String(body.startedAt || new Date().toISOString());

      if (!questionIds.length) {
        return jsonResponse({ error: 'ไม่มีรายการข้อสอบที่จะตรวจ' }, 400);
      }

      const subjectMap = new Map<SubjectKey, { correct: number; total: number }>();
      const topicMap = new Map<
        string,
        { title: string; subjectKey: SubjectKey; correct: number; total: number }
      >();
      const wrongIndices: number[] = [];
      const outcomes: QuestionOutcome[] = [];
      let score = 0;

      questionIds.forEach((qid, idx) => {
        const q = findQuestionByIdClient(qid, store, runtime);
        if (!q) return;
        const picked = answers[idx] ?? null;
        const isCorrect = picked !== null && picked === q.correct_index;

        const sStat = subjectMap.get(q.subject_key) || { correct: 0, total: 0 };
        sStat.total++;
        if (isCorrect) {
          score++;
          sStat.correct++;
        } else {
          wrongIndices.push(idx);
        }
        if (picked !== null && picked !== undefined) {
          outcomes.push({ id: qid, correct: isCorrect });
        }
        subjectMap.set(q.subject_key, sStat);

        if (q.title) {
          const tKey = `${q.subject_key}::${q.title}`;
          const tStat = topicMap.get(tKey) || {
            title: q.title,
            subjectKey: q.subject_key,
            correct: 0,
            total: 0,
          };
          tStat.total++;
          if (isCorrect) tStat.correct++;
          topicMap.set(tKey, tStat);
        }
      });

      const total = questionIds.length;
      const pct = total ? Math.round((score / total) * 100) : 0;

      const perSubject: AttemptSubjectStat[] = Array.from(subjectMap.entries()).map(([key, v]) => ({
        key,
        correct: v.correct,
        total: v.total,
        pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      }));

      const groups: AttemptGroupStat[] =
        passRule === 'overall'
          ? []
          : (['general', 'specific'] as const).flatMap((grp) => {
              const matched = perSubject.filter((s) => SUBJECT_MAP[s.key]?.grp === grp);
              const gTotal = matched.reduce((a, b) => a + b.total, 0);
              if (!gTotal) return [];
              const gCorrect = matched.reduce((a, b) => a + b.correct, 0);
              const gPct = Math.round((gCorrect / gTotal) * 100);
              return [
                {
                  grp,
                  label:
                    grp === 'general' ? 'ภาคความรู้ความสามารถทั่วไป' : 'ภาคความรู้เฉพาะตำแหน่ง',
                  correct: gCorrect,
                  total: gTotal,
                  pct: gPct,
                  pass: gPct >= 60,
                },
              ];
            });

      const passed = pct >= 60 && groups.every((g) => g.pass);

      const perTopic: AttemptTopicStat[] = Array.from(topicMap.values())
        .map((t) => ({
          ...t,
          pct: t.total ? Math.round((t.correct / t.total) * 100) : 0,
        }))
        .sort((a, b) => a.pct - b.pct);

      const nextId = (runtime.attempts[0]?.id || 1000) + 1;
      const submittedAt = new Date().toISOString();

      const attempt: AttemptRecord = {
        id: nextId,
        setId,
        setTitle,
        mode,
        startedAt,
        submittedAt,
        durationSec,
        score,
        total,
        pct,
        passed,
        perSubject,
        groups,
        perTopic,
        wrongIndices,
        questionIds,
        answers,
        bookmarkedIds,
      };

      runtime.attempts = [attempt, ...runtime.attempts];
      runtime.examProgress = null;

      applyQuestionOutcomes(runtime.profile, outcomes);

      if (bookmarkedIds.length > 0) {
        const bSet = new Set(runtime.profile.bookmarks || []);
        for (const bid of bookmarkedIds) bSet.add(bid);
        runtime.profile.bookmarks = Array.from(bSet);
      }

      const todayStr = submittedAt.slice(0, 10);
      if (runtime.profile.lastActiveDate !== todayStr) {
        runtime.profile.streakDays = (runtime.profile.streakDays || 0) + 1;
        runtime.profile.lastActiveDate = todayStr;
      }

      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, id: attempt.id, attempt }, 201);
    }
  }

  // /api/questions
  if (apiPath === '/api/questions') {
    if (method === 'GET') {
      const subject = searchParams.get('subject') || '';
      const topic = searchParams.get('topic') || '';
      const batch = searchParams.get('batch') || '';
      const query = (searchParams.get('q') || '').trim().toLowerCase();
      const hasImage = searchParams.get('hasImage') === '1';
      const page = Math.max(1, Number(searchParams.get('page') || 1));
      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 24)));

      let filtered = getAllQuestionsMergedClient(store, runtime);
      if (subject) filtered = filtered.filter((q) => q.subject_key === subject);
      if (topic) {
        const matcher = resolveTopicSelection(topic);
        filtered = filtered.filter((q) => matcher.matches(q.title));
      }
      if (batch) filtered = filtered.filter((q) => q.batch === batch);
      if (hasImage) {
        filtered = filtered.filter(
          (q) =>
            Boolean(q.img) ||
            Boolean(q.explanation_img) ||
            Boolean(q.opt_imgs?.some(Boolean))
        );
      }
      if (query) {
        filtered = filtered.filter(
          (q) =>
            q.stem?.toLowerCase().includes(query) ||
            q.title?.toLowerCase().includes(query) ||
            q.explanation?.toLowerCase().includes(query) ||
            q.opts.some((o) => o.toLowerCase().includes(query)) ||
            String(q.id) === query
        );
      }

      const total = filtered.length;
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);

      return jsonResponse({
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        items,
        topics: subject ? store.meta.topics.filter((t) => t.subjectKey === subject) : store.meta.topics,
        batches: store.meta.batches,
      });
    }

    if (method === 'POST') {
      const stem = String(body.stem || '').trim();
      const subjectKey = String(body.subject_key || 'math') as SubjectKey;
      const opts = Array.isArray(body.opts)
        ? body.opts.map((v: unknown) => String(v || '').trim())
        : [];
      const correctIndex = Number(body.correct_index ?? 0);

      if (!stem || opts.length < 4 || opts.some((o: string) => !o)) {
        return jsonResponse({ error: 'กรุณากรอกโจทย์และตัวเลือกให้ครบ 4 ข้อ' }, 400);
      }

      const all = getAllQuestionsMergedClient(store, runtime);
      const maxId = all.reduce((acc, q) => Math.max(acc, q.id), 15000);
      const newId = maxId + 1;

      const created: QuestionRecord = {
        id: newId,
        subject_key: subjectKey,
        set_id: body.set_id ? Number(body.set_id) : null,
        title: body.title ? String(body.title).trim() : 'เพิ่มโดยแอดมิน',
        batch: 'admin_manual',
        stem,
        img: body.img ? String(body.img).trim() : null,
        opts: opts.slice(0, 4),
        opt_imgs: null,
        correct_index: correctIndex,
        correct_label: CHOICE_LABELS[correctIndex] || 'ก',
        explanation: body.explanation ? String(body.explanation).trim() : null,
        explanation_img: null,
      };

      runtime.customQuestions = [created, ...(runtime.customQuestions || [])];
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, question: created }, 201);
    }
  }

  // /api/reports
  if (apiPath === '/api/reports') {
    if (method === 'GET') {
      return jsonResponse({ reports: runtime.reports });
    }
    if (method === 'POST') {
      const reason = String(body.reason || '').trim();
      const note = body.note ? String(body.note).trim() : null;
      const category = body.category === 'system' ? 'system' : 'question';

      if (!reason) {
        return jsonResponse({ error: 'เลือกประเภทปัญหาที่พบก่อนส่ง' }, 400);
      }
      if (category === 'system' && (!note || note.length < 10)) {
        return jsonResponse(
          { error: 'อธิบายปัญหาที่เจอ อย่างน้อย 10 ตัวอักษร เพื่อให้ทีมงานตามแก้ได้ตรงจุด' },
          400
        );
      }

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
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, report: record }, 201);
    }
    if (method === 'PATCH') {
      const id = Number(body.id);
      const status = body.status === 'resolved' ? 'resolved' : 'open';
      const target = runtime.reports.find((r) => r.id === id);
      if (!target) {
        return jsonResponse({ error: 'Report not found' }, 404);
      }
      target.status = status;
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, report: target });
    }
  }

  // /api/admin/sets
  if (apiPath === '/api/admin/sets') {
    if (method === 'GET') {
      return jsonResponse({
        sets: [...store.meta.examSets, ...(runtime.customSets || [])],
      });
    }
    if (method === 'POST') {
      const title = String(body.title || '').trim();
      const count = Math.min(150, Math.max(5, Number(body.total || 20)));
      const timeMinutes = Math.max(5, Number(body.timeMinutes || count));
      const subjectKey = body.subjectKey ? (String(body.subjectKey) as SubjectKey) : null;

      if (!title) {
        return jsonResponse({ error: 'กรุณาระบุชื่อชุดข้อสอบ' }, 400);
      }

      const maxId = Math.max(
        300,
        ...store.meta.examSets.map((s) => s.id),
        ...(runtime.customSets || []).map((s) => s.id)
      );
      const newId = maxId + 1;

      const pool = getAllQuestionsMergedClient(store, runtime).filter(
        (q) => !subjectKey || q.subject_key === subjectKey
      );
      const pickedIds = shufflePool(pool)
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
        subjectBreakdown: computeSubjectBreakdown(pickedIds, (id) =>
          findQuestionByIdClient(id, store, runtime)
        ),
      };

      runtime.customSets = [...(runtime.customSets || []), created];
      runtime.customSetQuestionIds[String(newId)] = pickedIds;
      writeRuntimeStateClient(runtime);
      return jsonResponse({ ok: true, set: created }, 201);
    }
  }

  return jsonResponse({ error: 'API endpoint not found in static mode' }, 404);
}

export function installClientApiBridge(): void {
  if (!STATIC_EXPORT || typeof window === 'undefined' || bridgeInstalled) return;
  bridgeInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const parsed = new URL(rawUrl, window.location.origin);
    let pathname = parsed.pathname;

    if (BASE_PATH && pathname.startsWith(`${BASE_PATH}/api/`)) {
      pathname = pathname.slice(BASE_PATH.length);
    }

    if (pathname.startsWith('/api/')) {
      const method = (
        init?.method ||
        (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
      ).toUpperCase();
      const body = method === 'GET' || method === 'DELETE' ? {} : await readBodyJson(input, init);
      return handleApiRequest(pathname, parsed.searchParams, method, body, nativeFetch);
    }

    return nativeFetch(input, init);
  };
}
