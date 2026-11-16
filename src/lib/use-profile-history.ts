'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SubjectKey } from './constants';
import { getCompletedIdSets, type ResetCompletedFilter } from './question-pool';

export interface ProfileHistoryState {
  correctIds: number[];
  mistakeIds: number[];
  excludeCompleted: boolean;
}

export function useProfileHistory(initial?: Partial<ProfileHistoryState>) {
  const [correctIds, setCorrectIds] = useState<number[]>(initial?.correctIds || []);
  const [mistakeIds, setMistakeIds] = useState<number[]>(initial?.mistakeIds || []);
  const [excludeCompleted, setExcludeCompleted] = useState<boolean>(
    initial?.excludeCompleted ?? true
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/profile', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const prof = data?.profile;
      if (!prof) return;
      setCorrectIds(Array.isArray(prof.correctIds) ? prof.correctIds.map(Number) : []);
      setMistakeIds(Array.isArray(prof.mistakeIds) ? prof.mistakeIds.map(Number) : []);
      setExcludeCompleted(
        typeof prof.excludeCompleted === 'boolean' ? prof.excludeCompleted : true
      );
    } catch {
      // keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
      setSaving(true);
      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludeCompleted: next }),
        });
        if (res.ok) {
          const d = await res.json();
          if (typeof d?.profile?.excludeCompleted === 'boolean') {
            setExcludeCompleted(d.profile.excludeCompleted);
          }
        }
      } catch {
        // optimistic state preserved
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const resetCompleted = useCallback(async (filter: ResetCompletedFilter) => {
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
          setCorrectIds(Array.isArray(prof.correctIds) ? prof.correctIds.map(Number) : []);
          setMistakeIds(Array.isArray(prof.mistakeIds) ? prof.mistakeIds.map(Number) : []);
        }
      }
    } finally {
      setSaving(false);
    }
  }, []);

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
