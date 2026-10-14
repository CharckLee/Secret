import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSubjectProgressRows } from "@/lib/queries";
import type { SubjectRow } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = (await getSubjectProgressRows()) as SubjectRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">学科</h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {subjects.length} 个学科 · 点进去看完整学习路径
        </p>
      </div>

      {subjects.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          还没有学科，先去工作台创建一个
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.id}`} className="block">
              <Card className="h-full p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <h2 className="font-medium text-slate-800">{s.name}</h2>
                </div>
                {s.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {s.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>
                    已学 {s.progress.completedLeaves}/{s.progress.totalLeaves} 节
                  </span>
                  <span>完成率 {s.progress.completionRate}%</span>
                  {s.progress.totalFiles > 0 && (
                    <span>
                      文件 {s.progress.completedFiles}/{s.progress.totalFiles}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
