'use client';

import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

let addToastFn: ((message: string, type: ToastType) => void) | null = null;

/** 全局 toast 函数，组件外部也可调用 */
export function showToast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type);
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-400 text-emerald-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  info: 'bg-cyan-50 border-cyan-400 text-cyan-800',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<(ToastState & { id: number })[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-3 rounded-lg border shadow-lg text-sm font-medium',
            'animate-slide-in',
            typeClasses[t.type],
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
