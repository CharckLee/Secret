'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { checkFormat } from '@/lib/format/check';
import { cleanLayout } from '@/lib/format/clean';
import { splitSentences } from '@/lib/text/split';
import { applyReplacement } from '@/lib/text/replace';
import { getDocument, saveDocument } from '@/lib/db/documents';
import type { SourceFormat } from '@/lib/types';

function EditorInner() {
  const params = useSearchParams();
  const urlId = params.get('id');

  const [docId, setDocId] = useState<string | null>(urlId);
  const [createdAt, setCreatedAt] = useState(0);
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>('paste');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [polish, setPolish] = useState('');
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState('');
  const [fileError, setFileError] = useState('');
  const [selection, setSelection] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const metaRef = useRef({ docId, createdAt, sourceFormat });
  useEffect(() => {
    metaRef.current = { docId, createdAt, sourceFormat };
  }, [docId, createdAt, sourceFormat]);

  const issues = useMemo(() => checkFormat(content), [content]);

  // 加载历史文档
  useEffect(() => {
    if (urlId) {
      getDocument(urlId).then((d) => {
        if (d) {
          setDocId(d.id);
          setCreatedAt(d.createdAt);
          setSourceFormat(d.sourceFormat);
          setTitle(d.title);
          setContent(d.content);
        }
      });
    }
  }, [urlId]);

  async function saveNow() {
    if (!content.trim()) return;
    const now = Date.now();
    const { docId: curId, createdAt: curCreated, sourceFormat: curFmt } = metaRef.current;
    const finalId = curId ?? `doc-${Date.now()}`;
    await saveDocument({
      id: finalId,
      title: title || '未命名文稿',
      content,
      sourceFormat: curFmt,
      createdAt: curCreated || now,
      updatedAt: now,
    });
    setDocId(finalId);
    setCreatedAt((prev) => prev || now);
    setDirty(false);
  }

  // 自动保存：内容/标题变化 3 秒后落库（saveNow 内部用 metaRef 读最新 meta，避免闭包陈旧）
  useEffect(() => {
    if (!content.trim() || !dirty) return;
    const t = setTimeout(() => void saveNow(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title]);

  // 离开前提醒未保存内容
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function handleContentChange(v: string) {
    setContent(v);
    setDirty(true);
    setSelection('');
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    setDirty(true);
  }

  async function handleFile(file: File) {
    setFileError('');
    try {
      if (file.name.endsWith('.txt')) {
        setContent(await file.text());
        setSourceFormat('txt');
      } else if (file.name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        setContent(result.value);
        setSourceFormat('docx');
      } else {
        setFileError('仅支持 .txt 或 .docx 文件');
        return;
      }
      setDirty(true);
    } catch {
      setFileError('文件解析失败：格式不支持或文件损坏，建议转为 txt 后重试');
    }
  }

  async function handlePolish() {
    setPolishing(true);
    setPolishError('');
    try {
      const resp = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection || content }),
      });
      const data = await resp.json();
      if (!resp.ok) setPolishError(data.error ?? '润色失败');
      else setPolish(data.polished);
    } catch (err) {
      setPolishError(`请求失败: ${err}`);
    } finally {
      setPolishing(false);
    }
  }

  function applyPolish() {
    setContent(applyReplacement(content, selection, polish));
    setPolish('');
    setSelection('');
    setDirty(true);
  }

  function onSelect() {
    const el = textareaRef.current;
    if (el) setSelection(el.value.slice(el.selectionStart, el.selectionEnd));
  }

  function handleExportText() {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title || 'document'}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="文稿标题"
          className="text-2xl font-bold outline-none"
        />
        <div className="flex gap-2">
          <button onClick={() => void saveNow()} className="rounded bg-blue-600 px-4 py-2 text-white">
            保存
          </button>
          <label className="cursor-pointer rounded border px-4 py-2 text-sm">
            导入文件
            <input
              type="file"
              accept=".txt,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <button
            onClick={() => handleContentChange(cleanLayout(content))}
            className="rounded border px-4 py-2 text-sm"
          >
            一键排版清理
          </button>
          <button onClick={handleExportText} className="rounded border px-4 py-2 text-sm">
            导出 txt
          </button>
        </div>
      </div>

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}
      {dirty && <p className="text-xs text-gray-400">有未保存的修改，3 秒后自动保存</p>}

      <BoundaryNotice />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <textarea
          ref={textareaRef}
          value={content}
          onSelect={onSelect}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={24}
          className="w-full rounded border p-3 font-mono text-sm"
        />

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">格式检测结果（{issues.length}）</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-gray-500">未发现格式问题</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {issues.map((iss, i) => (
                  <li key={i} className="rounded bg-gray-50 p-2">
                    <span className="font-semibold">第 {iss.line} 行</span> [{iss.type}] {iss.message}
                    <p className="mt-1 text-xs text-gray-500">建议：{iss.suggestion}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">AI 学术润色</h2>
            <p className="mb-2 text-xs text-gray-500">
              {selection ? `已选 ${splitSentences(selection).length} 句` : '未选段时润色全文'}
            </p>
            <button
              onClick={handlePolish}
              disabled={polishing}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {polishing ? '润色中…' : '开始润色'}
            </button>
            {polishError && <p className="mt-2 text-xs text-red-600">{polishError}</p>}
            {polish && (
              <div className="mt-3 space-y-2">
                <div className="rounded bg-gray-50 p-2 text-xs">原文：{selection || content}</div>
                <div className="rounded bg-blue-50 p-2 text-xs">润色：{polish}</div>
                <div className="flex gap-2">
                  <button
                    onClick={applyPolish}
                    className="rounded bg-green-600 px-3 py-1 text-xs text-white"
                  >
                    采纳替换
                  </button>
                  <button
                    onClick={() => setPolish('')}
                    className="rounded border px-3 py-1 text-xs"
                  >
                    放弃
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>加载中…</div>}>
      <EditorInner />
    </Suspense>
  );
}
