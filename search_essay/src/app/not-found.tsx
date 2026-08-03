import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
          <FileQuestion className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">页面不存在</h2>
        <p className="text-sm text-slate-500 mb-6">
          您访问的页面可能已被移除或地址有误
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg
                     hover:bg-cyan-700 transition-colors"
        >
          返回文献库
        </Link>
      </div>
    </div>
  );
}
