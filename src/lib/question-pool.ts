import { resolveTopicSelection, SUBJECT_MAP, SUBJECTS, TRACKS, type SubjectKey } from './constants';

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

export type CompletedPoolMode = 'all' | 'correct' | 'wrong';

export interface QuestionOutcome {
  id: number;
  correct: boolean;
}

export interface ResetCompletedFilter {
  scope?: 'all' | 'subject' | 'topic';
  subject?: SubjectKey;
  topic?: string;
  pool?: CompletedPoolMode;
}

export interface PoolQuestionMeta {
  id: number;
  subject_key: SubjectKey;
  title: string | null;
}

export interface ProfileHistoryFields {
  correctIds?: number[];
  mistakeIds?: number[];
  excludeCompleted?: boolean;
}

export function computeSubjectBreakdown(
  questionIds: number[],
  lookup: (id: number) => Pick<QuestionRecord, 'subject_key'> | undefined
): Partial<Record<SubjectKey, number>> {
  const breakdown: Partial<Record<SubjectKey, number>> = {};
  for (const id of questionIds) {
    const q = lookup(id);
    if (!q) continue;
    breakdown[q.subject_key] = (breakdown[q.subject_key] || 0) + 1;
  }
  return breakdown;
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

export function shufflePool<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getCompletedIdSets(profile: ProfileHistoryFields): {
  correctSet: Set<number>;
  mistakeSet: Set<number>;
  allCompletedSet: Set<number>;
} {
  const mistakeSet = new Set<number>();
  for (const raw of profile.mistakeIds || []) {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) mistakeSet.add(id);
  }

  const correctSet = new Set<number>();
  for (const raw of profile.correctIds || []) {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0 && !mistakeSet.has(id)) {
      correctSet.add(id);
    }
  }

  const allCompletedSet = new Set<number>([...correctSet, ...mistakeSet]);
  return { correctSet, mistakeSet, allCompletedSet };
}

export function applyQuestionOutcomes(
  profile: ProfileHistoryFields,
  outcomes: QuestionOutcome[]
): void {
  const { correctSet, mistakeSet } = getCompletedIdSets(profile);
  for (const entry of outcomes) {
    const qid = Number(entry?.id);
    if (!Number.isFinite(qid) || qid <= 0) continue;
    if (entry.correct) {
      correctSet.add(qid);
      mistakeSet.delete(qid);
    } else {
      mistakeSet.add(qid);
      correctSet.delete(qid);
    }
  }
  profile.correctIds = Array.from(correctSet);
  profile.mistakeIds = Array.from(mistakeSet);
}

export function backfillProfileHistoryFromAttempts(
  profile: ProfileHistoryFields,
  attempts: Array<{ questionIds?: number[]; answers?: (number | null)[] }>,
  lookupCorrectIndex: (qid: number) => number | null | undefined
): void {
  const { correctSet, mistakeSet } = getCompletedIdSets(profile);
  const chronological = [...attempts].reverse();
  for (const att of chronological) {
    const qIds = Array.isArray(att.questionIds) ? att.questionIds : [];
    const ansList = Array.isArray(att.answers) ? att.answers : [];
    for (let i = 0; i < qIds.length; i++) {
      const qid = Number(qIds[i]);
      const picked = ansList[i];
      if (!Number.isFinite(qid) || picked === null || picked === undefined) continue;
      const correctIdx = lookupCorrectIndex(qid);
      if (correctIdx === null || correctIdx === undefined) continue;
      if (picked === correctIdx) {
        correctSet.add(qid);
        mistakeSet.delete(qid);
      } else {
        mistakeSet.add(qid);
        correctSet.delete(qid);
      }
    }
  }
  profile.correctIds = Array.from(correctSet);
  profile.mistakeIds = Array.from(mistakeSet);
}

