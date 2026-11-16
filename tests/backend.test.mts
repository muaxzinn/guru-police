import './register-ts.mjs';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  isNavItemActive,
  normalizeTopicTitleKey,
  resolveTopicSelection,
  SUBJECT_MAP,
  SUBJECTS,
  TRACKS,
} = await import('../src/lib/constants.ts');
const { safeTruncateThai } = await import('../src/lib/utf8-thai.ts');
const { computeAttemptXp, computePlayerStats, POLICE_RANKS } = await import('../src/lib/gamification.ts');
const { applyQuestionOutcomes, buildExamForSetId, getStore, resetCompletedHistory } = await import(
  '../src/lib/server-db.ts'
);
const { buildExamFromSource, getCompletedIdSets } = await import('../src/lib/question-pool.ts');
const { isImageUrlString } = await import('../src/lib/rich-text-parser.ts');

test('constants: SUBJECTS, TRACKS weights, topic normalization & navigation active states', () => {
  assert.equal(SUBJECTS.length, 7);
  for (const s of SUBJECTS) {
    assert.equal(SUBJECT_MAP[s.key].name, s.name);
  }

  for (const t of TRACKS) {
    const sumWeights = Object.values(t.weights).reduce((acc, n) => acc + n, 0);
    assert.equal(sumWeights, 150, `Track ${t.name} weights should total 150`);
  }

  assert.equal(normalizeTopicTitleKey('Data & People'), normalizeTopicTitleKey('Data and People'));
  assert.equal(
    normalizeTopicTitleKey('ร้อยละ (แผนภูมิ และ กาารเปลี่ยนแปลง)'),
    normalizeTopicTitleKey('ร้อยละ (แผนภูมิและการเปลี่ยนแปลง)')
  );
  assert.equal(normalizeTopicTitleKey('วิวัฒนาการคอมพิวเตอร์'), normalizeTopicTitleKey('วิวัฒนาการคอม'));

  const matcher = resolveTopicSelection('Data & People||Data and People');
  assert.equal(matcher.displayTopic, 'Data & People');
  assert.equal(matcher.matches('Data & People'), true);
  assert.equal(matcher.matches('Data and People'), true);
  assert.equal(matcher.matches('Data   &   People'), true);
  assert.equal(matcher.matches('Word'), false);
  assert.equal(matcher.matches(null), false);

  // Desktop nav highlights /catalog/subject and /catalog/topics independently
  assert.equal(isNavItemActive('/catalog/topics', '/catalog/topics', false), true);
  assert.equal(isNavItemActive('/catalog/topics', '/catalog/subject', false), false);
  assert.equal(isNavItemActive('/catalog/form', '/catalog', false), true);
  assert.equal(isNavItemActive('/catalog/topics', '/catalog', false), false);

  // Mobile bottom nav (7 independent tabs) highlights each route individually
  assert.equal(isNavItemActive('/catalog/topics', '/catalog/topics', true), true);
  assert.equal(isNavItemActive('/catalog/topics', '/catalog/subject', true), false);
  assert.equal(isNavItemActive('/catalog/subject', '/catalog/subject', true), true);
  assert.equal(isNavItemActive('/catalog/completed', '/catalog/completed', true), true);
  assert.equal(isNavItemActive('/catalog/completed', '/catalog', true), false);
  assert.equal(isNavItemActive('/catalog/completed', '/catalog/completed', false), true);
  assert.equal(isNavItemActive('/', '/', false), true);
  assert.equal(isNavItemActive('/dashboard', '/', false), false);
});

test('utf8-thai: safeTruncateThai preserves 3-byte UTF-8 and Thai combining clusters', () => {
  assert.equal(safeTruncateThai(null, 10), '');
  assert.equal(safeTruncateThai('กขค', 10), 'กขค');

  // "น้ำ" = น (0), ำ (1), ้ (2), then "ท่วม" = ท (3)...
  // Cutting at 2 would separate น + ำ from tone mark ้, so cut backs up past combining marks
  const sample = 'น้ำท่วมหมู่บ้านตำรวจ';
  const truncated = safeTruncateThai(sample, 2);
  assert.equal(truncated.endsWith('…'), true);
  // Ensure result has no replacement char (U+FFFD) and valid UTF-8 encoding
  assert.equal(truncated.includes('\uFFFD'), false);
  const firstToneInput = 'ก้ำขำค'; // ก (0), ้ (1), ำ (2) -> cut=1 hits tone mark ้
  const cutTone = safeTruncateThai(firstToneInput, 1);
  assert.equal(cutTone, 'ก…');

  // Cutting inside combining marks on Thai words (e.g. "ที่" at index 1 or 2)
  const word = 'ที่ทำการสถานีตำรวจภูธร';
  const cutWord = safeTruncateThai(word, 2);
  // index 0='ท', 1='ี', 2='่' -> index 2 is combining mark, backs up to index 0 ('ท…')
  assert.equal(cutWord, 'ท…');
  assert.equal(Buffer.from(cutWord, 'utf8').toString('utf8'), cutWord);
});

