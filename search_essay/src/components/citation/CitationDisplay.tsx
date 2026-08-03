'use client';

import type { LiteratureData } from '@/types';
import { formatGB7714 } from '@/lib/citation';
import { Button } from '@/components/ui/Button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

interface CitationDisplayProps {
  literature: LiteratureData;
}

export function CitationDisplay({ literature }: CitationDisplayProps) {
  const [copied, setCopied] = useState(false);
  const citation = formatGB7714(literature);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    showToast('引用已复制到剪贴板', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-700 leading-relaxed">{citation}</p>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">GB/T 7714 期刊论文格式</p>
    </div>
  );
}
