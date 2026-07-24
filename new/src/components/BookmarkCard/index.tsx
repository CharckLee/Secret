/**
 * BookmarkCard 组件
 * 展示单个书签的卡片，显示标题、URL、描述和标签列表
 */

import { BookmarkCardProps } from './types';

export function BookmarkCard({
  title,
  url,
  description,
  tags = [],
}: BookmarkCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* 标题 + 链接 */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      >
        {title}
      </a>

      {/* URL */}
      <p className="mt-1 truncate text-sm text-gray-400">{url}</p>

      {/* 描述 */}
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {description}
        </p>
      )}

      {/* 标签列表 */}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
