'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  hoverable = true,
  selected = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4',
        hoverable &&
          'cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
        selected && 'ring-2 ring-cyan-500 border-cyan-500',
        className,
      )}
    >
      {children}
    </div>
  );
}
