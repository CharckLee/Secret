export function BoundaryNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 ${className}`}
    >
      本工具无全网学术数据库，仅用于初稿辅助自查，不等同、不可替代学校官方的论文相似度检测系统；文稿在浏览器本地处理，不云端留存。
    </div>
  );
}
