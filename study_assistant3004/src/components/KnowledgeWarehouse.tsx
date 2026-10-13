"use client";

import { useMemo, useState } from "react";
import { FileList } from "@/components/file/FileList";
import { FileUpload } from "@/components/file/FileUpload";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { groupNodesBySubject } from "@/lib/path";
import type { PathNodeItem, StudyFileItem, SubjectRow } from "@/types/api";

type Tab = "archived" | "unarchived";

type FileRow = StudyFileItem & {
  subject?: { id: string; name: string; color: string };
};

export function KnowledgeWarehouse() {
  const { data: subjects } = useApi<SubjectRow[]>("/api/subjects");
  const { data: nodes } = useApi<PathNodeItem[]>("/api/path-nodes");
  const {
    data: archived,
    loading: archivedLoading,
    reload: reloadArchived,
  } = useApi<FileRow[]>("/api/files");
  const {
    data: unarchived,
    loading: unarchivedLoading,
    reload: reloadUnarchived,
  } = useApi<FileRow[]>("/api/files?scope=unarchived");

  const [tab, setTab] = useState<Tab>("archived");

  const subjectOptions = useMemo(
    () => (subjects ?? []).map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );

  const nodeGroups = useMemo(
    () => groupNodesBySubject(nodes ?? [], subjectOptions),
    [nodes, subjectOptions],
  );

  function reloadAll() {
    reloadArchived(true);
    reloadUnarchived(true);
  }

  if (
    (archivedLoading && !archived) ||
    (unarchivedLoading && !unarchived)
  ) {
    return <p className="py-20 text-center text-slate-400">加载中…</p>;
  }

  const pendingCount = (unarchived ?? []).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold text-slate-800">
          知识仓库
        </h1>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <TabButton
            active={tab === "archived"}
            onClick={() => setTab("archived")}
          >
            归档文件
          </TabButton>
          <TabButton
            active={tab === "unarchived"}
            onClick={() => setTab("unarchived")}
          >
            未归档{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabButton>
        </div>
      </div>

      <FileUpload subjects={subjectOptions} onUploaded={reloadAll} />

      {tab === "archived" ? (
        <FileList
          files={archived ?? []}
          mode="archived"
          onChanged={reloadAll}
        />
      ) : (
        <FileList
          files={unarchived ?? []}
          mode="unarchived"
          nodeGroups={nodeGroups}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-white font-medium text-slate-800 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}
