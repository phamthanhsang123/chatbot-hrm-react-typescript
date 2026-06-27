'use client';

import type { ReactNode } from 'react';
import { Card } from './ui/card';

type MetricTone = 'blue' | 'emerald' | 'orange' | 'red' | 'violet' | 'slate';

const toneClass: Record<MetricTone, string> = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  violet: 'text-violet-600',
  slate: 'text-slate-600',
};

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  tone?: MetricTone;
};

export function MetricCard({ title, value, description, icon, tone = 'blue' }: MetricCardProps) {
  return (
    <Card className="!gap-2 border-gray-200 !p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <div className={toneClass[tone]}>{icon}</div>}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </Card>
  );
}
