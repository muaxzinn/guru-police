import React from 'react';
import {
  BookOpen,
  Calculator,
  FileText,
  Globe,
  Languages,
  Monitor,
  Scale,
} from 'lucide-react';
import { SUBJECT_MAP, type SubjectKey } from '@/lib/constants';

const ICONS: Record<SubjectKey, React.ComponentType<{ className?: string }>> = {
  math: Calculator,
  thai: BookOpen,
  eng: Languages,
  com: Monitor,
  doc: FileText,
  law: Scale,
  soc: Globe,
};

export function SubjectIcon({
  subjectKey,
  size = 'md',
}: {
  subjectKey: SubjectKey;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = SUBJECT_MAP[subjectKey] || SUBJECT_MAP.math;
  const Icon = ICONS[subjectKey] || Calculator;
  const dims =
    size === 'sm'
      ? 'h-7 w-7 rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 rounded-2xl'
        : 'h-9 w-9 rounded-xl';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${dims} border border-line/60`}
      style={{
        backgroundColor: `${meta.color}1A`,
        color: meta.color,
      }}
    >
      <Icon className={iconSize} />
    </span>
  );
}

