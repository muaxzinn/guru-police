-- ============================================================================
-- GuruPolice V2 PostgreSQL Schema + Atomic Attempt Submission RPC
-- Open-Access Practice Platform (No Auth / No Login / No Promo Codes Required)
-- ============================================================================

-- 1. Open Study State (Track selection, Bookmarks, Mistake Notebook, Daily Streak)
CREATE TABLE IF NOT EXISTS public.study_state (
  workspace_key TEXT PRIMARY KEY DEFAULT 'default',
  track TEXT NOT NULL DEFAULT 'สายอำนวยการ / พิสูจน์หลักฐาน',
  bookmarks BIGINT[] NOT NULL DEFAULT '{}',
  mistake_ids BIGINT[] NOT NULL DEFAULT '{}',
  streak_days INTEGER NOT NULL DEFAULT 1,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Question Bank (7,038+ items)
CREATE TABLE IF NOT EXISTS public.questions (
  id BIGINT PRIMARY KEY,
  subject_key TEXT NOT NULL CHECK (subject_key IN ('math','thai','eng','com','doc','law','soc')),
  set_id BIGINT,
  title TEXT,
  batch TEXT NOT NULL DEFAULT 'seed',
  stem TEXT NOT NULL,
  img TEXT,
  opts JSONB NOT NULL,
  opt_imgs JSONB,
  correct_index SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  correct_label TEXT NOT NULL,
  explanation TEXT,
  explanation_img TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_title ON public.questions(subject_key, title);
CREATE INDEX IF NOT EXISTS idx_questions_set_id ON public.questions(set_id);

-- 3. Exam Sets
CREATE TABLE IF NOT EXISTS public.exam_sets (
  id BIGINT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('form','subject')),
  title TEXT NOT NULL,
  subtitle TEXT,
  total INTEGER NOT NULL,
  time_minutes INTEGER NOT NULL,
  subject_key TEXT,
  track TEXT,
  subject_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  question_ids BIGINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Exam Attempts
CREATE TABLE IF NOT EXISTS public.attempts (
  id BIGSERIAL PRIMARY KEY,
  workspace_key TEXT NOT NULL REFERENCES public.study_state(workspace_key) ON DELETE CASCADE,
  set_id TEXT NOT NULL,
  set_title TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('real','practice')),
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_sec INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  pct INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  per_subject JSONB NOT NULL DEFAULT '[]'::jsonb,
  groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  per_topic JSONB NOT NULL DEFAULT '[]'::jsonb,
  wrong_indices INTEGER[] NOT NULL DEFAULT '{}',
  question_ids BIGINT[] NOT NULL DEFAULT '{}',
  answers SMALLINT[] NOT NULL DEFAULT '{}',
  bookmarked_ids BIGINT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_attempts_workspace_submitted
  ON public.attempts(workspace_key, submitted_at DESC);

-- 5. In-Progress Autosave
CREATE TABLE IF NOT EXISTS public.exam_progress (
  workspace_key TEXT PRIMARY KEY REFERENCES public.study_state(workspace_key) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Question & System Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT,
  question_text TEXT,
  category TEXT NOT NULL CHECK (category IN ('question','system')),
  reason TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Atomic RPC: Submit Exam Attempt & Update Mistake/Streak Atomically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_exam_attempt(
  p_workspace_key TEXT,
  p_set_id TEXT,
  p_set_title TEXT,
  p_mode TEXT,
  p_started_at TIMESTAMPTZ,
  p_duration_sec INTEGER,
  p_score INTEGER,
  p_total INTEGER,
  p_pct INTEGER,
  p_passed BOOLEAN,
  p_per_subject JSONB,
  p_groups JSONB,
  p_per_topic JSONB,
  p_wrong_indices INTEGER[],
  p_question_ids BIGINT[],
  p_answers SMALLINT[],
  p_bookmarked_ids BIGINT[],
  p_wrong_qids BIGINT[],
  p_corrected_qids BIGINT[]
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempt_id BIGINT;
  v_state public.study_state%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_next_streak INTEGER;
  v_next_mistakes BIGINT[];
BEGIN
  INSERT INTO public.study_state (workspace_key)
  VALUES (COALESCE(NULLIF(TRIM(p_workspace_key), ''), 'default'))
  ON CONFLICT (workspace_key) DO NOTHING;

  SELECT * INTO v_state
  FROM public.study_state
  WHERE workspace_key = COALESCE(NULLIF(TRIM(p_workspace_key), ''), 'default')
  FOR UPDATE;

  INSERT INTO public.attempts (
    workspace_key, set_id, set_title, mode, started_at, duration_sec,
    score, total, pct, passed, per_subject, groups, per_topic,
    wrong_indices, question_ids, answers, bookmarked_ids
  ) VALUES (
    v_state.workspace_key, p_set_id, p_set_title, p_mode, p_started_at, p_duration_sec,
    p_score, p_total, p_pct, p_passed, p_per_subject, p_groups, p_per_topic,
    p_wrong_indices, p_question_ids, p_answers, p_bookmarked_ids
  )
  RETURNING id INTO v_attempt_id;

  IF v_state.last_active_date = v_today THEN
    v_next_streak := v_state.streak_days;
  ELSIF v_state.last_active_date = (v_today - 1) THEN
    v_next_streak := v_state.streak_days + 1;
  ELSE
    v_next_streak := 1;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x
    FROM UNNEST(COALESCE(v_state.mistake_ids, '{}') || COALESCE(p_wrong_qids, '{}')) AS x
    WHERE NOT (x = ANY(COALESCE(p_corrected_qids, '{}')))
  ) INTO v_next_mistakes;

  UPDATE public.study_state
  SET mistake_ids = v_next_mistakes,
      bookmarks = COALESCE(p_bookmarked_ids, bookmarks),
      streak_days = v_next_streak,
      last_active_date = v_today,
      updated_at = NOW()
  WHERE workspace_key = v_state.workspace_key;

  DELETE FROM public.exam_progress WHERE workspace_key = v_state.workspace_key;

  RETURN v_attempt_id;
END;
$$;
