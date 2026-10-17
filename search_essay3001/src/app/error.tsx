'use client';

import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">页面加载异常</h2>
        <p className="text-sm text-slate-500 mb-6">
          {error.message || '发生了未知错误，请重试'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            重试
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = '/')}
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}