test('gamification: XP calculation, rank tiers (Lv.1-Lv.8), daily missions & weakness sorting', () => {
  assert.equal(computeAttemptXp({ score: 15, total: 20, passed: true }), 15 * 10 + 5 * 2 + 50);
  assert.equal(computeAttemptXp({ score: 5, total: 20, passed: false }), 5 * 10 + 15 * 2 + 15);

  // Level 1 (0 XP)
  const emptyStats = computePlayerStats([], 1, [], [], '2026-11-16');
  assert.equal(emptyStats.xp, 0);
  assert.equal(emptyStats.rank.level, 1);
  assert.equal(emptyStats.nextRank?.level, 2);
  assert.equal(emptyStats.dailyMissions[0].done, false);

  // Level 8 (5000+ XP): create attempts earning > 5000 XP
  const makeAttempt = (
    id: number,
    score: number,
    total: number,
    submittedAt: string,
    perSubject: Array<{ key: 'math' | 'com' | 'law'; correct: number; total: number }>,
    perTopic: Array<{ title: string; subjectKey: 'math' | 'com' | 'law'; correct: number; total: number }>
  ) => ({
    id,
    setId: '201',
    setTitle: 'Test',
    mode: 'practice' as const,
    startedAt: submittedAt,
    submittedAt,
    durationSec: 120,
    score,
    total,
    pct: Math.round((score / total) * 100),
    passed: score / total >= 0.6,
    perSubject: perSubject.map((s) => ({ ...s, pct: Math.round((s.correct / s.total) * 100) })),
    groups: [],
    perTopic: perTopic.map((t) => ({ ...t, pct: Math.round((t.correct / t.total) * 100) })),
    wrongIndices: [],
    questionIds: [],
    answers: [],
    bookmarkedIds: [],
  });

  const highAttempts = [
    makeAttempt(
      1,
      450,
      500,
      '2026-11-16T09:00:00.000Z',
      [
        { key: 'math', correct: 2, total: 10 }, // 20% -> critical
        { key: 'law', correct: 6, total: 10 }, // 60% -> warning
        { key: 'com', correct: 9, total: 10 }, // 90% -> strong
      ],
      [
        { title: 'อนุกรม', subjectKey: 'math', correct: 1, total: 5 }, // 20%
        { title: 'Word', subjectKey: 'com', correct: 5, total: 5 }, // 100%
      ]
    ),
    makeAttempt(2, 100, 100, '2026-11-15T09:00:00.000Z', [], []),
  ];

  const highStats = computePlayerStats(highAttempts, 5, [], [1, 2, 3, 4, 5], '2026-11-16');
  assert.ok(highStats.xp >= POLICE_RANKS[POLICE_RANKS.length - 1].minXp);
  assert.equal(highStats.rank.level, 8);
  assert.equal(highStats.nextRank, null);
  assert.equal(highStats.levelProgressPct, 100);
  assert.equal(highStats.weakestSubjects[0].key, 'math');
  assert.equal(highStats.weakestSubjects[0].status, 'critical');
  assert.equal(highStats.weakestSubjects[1].status, 'warning');
  assert.equal(highStats.weakestSubjects[2].status, 'strong');
  assert.equal(highStats.weakestTopics[0].title, 'อนุกรม');
  assert.equal(highStats.dailyMissions[0].done, true);
  assert.equal(highStats.dailyMissions[1].done, true);
  assert.equal(highStats.dailyMissions[2].done, true);
});

