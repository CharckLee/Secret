import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <LoadingSpinner size="lg" text="LitMind 加载中..." />
    </div>
  );
}
