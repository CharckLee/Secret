'use client';

import type { LiteratureData } from '@/types';
import { LiteratureCard } from './LiteratureCard';

interface LiteratureGridProps {
  literatures: LiteratureData[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onCardClick: (id: number) => void;
}

export function LiteratureGrid({
  literatures,
  selectedIds,
  onToggleSelect,
  onCardClick,
}: LiteratureGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {literatures.map((lit) => (
        <LiteratureCard
          key={lit.id}
          literature={lit}
          selected={selectedIds.has(lit.id)}
          onToggleSelect={onToggleSelect}
          onClick={() => onCardClick(lit.id)}
        />
      ))}
    </div>
  );
}
