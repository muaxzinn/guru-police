import { SUBJECT_MAP, SUBJECTS, type SubjectKey } from './constants';
import type { AttemptRecord } from './server-db';

export interface PoliceRank {
  level: number;
  title: string;
  shortTitle: string;
  minXp: number;
  badgeColor: string;
}

export const POLICE_RANKS: PoliceRank[] = [
  { level: 1, title: 'พลเรือนเตรียมสอบ', shortTitle: 'Lv.1 พลเรือน', minXp: 0, badgeColor: '#64748b' },
  { level: 2, title: 'นักเรียนนายสิบตำรวจ (นสต.)', shortTitle: 'Lv.2 นสต.', minXp: 150, badgeColor: '#0ea5e9' },
  { level: 3, title: 'สิบตำรวจตรี (ส.ต.ต.)', shortTitle: 'Lv.3 ส.ต.ต.', minXp: 400, badgeColor: '#14b8a6' },
  { level: 4, title: 'สิบตำรวจโท (ส.ต.ท.)', shortTitle: 'Lv.4 ส.ต.ท.', minXp: 800, badgeColor: '#6366f1' },
  { level: 5, title: 'สิบตำรวจเอก (ส.ต.อ.)', shortTitle: 'Lv.5 ส.ต.อ.', minXp: 1400, badgeColor: '#8b5cf6' },
  { level: 6, title: 'จ่าสิบตำรวจ (จ.ส.ต.)', shortTitle: 'Lv.6 จ.ส.ต.', minXp: 2200, badgeColor: '#f59e0b' },
  { level: 7, title: 'ดาบตำรวจ (ด.ต.)', shortTitle: 'Lv.7 ด.ต.', minXp: 3500, badgeColor: '#ea580c' },
  { level: 8, title: 'ร้อยตำรวจตรี (ร.ต.ต.)', shortTitle: 'Lv.8 ร.ต.ต.', minXp: 5000, badgeColor: '#e60707' },
];

export interface SubjectWeaknessStat {
  key: SubjectKey;
  name: string;
  shortName: string;
  correct: number;
  total: number;
  pct: number;
  status: 'critical' | 'warning' | 'strong';
}

export interface TopicWeaknessStat {
  title: string;
  subjectKey: SubjectKey;
  subjectShortName: string;
  correct: number;
  total: number;
  pct: number;
}

export interface DailyMissionItem {
  id: string;
  title: string;
  progress: number;
  target: number;
  done: boolean;
  rewardXp: number;
  href: string;
}

export interface PlayerStats {
  xp: number;
  rank: PoliceRank;
  nextRank: PoliceRank | null;
  xpIntoLevel: number;
  xpLevelSpan: number;
  levelProgressPct: number;
  totalAnswered: number;
  totalCorrect: number;
  overallAccuracy: number;
  passedCount: number;
  weakestSubjects: SubjectWeaknessStat[];
  weakestTopics: TopicWeaknessStat[];
  dailyMissions: DailyMissionItem[];
}

export function computeAttemptXp(attempt: Pick<AttemptRecord, 'score' | 'total' | 'passed'>): number {
  const wrongOrSkip = Math.max(0, attempt.total - attempt.score);
  return attempt.score * 10 + wrongOrSkip * 2 + (attempt.passed ? 50 : 15);
}

