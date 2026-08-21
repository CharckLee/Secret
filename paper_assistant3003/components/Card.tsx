import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`card-hover rounded-xl border bg-white p-4 ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}
