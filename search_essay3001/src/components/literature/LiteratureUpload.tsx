'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { parsePDF } from '@/lib/pdf-parser';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface LiteratureUploadProps {
  onUploaded: () => void;
}

export function LiteratureUpload({ onUploaded }: LiteratureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf',
      );

      if (pdfFiles.length === 0) {
        showToast('请选择 PDF 文件', 'error');
        return;
      }

      setUploading(true);

      for (const file of pdfFiles) {
        try {
          const { text, metadata } = await parsePDF(file);

          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', metadata.title || file.name.replace(/\.pdf$/i, ''));
          formData.append('author', metadata.author || '');
          formData.append('text', text);

          const res = await fetch('/api/literature/upload', {
            method: 'POST',
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '上传失败');
          }

          showToast(`「${file.name}」上传成功`, 'success');
        } catch (err) {
          showToast(
            `「${file.name}」${err instanceof Error ? err.message : '解析失败'}`,
            'error',
          );
        }
      }

      setUploading(false);
      onUploaded();
    },
    [onUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${uploading
          ? 'border-cyan-300 bg-cyan-50'
          : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {uploading ? (
        <LoadingSpinner size="md" text="正在解析 PDF..." />
      ) : (
        <>
          <Upload className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            拖拽 PDF 文件到此处，或点击上传
          </p>
          <p className="mt-1 text-xs text-slate-400">
            支持单篇/批量 PDF上传，自动解析标题、作者、全文
          </p>
        </>
      )}
    </div>
  );
}
