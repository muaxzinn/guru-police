'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubjectKey } from './constants';
import { getCompletedIdSets, type ResetCompletedFilter } from './question-pool';

export interface ProfileHistoryState {
  correctIds: number[];
  mistakeIds: number[];
  excludeCompleted: boolean;
}

const PROFILE_CACHE_KEY = 'gp:profile-cache:v2';
let cachedProfileState: ProfileHistoryState | null = null;

function sanitizeProfileState(raw: Partial<ProfileHistoryState>): ProfileHistoryState {
  return {
    correctIds: Array.isArray(raw.correctIds) ? raw.correctIds.map(Number) : [],
    mistakeIds: Array.isArray(raw.mistakeIds) ? raw.mistakeIds.map(Number) : [],
    excludeCompleted:
      typeof raw.excludeCompleted === 'boolean' ? raw.excludeCompleted : true,
  };
}

function readLocalProfileCache(): ProfileHistoryState | null {
  if (typeof window === 'undefined') return null;
  try {
    const serialized = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as Partial<ProfileHistoryState>;
    const normalized = sanitizeProfileState(parsed);
    cachedProfileState = normalized;
    return normalized;
  } catch {
    return null;
  }
}

export function primeProfileHistoryCache(profile: Partial<ProfileHistoryState>): void {
  if (typeof window === 'undefined') return;
  const normalized = sanitizeProfileState(profile);
  cachedProfileState = normalized;
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage quota errors
  }
}

export function invalidateProfileHistoryCache(): void {
  cachedProfileState = null;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function useProfileHistory(initial?: Partial<ProfileHistoryState>) {
  const hasMemoryCache = typeof window !== 'undefined' && cachedProfileState !== null;

  const [correctIds, setCorrectIds] = useState<number[]>(
    () => initial?.correctIds || (hasMemoryCache ? cachedProfileState!.correctIds : [])
  );
  const [mistakeIds, setMistakeIds] = useState<number[]>(
    () => initial?.mistakeIds || (hasMemoryCache ? cachedProfileState!.mistakeIds : [])
  );
  const [excludeCompleted, setExcludeCompleted] = useState<boolean>(() =>
    initial?.excludeCompleted !== undefined
      ? initial.excludeCompleted
      : hasMemoryCache
        ? cachedProfileState!.excludeCompleted
        : true
  );
  const [loading, setLoading] = useState<boolean>(() => !hasMemoryCache && !initial);
  const [saving, setSaving] = useState(false);

  const applyAndCache = useCallback((prof: Partial<ProfileHistoryState>) => {
    const normalized = sanitizeProfileState(prof);
    setCorrectIds(normalized.correctIds);
    setMistakeIds(normalized.mistakeIds);
    setExcludeCompleted(normalized.excludeCompleted);
    primeProfileHistoryCache(normalized);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const prof = data?.profile;
      if (!prof) return;
      applyAndCache(prof);
    } catch {
      // keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [applyAndCache]);

  useEffect(() => {
    if (!cachedProfileState) {
      const local = readLocalProfileCache();
      if (local) {
        setCorrectIds(local.correctIds);
        setMistakeIds(local.mistakeIds);
        setExcludeCompleted(local.excludeCompleted);
        setLoading(false);
      }
    }
    void reload();
    const onUpdated = () => {
      void reload();
    };
    window.addEventListener('gp:runtime-updated', onUpdated);
    return () => window.removeEventListener('gp:runtime-updated', onUpdated);
  }, [reload]);

  const { correctSet, mistakeSet, allCompletedSet } = useMemo(
    () => getCompletedIdSets({ correctIds, mistakeIds }),
    [correctIds, mistakeIds]
  );

  const toggleExcludeCompleted = useCallback(
    async (next: boolean) => {
      setExcludeCompleted(next);
      primeProfileHistoryCache({
        correctIds,
        mistakeIds,
        excludeCompleted: next,
      });
      setSaving(true);
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludeCompleted: next }),
        });
        if (res.ok) {
          const d = await res.json();
          if (d?.profile) {
            applyAndCache(d.profile);
          }
        }
      } catch {
        // optimistic state preserved
      } finally {
        setSaving(false);
      }
    },
    [applyAndCache, correctIds, mistakeIds]
  );

  const resetCompleted = useCallback(
    async (filter: ResetCompletedFilter) => {
      setSaving(true);
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetCompleted: filter }),
        });
        if (res.ok) {
          const d = await res.json();
          const prof = d?.profile;
          if (prof) {
            applyAndCache(prof);
          }
        }
      } finally {
        setSaving(false);
      }
    },
    [applyAndCache]
  );

  const resetForSubject = useCallback(
    (subject: SubjectKey, pool: 'all' | 'correct' | 'wrong' = 'all') =>
      resetCompleted({ scope: 'subject', subject, pool }),
    [resetCompleted]
  );

  const resetForTopic = useCallback(
    (subject: SubjectKey, topic: string, pool: 'all' | 'correct' | 'wrong' = 'all') =>
      resetCompleted({ scope: 'topic', subject, topic, pool }),
    [resetCompleted]
  );

  return {
    correctIds,
    mistakeIds,
    correctSet,
    mistakeSet,
    allCompletedSet,
    excludeCompleted,
    loading,
    saving,
    reload,
    toggleExcludeCompleted,
    resetCompleted,
    resetForSubject,
    resetForTopic,
  };
}