test('server-db: dataset completeness, zero raw URLs, valid SVGs on disk & buildExamForSetId', () => {
  const store = getStore();
  assert.ok(store.questions.length >= 7038, `Expected >= 7038 questions, got ${store.questions.length}`);
  assert.equal(store.topics.length, 132);
  assert.equal(store.examSets.length, 22);
  assert.ok(store.imageCount >= 551, `Expected >= 551 images, got ${store.imageCount}`);

  const svgDir = path.join(process.cwd(), 'public');
  for (const q of store.questions) {
    assert.equal(isImageUrlString(q.stem), false, `Question #${q.id} still has raw image URL in stem: ${q.stem}`);
    for (let i = 0; i < q.opts.length; i++) {
      assert.equal(
        isImageUrlString(q.opts[i]),
        false,
        `Question #${q.id} opt[${i}] still has raw image URL: ${q.opts[i]}`
      );
    }
    assert.equal(
      isImageUrlString(q.explanation),
      false,
      `Question #${q.id} still has raw image URL in explanation`
    );

    const mediaRefs = [q.img, q.explanation_img, ...(q.opt_imgs || [])].filter(
      (u): u is string => Boolean(u)
    );
    for (const ref of mediaRefs) {
      assert.equal(
        /^https?:\/\//i.test(ref),
        false,
        `Question #${q.id} should not reference external image URL: ${ref}`
      );
      assert.ok(ref.startsWith('/question-svgs/'), `Expected /question-svgs/ path in #${q.id}, got ${ref}`);
      const fullPath = path.join(svgDir, ref.slice(1));
      assert.equal(fs.existsSync(fullPath), true, `Missing SVG on disk for #${q.id}: ${fullPath}`);
    }
  }

  // Fixed set 201 (150 items) & 107 (20 items)
  const set201 = buildExamForSetId('201');
  assert.equal(set201.items.length, 150);
  assert.equal(set201.passRule, 'groups');
  assert.equal(set201.durationSec, 180 * 60);

  const set107 = buildExamForSetId('107');
  assert.equal(set107.items.length, 20);
  assert.ok(set107.items.every((item) => item.subject === 'soc'));

  // Subject filter on multi-subject set
  const set201Math = buildExamForSetId('201', { subject: 'math' });
  assert.equal(set201Math.items.length, 20);
  assert.ok(set201Math.items.every((item) => item.subject === 'math'));

  // Disjoint sequential subject sets
  const lawSet1 = buildExamForSetId('subject-law', { setIndex: 1, count: 20 });
  const lawSet2 = buildExamForSetId('subject-law', { setIndex: 2, count: 20 });
  assert.equal(lawSet1.items.length, 20);
  assert.equal(lawSet2.items.length, 20);
  assert.ok(lawSet1.items.every((q) => q.subject === 'law'));
  assert.ok(lawSet2.items.every((q) => q.subject === 'law'));
  const law1Ids = new Set(lawSet1.items.map((q) => q.id));
  for (const item of lawSet2.items) {
    assert.equal(law1Ids.has(item.id), false, 'subject-law set 1 and set 2 must be disjoint');
  }

  // Sub-topic ordered drill
  const comWord = buildExamForSetId('topic', { subject: 'com', topic: 'Word', setIndex: 1, count: 20 });
  assert.equal(comWord.items.length, 20);
  assert.ok(comWord.items.every((q) => q.subject === 'com'));
  assert.ok(comWord.title.includes('ชุดที่ 1'));

  // Multi-variant topic drill
  const comData = buildExamForSetId('topic', {
    subject: 'com',
    topic: 'Data & People||Data and People',
    setIndex: 1,
    count: 50,
  });
  assert.ok(comData.items.length > 0);
  assert.ok(comData.items.every((q) => q.subject === 'com'));

  // Track-weighted random mock (full 150 matches TRACKS[0] exact subject weights)
  const randFull = buildExamForSetId('random-0');
  assert.equal(randFull.items.length, 150);
  const weightCounts: Record<string, number> = {};
  for (const q of randFull.items) {
    weightCounts[q.subject] = (weightCounts[q.subject] || 0) + 1;
  }
  for (const [sk, expectedCount] of Object.entries(TRACKS[0].weights)) {
    assert.equal(
      weightCounts[sk] || 0,
      expectedCount,
      `Expected ${expectedCount} questions for ${sk} in random-0`
    );
  }

  // Track-weighted random mock with explicit count
  const rand25 = buildExamForSetId('random-0', { count: 25 });
  assert.equal(rand25.items.length, 25);
});

