"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildNodeDeleteWarning } from "@/lib/path";
import { useFilePreview } from "@/components/file/FilePreviewProvider";
import { NODE_STATUS_LABELS } from "@/types";
import type { NodeStatus } from "@/types";
import type { PathNodeItem } from "@/types/api";

const KIND_LABELS: Record<string, string> = {
  chapter: "章节",
  node: "子节点",
  milestone: "阶段目标",
};

const STATUS_TONE: Record<NodeStatus, "slate" | "amber" | "emerald"> = {
  NOT_STARTED: "slate",
  LEARNING: "amber",
  COMPLETED: "emerald",
};

interface NodeWithChildren extends PathNodeItem {
  children: NodeWithChildren[];
}

function buildTree(nodes: PathNodeItem[]): NodeWithChildren[] {
  const map = new Map<string, NodeWithChildren>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: NodeWithChildren[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (list: NodeWithChildren[]) => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function descendants(nodes: PathNodeItem[], id: string): Set<string> {
  const result = new Set<string>();
  const stack = [...nodes.filter((n) => n.parentId === id).map((n) => n.id)];
  while (stack.length) {
    const cur = stack.pop()!;
    if (result.has(cur)) continue;
    result.add(cur);
    nodes
      .filter((n) => n.parentId === cur)
      .forEach((n) => stack.push(n.id));
  }
  return result;
}

export function TreeOutline({
  nodes,
  subjectId,
  onChanged,
}: {
  nodes: PathNodeItem[];
  subjectId: string;
  onChanged: () => void;
}) {
  const [localNodes, setLocalNodes] = useState<PathNodeItem[]>(nodes);
  const [formOpen, setFormOpen] = useState(false);
  const [formNode, setFormNode] = useState<PathNodeItem | null>(null);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    warning: string;
    fileCount: number;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => setLocalNodes(nodes), [nodes]);

  const tree = buildTree(localNodes);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = localNodes.find((n) => n.id === active.id);
    const b = localNodes.find((n) => n.id === over.id);
    if (!a || !b || a.parentId !== b.parentId) return;

    const siblings = localNodes
      .filter((n) => n.parentId === a.parentId)
      .sort((x, y) => x.order - y.order);
    const oldIndex = siblings.findIndex((n) => n.id === a.id);
    const newIndex = siblings.findIndex((n) => n.id === b.id);
    const reordered = arrayMove(siblings, oldIndex, newIndex);

    const orderMap = new Map(reordered.map((n, i) => [n.id, i]));
    const next = localNodes.map((n) =>
      n.parentId === a.parentId
        ? { ...n, order: orderMap.get(n.id) ?? n.order }
        : n,
    );
    setLocalNodes(next);

    await apiFetch("/api/path-nodes/reorder", {
      method: "POST",
      body: JSON.stringify({
        items: reordered.map((n, i) => ({
          id: n.id,
          parentId: n.parentId,
          order: i,
        })),
      }),
    }).catch(() => {});
  }

  async function patchStatus(id: string, status: NodeStatus) {
    await apiFetch(`/api/path-nodes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => {});
    onChanged();
  }

  /** 点击节点：未开始 → 学习中（点击过即视为开始学习） */
  function markLearning(id: string) {
    const node = localNodes.find((n) => n.id === id);
    if (!node || node.status !== "NOT_STARTED") return;
    patchStatus(id, "LEARNING");
  }

  function markCompleted(id: string) {
    patchStatus(id, "COMPLETED");
  }

  function markIncomplete(id: string) {
    patchStatus(id, "LEARNING");
  }

  /** 打开删除确认弹窗：文件删不删由用户在弹窗里当场选，不在这里决定 */
  function removeNode(id: string) {
    const removedIds = new Set([id, ...descendants(localNodes, id)]);
    const title = localNodes.find((n) => n.id === id)?.title ?? "该节点";
    const fileNames = localNodes
      .filter((n) => removedIds.has(n.id))
      .flatMap((n) => n.files ?? [])
      .map((f) => f.filename);

    setPendingDelete({
      id,
      warning: buildNodeDeleteWarning({
        title,
        childCount: removedIds.size - 1,
        fileNames,
      }),
      fileCount: fileNames.length,
    });
  }

  /** deleteFiles=false：文件转入未归档区；true：连同文件一起删除 */
  async function confirmRemove(deleteFiles: boolean) {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    const removedIds = new Set([id, ...descendants(localNodes, id)]);
    setPendingDelete(null);
    // 乐观更新：立即从树中移除该节点及其所有后代
    setLocalNodes((prev) => prev.filter((n) => !removedIds.has(n.id)));
    await apiFetch(
      `/api/path-nodes/${id}${deleteFiles ? "?deleteFiles=true" : ""}`,
      { method: "DELETE" },
    ).catch(() => {});
    onChanged();
  }

  function openAdd(parentId: string | null) {
    setFormNode(null);
    setFormParentId(parentId);
    setFormOpen(true);
  }

  function openEdit(node: PathNodeItem) {
    setFormNode(node);
    setFormParentId(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          拖拽 ≡ 排序 · 点击节点标题开始学习 · 点「完成」标记已学完
        </p>
        <Button onClick={() => openAdd(null)}>＋ 新增章节</Button>
      </div>

      {tree.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
          还没有学习节点，点击右上角新增章节开始搭建路径
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tree.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            {tree.map((node) => (
              <SortableNode
                key={node.id}
                node={node}
                onMarkLearning={markLearning}
                onMarkCompleted={markCompleted}
                onMarkIncomplete={markIncomplete}
                onAddChild={openAdd}
                onEdit={openEdit}
                onDelete={removeNode}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <NodeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        node={formNode}
        parentId={formParentId}
        allNodes={localNodes}
        subjectId={subjectId}
        onSaved={() => {
          setFormOpen(false);
          onChanged();
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="删除学习节点"
      >
        {pendingDelete && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-slate-600">
              {pendingDelete.warning}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPendingDelete(null)}
              >
                取消
              </Button>
              {pendingDelete.fileCount > 0 && (
                <Button variant="danger" onClick={() => confirmRemove(true)}>
                  连带删除文件
                </Button>
              )}
              <Button onClick={() => confirmRemove(false)}>
                {pendingDelete.fileCount > 0 ? "转入未归档并删除" : "删除节点"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SortableNode({
  node,
  onMarkLearning,
  onMarkCompleted,
  onMarkIncomplete,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: NodeWithChildren;
  onMarkLearning: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onMarkIncomplete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (node: PathNodeItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-40")}>
      <div className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
        <button
          type="button"
          className="cursor-grab touch-none text-slate-300 hover:text-slate-500"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          ≡
        </button>
        <Badge tone={STATUS_TONE[node.status]}>
          {NODE_STATUS_LABELS[node.status]}
        </Badge>
        <button
          type="button"
          onClick={() => onMarkLearning(node.id)}
          className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-blue-600"
          title={node.status === "NOT_STARTED" ? "点击开始学习" : node.title}
        >
          {node.title}
        </button>
        {node.status === "COMPLETED" ? (
          <button
            type="button"
            onClick={() => onMarkIncomplete(node.id)}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            取消完成
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onMarkCompleted(node.id)}
            className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            完成
          </button>
        )}
        <span className="shrink-0 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => onAddChild(node.id)}
            className="rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-600"
            title="添加子节点"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-600"
            title="编辑"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="rounded px-1.5 py-0.5 hover:bg-rose-50 hover:text-rose-600"
            title="删除"
          >
            删除
          </button>
        </span>
      </div>
      {node.files && node.files.length > 0 && (
        <div className="ml-7 flex flex-wrap gap-1.5 pb-1">
          {node.files.map((f) => (
            <FileChip key={f.id} file={f} />
          ))}
        </div>
      )}
      {node.children.length > 0 && (
        <div className="ml-5 border-l border-slate-100 pl-2">
          <SortableContext
            items={node.children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {node.children.map((child) => (
              <SortableNode
                key={child.id}
                node={child}
                onMarkLearning={onMarkLearning}
                onMarkCompleted={onMarkCompleted}
                onMarkIncomplete={onMarkIncomplete}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

function FileChip({
  file,
}: {
  file: { id: string; filename: string; storedPath?: string };
}) {
  const { open } = useFilePreview();
  return (
    <button
      type="button"
      onClick={() =>
        open({
          id: file.id,
          filename: file.filename,
          storedPath: file.storedPath,
        })
      }
      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
      title="打开文件"
    >
      📄 {file.filename}
    </button>
  );
}

function NodeForm({
  open,
  onClose,
  node,
  parentId,
  allNodes,
  subjectId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  node: PathNodeItem | null;
  parentId: string | null;
  allNodes: PathNodeItem[];
  subjectId: string;
  onSaved: () => void;
}) {
  const { open: openPreview } = useFilePreview();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("chapter");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<NodeStatus>("NOT_STARTED");
  const [parent, setParent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [boundFiles, setBoundFiles] = useState<
    { id: string; filename: string; storedPath?: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(node?.title ?? "");
    setKind(node?.kind ?? "chapter");
    setNote(node?.note ?? "");
    setStatus(node?.status ?? "NOT_STARTED");
    setParent(node?.parentId ?? parentId ?? "");
    setBoundFiles(node?.files ?? []);
    setFile(null);
    setError(null);
  }, [open, node, parentId]);

  const excluded = node ? descendants(allNodes, node.id) : new Set<string>();
  const parentOptions = allNodes.filter(
    (n) => n.id !== node?.id && !excluded.has(n.id),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let nodeId: string;

      if (node) {
        await apiFetch(`/api/path-nodes/${node.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title,
            kind,
            note,
            status,
            parentId: parent || null,
            fileIds: boundFiles.map((f) => f.id),
          }),
        });
        nodeId = node.id;
      } else {
        const created = await apiFetch<{ id: string }>("/api/path-nodes", {
          method: "POST",
          body: JSON.stringify({
            title,
            kind,
            note,
            subjectId,
            parentId: parent || null,
          }),
        });
        nodeId = created.id;
      }

      // 可选：导入文件并绑定到该节点
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("subjectId", subjectId);
        fd.append("pathNodeIds", nodeId);
        const res = await fetch("/api/files", { method: "POST", body: fd });
        if (!res.ok) {
          const b = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(b.error ?? "文件上传失败");
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={node ? "编辑节点" : "新增节点"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-600">标题</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="如：第一章 极限与连续"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-slate-600">类型</label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">进度</label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as NodeStatus)}
            >
              {Object.entries(NODE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">父节点</label>
          <Select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">无（顶层）</option>
            {parentOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">笔记</label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="本节点的学习说明"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">
            导入文件（可选，绑定到本节点）
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        {boundFiles.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-slate-600">
              已绑定文件
            </label>
            <div className="space-y-1 rounded-lg border border-slate-200 p-2">
              {boundFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50"
                >
                  <span className="min-w-0 truncate text-slate-600">
                    📄 {f.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openPreview({
                        id: f.id,
                        filename: f.filename,
                        storedPath: f.storedPath,
                      })
                    }
                    className="ml-auto shrink-0 text-xs text-blue-600 hover:underline"
                  >
                    打开
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBoundFiles((prev) => prev.filter((x) => x.id !== f.id))
                    }
                    className="shrink-0 text-xs text-slate-400 hover:text-rose-600"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