export function computePlayerStats(
  attempts: AttemptRecord[],
  streakDays: number,
  mistakeIds: number[],
  bookmarks: number[],
  todayIso?: string | null
): PlayerStats {
  let xp = Math.max(0, (streakDays - 1) * 25);
  let totalAnswered = 0;
  let totalCorrect = 0;
  let passedCount = 0;
  let todayAttempts = 0;
  let todayCorrect = 0;

  const subjectMap = new Map<SubjectKey, { correct: number; total: number }>();
  const topicMap = new Map<string, { title: string; subjectKey: SubjectKey; correct: number; total: number }>();

  for (const att of attempts) {
    xp += computeAttemptXp(att);
    totalAnswered += att.total || 0;
    totalCorrect += att.score || 0;
    if (att.passed) passedCount++;

    if (todayIso && typeof att.submittedAt === 'string' && att.submittedAt.startsWith(todayIso)) {
      todayAttempts += 1;
      todayCorrect += att.score || 0;
    }

    for (const ps of att.perSubject || []) {
      const prev = subjectMap.get(ps.key) || { correct: 0, total: 0 };
      subjectMap.set(ps.key, {
        correct: prev.correct + ps.correct,
        total: prev.total + ps.total,
      });
    }

    for (const tp of att.perTopic || []) {
      const key = `${tp.subjectKey}::${tp.title}`;
      const prev = topicMap.get(key) || {
        title: tp.title,
        subjectKey: tp.subjectKey,
        correct: 0,
        total: 0,
      };
      topicMap.set(key, {
        ...prev,
        correct: prev.correct + tp.correct,
        total: prev.total + tp.total,
      });
    }
  }

  let rank = POLICE_RANKS[0];
  for (const r of POLICE_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  const nextRankIdx = POLICE_RANKS.findIndex((r) => r.level === rank.level) + 1;
  const nextRank = nextRankIdx < POLICE_RANKS.length ? POLICE_RANKS[nextRankIdx] : null;
  const xpIntoLevel = xp - rank.minXp;
  const xpLevelSpan = nextRank ? Math.max(1, nextRank.minXp - rank.minXp) : 1;
  const levelProgressPct = nextRank ? Math.min(100, Math.round((xpIntoLevel / xpLevelSpan) * 100)) : 100;

  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const weakestSubjects: SubjectWeaknessStat[] = SUBJECTS.filter((s) => subjectMap.has(s.key))
    .map((s) => {
      const stat = subjectMap.get(s.key)!;
      const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      const status: 'critical' | 'warning' | 'strong' =
        pct < 50 ? 'critical' : pct < 65 ? 'warning' : 'strong';
      return {
        key: s.key,
        name: s.name,
        shortName: s.shortName,
        correct: stat.correct,
        total: stat.total,
        pct,
        status,
      };
    })
    .sort((a, b) => a.pct - b.pct || b.total - a.total);

  const weakestTopics: TopicWeaknessStat[] = Array.from(topicMap.values())
    .map((t) => {
      const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
      return {
        title: t.title,
        subjectKey: t.subjectKey,
        subjectShortName: SUBJECT_MAP[t.subjectKey]?.shortName || t.subjectKey,
        correct: t.correct,
        total: t.total,
        pct,
      };
    })
    .sort((a, b) => a.pct - b.pct || b.total - b.correct - (a.total - a.correct))
    .slice(0, 8);

  const dailyMissions: DailyMissionItem[] = [
    {
      id: 'daily-run',
      title: 'ทำข้อสอบอย่างน้อย 1 ชุดวันนี้',
      progress: Math.min(1, todayIso ? todayAttempts : 0),
      target: 1,
      done: (todayIso ? todayAttempts : 0) >= 1,
      rewardXp: 50,
      href: '/catalog/subject',
    },
    {
      id: 'daily-correct',
      title: 'ตอบถูกสะสมวันนี้ให้ครบ 15 ข้อ',
      progress: Math.min(15, todayIso ? todayCorrect : 0),
      target: 15,
      done: (todayIso ? todayCorrect : 0) >= 15,
      rewardXp: 80,
      href: '/catalog/form',
    },
    {
      id: 'clear-mistakes',
      title: mistakeIds.length > 0 ? `ลุยซ่อมสมุดจุดอ่อน (ค้าง ${mistakeIds.length} ข้อ)` : 'ติดดาวข้อสอบสำคัญไว้ทบทวน',
      progress: mistakeIds.length === 0 && attempts.length > 0 ? 1 : Math.min(5, bookmarks.length),
      target: mistakeIds.length === 0 && attempts.length > 0 ? 1 : 5,
      done: mistakeIds.length === 0 ? attempts.length > 0 || bookmarks.length >= 5 : false,
      rewardXp: 60,
      href: mistakeIds.length > 0 ? '/exam/mistakes?mode=practice&fresh=1' : '/bank',
    },
  ];

  return {
    xp,
    rank,
    nextRank,
    xpIntoLevel,
    xpLevelSpan,
    levelProgressPct,
    totalAnswered,
    totalCorrect,
    overallAccuracy,
    passedCount,
    weakestSubjects,
    weakestTopics,
    dailyMissions,
  };
}
