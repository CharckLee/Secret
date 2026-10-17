'use client';

import type { LiteratureData } from '@/types';
import { batchFormatGB7714 } from '@/lib/citation';
import { Button } from '@/components/ui/Button';
import { Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/components/ui/Toast';

interface CitationExportButtonProps {
  literatures: LiteratureData[];
}

export function CitationExportButton({
  literatures,
}: CitationExportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (literatures.length === 0) return null;

  const text = batchFormatGB7714(literatures);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    showToast('引用已复制到剪贴板', 'success');
    setShowModal(false);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references_gbt7714.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('引用文件已下载', 'success');
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowModal(true)}
        disabled={literatures.length === 0}
      >
        <Copy className="h-3.5 w-3.5 mr-1" />
        导出引用 ({literatures.length})
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[70vh] flex flex-col">
            <h3 className="font-semibold text-slate-800">
              GB/T 7714 参考文献
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {literatures.length} 篇文献
            </p>

            <pre className="mt-4 flex-1 overflow-auto text-sm text-slate-700 whitespace-pre-wrap font-sans p-4 bg-slate-50 rounded-lg max-h-96">
              {text}
            </pre>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                复制全部
              </Button>
              <Button variant="primary" size="sm" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" />
                下载 TXT
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
