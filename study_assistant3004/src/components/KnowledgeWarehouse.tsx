"use client";

import { useMemo } from "react";
import { FileList } from "@/components/file/FileList";
import { FileUpload } from "@/components/file/FileUpload";
import { useApi } from "@/lib/api";
import type { StudyFileItem, SubjectRow } from "@/types/api";

export function KnowledgeWarehouse() {
  const { data: subjects } = useApi<SubjectRow[]>("/api/subjects");
  const { data: files, loading: filesLoading, reload: reloadFiles } = useApi<
    (StudyFileItem & { subject?: { id: string; name: string; color: string } })[]
  >("/api/files");

  const subjectOptions = useMemo(
    () => (subjects ?? []).map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );

  if (filesLoading && !files) {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">知识仓库</h1>
      <FileUpload
        subjects={subjectOptions}
        onUploaded={() => reloadFiles(true)}
      />
      <FileList files={files ?? []} onChanged={() => reloadFiles(true)} />
    </div>
  );
}
