'use client';

import { useState, useEffect } from 'react';
import type { TagData } from '@/types';
import { TagBadge } from './TagBadge';
import { LoadingSpinner } from './LoadingSpinner';

interface TagPickerProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagPicker({ selectedTagIds, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTags() {
      try {
        const res = await fetch('/api/tags');
        if (res.ok) setTags(await res.json());
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    }
    loadTags();
  }, []);

  if (loading) return <LoadingSpinner size="sm" />;

  const toggle = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className="transition-all duration-200"
        >
          <TagBadge
            name={tag.name}
            color={
              selectedTagIds.includes(tag.id) ? tag.color : '#94a3b8'
            }
          />
        </button>
      ))}
    </div>
  );
}
