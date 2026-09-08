'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { checkFormat } from '@/lib/format/check';
import { cleanLayout } from '@/lib/format/clean';
import { splitSentences } from '@/lib/text/split';
import { htmlToText } from '@/lib/export/htmlText';
import { htmlToDocx } from '@/lib/export/htmlToDocx';
import { textToHtml } from '@/lib/export/textToHtml';
import { toMarkdown } from '@/lib/export/markdown';
import { getDocument, saveDocument } from '@/lib/db/documents';
import type { SourceFormat } from '@/lib/types';

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
}>;

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
  const [saved, setSaved] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const skipSyncRef = useRef(false);

  const metaRef = useRef({ docId, createdAt, sourceFormat });
  useEffect(() => {
    metaRef.current = { docId, createdAt, sourceFormat };
  }, [docId, createdAt, sourceFormat]);

  const issues = useMemo(() => checkFormat(htmlToText(content)), [content]);

  // 外部设置 content（加载/导入/润色写回）时同步到 contentEditable；用户输入时跳过以保留光标
  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

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
    if (!htmlToText(content).trim()) return;
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

  // 自动保存
  useEffect(() => {
    if (!htmlToText(content).trim() || !dirty) return;
    const t = setTimeout(() => void saveNow(), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title]);

  // 离开前提醒
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

  function handleInput() {
    skipSyncRef.current = true;
    const html = editorRef.current?.innerHTML ?? '';
    setContent(html);
    setDirty(true);
    setSelection('');
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    setDirty(true);
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
  }

  async function handleFile(file: File) {
    setFileError('');
    try {
      if (file.name.endsWith('.txt')) {
        setContent(textToHtml(await file.text()));
        setSourceFormat('txt');
      } else if (file.name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
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

  function getSelectionText(): string {
    const sel = window.getSelection();
    return sel ? sel.toString() : '';
  }

  async function handlePolish() {
    const selText = getSelectionText();
    const text = selText || htmlToText(content);
    setPolishing(true);
    setPolishError('');
    try {
      const resp = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
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
    const selText = getSelectionText();
    if (selText) {
      // 选段润色：替换选中区域，保留选区外格式
      document.execCommand('insertText', false, polish);
      handleInput();
    } else {
      // 全文润色：以纯文本写回（格式重置为基本段落）
      setContent(textToHtml(polish));
      setDirty(true);
    }
    setPolish('');
    setSelection('');
  }

  function onSelect() {
    setSelection(getSelectionText());
  }

  function downloadBlob(blob: Blob, filename: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveBlobAs(
    blob: Blob,
    suggestedName: string,
    accept: Record<string, string[]>,
  ): Promise<boolean> {
    const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({ suggestedName, types: [{ accept }] });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return false;
      }
    }
    downloadBlob(blob, suggestedName);
    return true;
  }

  async function handleSave() {
    const blob = await htmlToDocx(title, content);
    const ok = await saveBlobAs(blob, `${title || 'document'}.docx`, {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function exportWord() {
    const blob = await htmlToDocx(title, content);
    await saveBlobAs(blob, `${title || 'document'}.docx`, {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    });
  }

  async function exportTxt() {
    await saveBlobAs(
      new Blob([htmlToText(content)], { type: 'text/plain;charset=utf-8' }),
      `${title || 'document'}.txt`,
      { 'text/plain': ['.txt'] },
    );
  }

  async function exportMarkdown() {
    await saveBlobAs(
      new Blob([toMarkdown(htmlToText(content))], { type: 'text/markdown;charset=utf-8' }),
      `${title || 'document'}.md`,
      { 'text/markdown': ['.md'] },
    );
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
          <button onClick={handleSave} className="rounded bg-blue-600 px-4 py-2 text-white">
            {saved ? '已保存 ✓' : '保存'}
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
            onClick={() => {
              setContent(textToHtml(cleanLayout(htmlToText(content))));
              setDirty(true);
            }}
            className="rounded border px-4 py-2 text-sm"
          >
            一键排版清理
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded border px-4 py-2 text-sm">
              另存为
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-44 rounded border bg-white p-1 shadow-lg">
              <button
                onClick={exportWord}
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                Word 文档 (.docx)
              </button>
              <button
                onClick={exportTxt}
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                纯文本 (.txt)
              </button>
              <button
                onClick={exportMarkdown}
                className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-gray-100"
              >
                Markdown (.md)
              </button>
            </div>
          </details>
        </div>
      </div>

      {fileError && <p className="text-sm text-red-600">{fileError}</p>}
      {dirty && <p className="text-xs text-gray-400">有未保存的修改，3 秒后自动保存</p>}

      <BoundaryNotice />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded border bg-white">
          <div className="flex flex-wrap gap-1 border-b p-1 text-sm">
            <button onClick={() => exec('bold')} className="rounded px-2 py-1 font-bold hover:bg-gray-100" title="加粗">
              B
            </button>
            <button onClick={() => exec('italic')} className="rounded px-2 py-1 italic hover:bg-gray-100" title="斜体">
              I
            </button>
            <button onClick={() => exec('underline')} className="rounded px-2 py-1 underline hover:bg-gray-100" title="下划线">
              U
            </button>
            <select
              onChange={(e) => e.target.value && exec('formatBlock', e.target.value)}
              defaultValue="p"
              className="rounded border px-1 py-1"
              title="标题"
            >
              <option value="p">正文</option>
              <option value="h1">标题 1</option>
              <option value="h2">标题 2</option>
              <option value="h3">标题 3</option>
            </select>
            <button onClick={() => exec('insertUnorderedList')} className="rounded px-2 py-1 hover:bg-gray-100" title="无序列表">
              • 列表
            </button>
            <button onClick={() => exec('insertOrderedList')} className="rounded px-2 py-1 hover:bg-gray-100" title="有序列表">
              1. 列表
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onSelect={onSelect}
            className="min-h-[420px] p-3 text-sm leading-relaxed outline-none"
          />
        </div>

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
              {selection ? `已选 ${splitSentences(selection).length} 句` : '未选段时润色全文（格式将重置为纯文本）'}
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
                <div className="rounded bg-gray-50 p-2 text-xs">原文：{selection || htmlToText(content)}</div>
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