test('question-pool: outcomes tracking, deduplication (excludeCompleted), completed-* builders & reset', () => {
  const store = getStore();
  const comWordIds = store.questions
    .filter((q) => q.subject_key === 'com' && q.title === 'Word')
    .slice(0, 5)
    .map((q) => q.id);
  const mathIds = store.questions
    .filter((q) => q.subject_key === 'math')
    .slice(0, 3)
    .map((q) => q.id);
  assert.equal(comWordIds.length, 5);
  assert.equal(mathIds.length, 3);

  const profile: { bookmarks: number[]; mistakeIds: number[]; correctIds: number[] } = {
    bookmarks: [],
    mistakeIds: [],
    correctIds: [],
  };

  // Mark 3 com/Word correct, 2 com/Word wrong, 3 math correct
  applyQuestionOutcomes(profile, [
    { id: comWordIds[0], correct: true },
    { id: comWordIds[1], correct: true },
    { id: comWordIds[2], correct: true },
    { id: comWordIds[3], correct: false },
    { id: comWordIds[4], correct: false },
    ...mathIds.map((id) => ({ id, correct: true })),
  ]);

  let sets = getCompletedIdSets(profile);
  assert.equal(sets.correctSet.size, 6);
  assert.equal(sets.mistakeSet.size, 2);
  assert.equal(sets.allCompletedSet.size, 8);

  // Retry wrong question -> answer correctly -> moves from mistakeIds to correctIds automatically
  applyQuestionOutcomes(profile, [{ id: comWordIds[3], correct: true }]);
  sets = getCompletedIdSets(profile);
  assert.equal(sets.correctSet.size, 7);
  assert.equal(sets.mistakeSet.size, 1);
  assert.equal(sets.mistakeSet.has(comWordIds[3]), false);
  assert.equal(sets.correctSet.has(comWordIds[3]), true);

  // Re-answer correct question wrongly -> moves back to mistakeIds
  applyQuestionOutcomes(profile, [{ id: comWordIds[0], correct: false }]);
  sets = getCompletedIdSets(profile);
  assert.equal(sets.correctSet.size, 6);
  assert.equal(sets.mistakeSet.size, 2);

  const source = {
    allQuestions: store.questions,
    findById: (id: number) => store.questionsById.get(id),
    fixedIdsForSet: (sid: string) => store.setsMap.get(sid),
    setMetaForSet: (sid: string) => store.examSets.find((s) => String(s.id) === sid),
    profile,
  };

  // Normal topic with excludeCompleted=true excludes all 5 answered com/Word items
  const filteredWord = buildExamFromSource(source, 'topic', {
    subject: 'com',
    topic: 'Word',
    setIndex: 1,
    count: 50,
    excludeCompleted: true,
  });
  for (const item of filteredWord.items) {
    assert.equal(comWordIds.includes(item.id), false, `Completed #${item.id} must be excluded`);
  }

  // Normal subject with excludeCompleted=true excludes all completed math IDs
  const filteredMath = buildExamFromSource(source, 'subject-math', {
    count: 150,
    setIndex: 1,
    excludeCompleted: true,
  });
  for (const item of filteredMath.items) {
    assert.equal(mathIds.includes(item.id), false, `Completed math #${item.id} must be excluded`);
  }

  // Completed-pool builders across all 3 structures & all 3 pool filters
  const compFormAll = buildExamFromSource(source, 'completed-form', { pool: 'all', setIndex: 1 });
  assert.equal(compFormAll.items.length, 8);
  const compFormCorrect = buildExamFromSource(source, 'completed-form', { pool: 'correct', setIndex: 1 });
  assert.equal(compFormCorrect.items.length, 6);
  const compFormWrong = buildExamFromSource(source, 'completed-form', { pool: 'wrong', setIndex: 1 });
  assert.equal(compFormWrong.items.length, 2);

  const compSubjCom = buildExamFromSource(source, 'completed-subject', {
    pool: 'all',
    subject: 'com',
    setIndex: 1,
  });
  assert.equal(compSubjCom.items.length, 5);
  assert.ok(compSubjCom.items.every((q) => q.subject === 'com'));

  const compTopicWordWrong = buildExamFromSource(source, 'completed-topic', {
    pool: 'wrong',
    subject: 'com',
    topic: 'Word',
    setIndex: 1,
  });
  assert.equal(compTopicWordWrong.items.length, 2);

  // Scoped resets
  resetCompletedHistory(profile, { scope: 'topic', subject: 'com', topic: 'Word', pool: 'wrong' }, store.questions);
  assert.equal(getCompletedIdSets(profile).mistakeSet.size, 0);
  assert.equal(getCompletedIdSets(profile).correctSet.size, 6);

  resetCompletedHistory(profile, { scope: 'subject', subject: 'math', pool: 'all' }, store.questions);
  assert.equal(getCompletedIdSets(profile).correctSet.size, 3); // only 3 com/Word left

  resetCompletedHistory(profile, { scope: 'all', pool: 'all' }, store.questions);
  assert.equal(getCompletedIdSets(profile).allCompletedSet.size, 0);
});
