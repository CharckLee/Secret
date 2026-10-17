'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '@/lib/utils';

interface NoteEditorProps {
  literatureId: number;
}

export function NoteEditor({ literatureId }: NoteEditorProps) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading] = useState(true);
  const noteIdRef = useRef<number | null>(null);

  // 加载已有笔记
  useEffect(() => {
    async function loadNote() {
      try {
        const res = await fetch(`/api/notes?literatureId=${literatureId}`);
        if (res.ok) {
          const notes = await res.json();
          if (notes.length > 0) {
            noteIdRef.current = notes[0].id;
            setContent(notes[0].content);
          }
        }
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    }
    loadNote();
  }, [literatureId]);

  // 自动保存（2秒 debounce）+ 清理
  const autoSave = useCallback(
    debounce(async (text: string) => {
      try {
        if (noteIdRef.current) {
          await fetch(`/api/notes/${noteIdRef.current}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text }),
          });
        } else {
          const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ literatureId, content: text }),
          });
          if (res.ok) {
            const data = await res.json();
            noteIdRef.current = data.id;
          }
        }
        setSaved(true);
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    }, 2000),
    [literatureId],
  );

  // 组件卸载或 literatureId 变化时取消待执行的 debounce
  useEffect(() => {
    return () => {
      autoSave.cancel();
    };
  }, [autoSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    setSaved(false);
    setSaveError(false);
    autoSave(text);
  };

  if (loading) {
    return (
      <div className="animate-pulse h-32 bg-slate-100 rounded-lg" />
    );
  }

  return (
    <div className="relative">
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="在此输入文献笔记，自动保存..."
        className="w-full h-48 p-4 text-sm border border-slate-200 rounded-lg resize-none
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                   placeholder:text-slate-400 bg-white"
      />
      <span className={`absolute bottom-3 right-3 text-xs ${saveError ? 'text-red-500' : 'text-slate-400'}`}>
        {saveError ? '⚠ 保存失败' : saved ? '✓ 已保存' : '保存中...'}
      </span>
    </div>
  );
}