export function resetCompletedHistory(
  profile: ProfileHistoryFields,
  filter: ResetCompletedFilter | undefined,
  allQuestions: PoolQuestionMeta[]
): void {
  const pool: CompletedPoolMode =
    filter?.pool === 'correct' || filter?.pool === 'wrong' ? filter.pool : 'all';
  const scopeAll = filter?.scope === 'all' || (!filter?.subject && !filter?.topic);

  if (scopeAll) {
    if (pool === 'all' || pool === 'correct') {
      profile.correctIds = [];
    }
    if (pool === 'all' || pool === 'wrong') {
      profile.mistakeIds = [];
    }
    return;
  }

  const hasSubject = Boolean(filter?.subject);
  const hasTopic = filter?.scope === 'topic' || Boolean(filter?.topic);
  const topicMatcher = hasTopic && filter?.topic ? resolveTopicSelection(filter.topic) : null;

  const targetIds = new Set<number>();
  for (const q of allQuestions) {
    if (hasSubject && q.subject_key !== filter?.subject) continue;
    if (topicMatcher && !topicMatcher.matches(q.title)) continue;
    targetIds.add(q.id);
  }

  const { correctSet, mistakeSet } = getCompletedIdSets(profile);
  if (pool === 'all' || pool === 'correct') {
    for (const id of targetIds) correctSet.delete(id);
  }
  if (pool === 'all' || pool === 'wrong') {
    for (const id of targetIds) mistakeSet.delete(id);
  }
  profile.correctIds = Array.from(correctSet);
  profile.mistakeIds = Array.from(mistakeSet);
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

export interface BuildExamOptions {
  trackName?: string;
  count?: number;
  subject?: string;
  topic?: string;
  shuffleMode?: boolean;
  setIndex?: number;
  excludeCompleted?: boolean;
  pool?: CompletedPoolMode;
}

export interface ExamBuildSource {
  allQuestions: QuestionRecord[];
  findById: (id: number) => QuestionRecord | undefined;
  fixedIdsForSet: (setId: string) => number[] | undefined;
  setMetaForSet: (setId: string) =>
    | {
        id: number;
        kind: 'form' | 'subject';
        title: string;
        timeMinutes: number;
        subjectKey: SubjectKey | null;
      }
    | undefined;
  profile: ProfileHistoryFields & { bookmarks: number[]; mistakeIds: number[] };
}

export function buildExamFromSource(
  source: ExamBuildSource,
  setId: string,
  options?: BuildExamOptions
): { title: string; durationSec: number; passRule: 'groups' | 'overall'; items: RunnerQuestion[] } {
  const all = source.allQuestions;
  const { correctSet, mistakeSet, allCompletedSet } = getCompletedIdSets(source.profile);

  // 1. Mistake notebook drill
  if (setId === 'mistakes') {
    const ids = source.profile.mistakeIds || [];
    const picked = ids.map((id) => source.findById(id)).filter((q): q is QuestionRecord => Boolean(q));
    return withSubjectFilter(picked, 'ซ่อมข้อสอบที่ตอบผิด', Math.max(10, picked.length), 'overall', options?.subject);
  }

  // 2. Bookmarked questions drill
  if (setId === 'bookmarks') {
    const ids = source.profile.bookmarks || [];
    const picked = ids.map((id) => source.findById(id)).filter((q): q is QuestionRecord => Boolean(q));
    return withSubjectFilter(picked, 'ทบทวนข้อสอบที่ติดดาวไว้', Math.max(10, picked.length), 'overall', options?.subject);
  }

  // 3. Completed-Question Review Sets (/catalog/completed)
  if (setId === 'completed-form' || setId === 'completed-subject' || setId === 'completed-topic') {
    const poolMode: CompletedPoolMode =
      options?.pool === 'correct' ? 'correct' : options?.pool === 'wrong' ? 'wrong' : 'all';
    const targetIdSet =
      poolMode === 'correct' ? correctSet : poolMode === 'wrong' ? mistakeSet : allCompletedSet;
    const poolLabel =
      poolMode === 'correct'
        ? 'ทำถูกอย่างเดียว'
        : poolMode === 'wrong'
          ? 'ทำผิดอย่างเดียว'
          : 'รวมที่เคยทำทั้งหมด';

    const completedPool = all
      .filter((q) => targetIdSet.has(q.id))
      .slice()
      .sort((a, b) => a.id - b.id);

    if (setId === 'completed-form') {
      const chunkSize = Math.max(5, Math.min(200, options?.count || 150));
      if (options?.shuffleMode) {
        const picked = shufflePool(completedPool).slice(0, chunkSize);
        return withSubjectFilter(
          picked,
          `ชุดข้อสอบที่เคยทำ (${poolLabel}) · สุ่ม ${picked.length} ข้อ`,
          Math.max(10, picked.length),
          'overall',
          options?.subject
        );
      }
      const totalSets = Math.max(1, Math.ceil(completedPool.length / chunkSize));
      const safeSetIdx = Math.min(Math.max(1, Math.floor(options?.setIndex || 1)), totalSets);
      const start = (safeSetIdx - 1) * chunkSize;
      const picked = completedPool.slice(start, start + chunkSize);
      return withSubjectFilter(
        picked,
        `ชุดข้อสอบที่เคยทำ (${poolLabel}) · ชุดใหญ่ 150 ข้อ ชุดที่ ${safeSetIdx}/${totalSets}`,
        Math.max(10, picked.length),
        'overall',
        options?.subject
      );
    }

    if (setId === 'completed-subject') {
      const sk = (options?.subject || 'math') as SubjectKey;
      const meta = SUBJECT_MAP[sk] || SUBJECTS[0];
      const subjPool = completedPool.filter((q) => q.subject_key === meta.key);
      const chunkSize = Math.max(5, Math.min(150, options?.count || 20));
      if (options?.setIndex && Number.isFinite(options.setIndex) && options.setIndex >= 1) {
        const totalSets = Math.max(1, Math.ceil(subjPool.length / chunkSize));
        const safeSetIdx = Math.min(Math.floor(options.setIndex), totalSets);
        const start = (safeSetIdx - 1) * chunkSize;
        const picked = subjPool.slice(start, start + chunkSize);
        return {
          title: `ข้อสอบที่เคยทำ (${poolLabel}) · วิชา${meta.name} ชุดที่ ${safeSetIdx}/${totalSets}`,
          durationSec: Math.max(5, picked.length) * 60,
          passRule: 'overall',
          items: picked.map(toRunnerQuestion),
        };
      }
      const picked = shufflePool(subjPool).slice(0, chunkSize);
      return {
        title: `ข้อสอบที่เคยทำ (${poolLabel}) · สุ่มวิชา${meta.name} (${picked.length} ข้อ)`,
        durationSec: Math.max(5, picked.length) * 60,
        passRule: 'overall',
        items: picked.map(toRunnerQuestion),
      };
    }

    // completed-topic
    const topicMatcher = resolveTopicSelection(options?.topic);
    const topicPool = completedPool.filter(
      (q) =>
        (!options?.subject || q.subject_key === options.subject) &&
        topicMatcher.matches(q.title)
    );
    const chunkSize = Math.max(5, Math.min(500, options?.count || 20));
    if (options?.setIndex && Number.isFinite(options.setIndex) && options.setIndex >= 1) {
      const totalSets = Math.max(1, Math.ceil(topicPool.length / chunkSize));
      const safeSetIdx = Math.min(Math.floor(options.setIndex), totalSets);
      const start = (safeSetIdx - 1) * chunkSize;
      const picked = topicPool.slice(start, start + chunkSize);
      return {
        title: `ข้อสอบที่เคยทำ (${poolLabel}) · ${topicMatcher.displayTopic} ชุดที่ ${safeSetIdx}/${totalSets}`,
        durationSec: Math.max(5, picked.length) * 60,
        passRule: 'overall',
        items: picked.map(toRunnerQuestion),
      };
    }
    const picked = shufflePool(topicPool).slice(0, chunkSize);
    return {
      title: `ข้อสอบที่เคยทำ (${poolLabel}) · ${topicMatcher.displayTopic} (${picked.length} ข้อ)`,
      durationSec: Math.max(5, picked.length) * 60,
      passRule: 'overall',
      items: picked.map(toRunnerQuestion),
    };
  }

  const shouldExcludeCompleted =
    options?.excludeCompleted !== undefined ? options.excludeCompleted : false;
  const activePool = shouldExcludeCompleted
    ? all.filter((q) => !allCompletedSet.has(q.id))
    : all;

  // 4. Specific Sub-Topic drill (supports ordered sets set=1..N and normalized/aliased topic names)
  if (setId === 'topic') {
    const topicMatcher = resolveTopicSelection(options?.topic);
    const filtered = activePool
      .filter(
        (q) =>
          (!options?.subject || q.subject_key === options.subject) &&
          topicMatcher.matches(q.title)
      )
      .slice()
      .sort((a, b) => a.id - b.id);

    if (options?.setIndex && Number.isFinite(options.setIndex) && options.setIndex >= 1) {
      const chunkSize = Math.max(5, Math.min(500, options?.count || 20));
      const totalSets = Math.max(1, Math.ceil(filtered.length / chunkSize));
      const safeSetIdx = Math.min(Math.floor(options.setIndex), totalSets);
      const start = (safeSetIdx - 1) * chunkSize;
      const picked = filtered.slice(start, start + chunkSize);
      const rangeText = picked.length > 0 ? ` (ข้อ ${start + 1}–${start + picked.length})` : '';
      return {
        title: `เจาะลึกหัวข้อ · ${topicMatcher.displayTopic} · ชุดที่ ${safeSetIdx}/${totalSets}${rangeText}`,
        durationSec: Math.max(10, picked.length) * 60,
        passRule: 'overall',
        items: picked.map(toRunnerQuestion),
      };
    }

    const limit = Math.min(options?.count || 30, filtered.length);
    const picked = shufflePool(filtered).slice(0, limit);
    return {
      title: `เจาะลึกหัวข้อ · ${topicMatcher.displayTopic}`,
      durationSec: Math.max(10, picked.length) * 60,
      passRule: 'overall',
      items: picked.map(toRunnerQuestion),
    };
  }

  // 5. Random track-weighted mock exam (exact weights, supports optional count & subject filter)
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
      const pool = shufflePool(activePool.filter((q) => q.subject_key === sk));
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

  // 6. Dynamic Subject Drill (`subject-math`, supports sequential chunking via `setIndex` or random `count`)
  if (setId.startsWith('subject-')) {
    const sk = setId.replace('subject-', '') as SubjectKey;
    const meta = SUBJECT_MAP[sk] || SUBJECTS[0];
    const chunkSize = Math.max(5, Math.min(150, options?.count || 20));
    const subjectPool = activePool
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

    const pool = shufflePool(subjectPool).slice(0, chunkSize);
    return {
      title: `ฝึกรายวิชา · ${meta.name} (${pool.length} ข้อ)`,
      durationSec: Math.max(5, pool.length) * 60,
      passRule: 'overall',
      items: pool.map(toRunnerQuestion),
    };
  }

  // 7. Custom admin set or built-in catalog set (`101..107`, `201..215`)
  const fixedIds = source.fixedIdsForSet(setId);
  const setMeta = source.setMetaForSet(setId);
  if (fixedIds && fixedIds.length > 0) {
    let picked = fixedIds
      .map((id) => source.findById(id))
      .filter((q): q is QuestionRecord => Boolean(q));
    if (shouldExcludeCompleted) {
      picked = picked.filter((q) => !allCompletedSet.has(q.id));
    }
    if (options?.shuffleMode && setMeta?.subjectKey) {
      picked = shufflePool(activePool.filter((q) => q.subject_key === setMeta.subjectKey)).slice(
        0,
        options?.count || 20
      );
    }
    return withSubjectFilter(
      picked,
      setMeta?.title || `ชุดข้อสอบ #${setId}`,
      setMeta?.timeMinutes || picked.length,
      setMeta?.kind === 'subject' ? 'overall' : 'groups',
      options?.subject
    );
  }

  const fallback = shufflePool(activePool).slice(0, 20);
  return {
    title: `ชุดข้อสอบฝึกหัด #${setId}`,
    durationSec: 20 * 60,
    passRule: 'overall',
    items: fallback.map(toRunnerQuestion),
  };
}
