const base = "http://localhost:3004";

async function api(path, method = "GET", body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const subj = await api("/api/subjects", "POST", {
    name: "进度测试",
    color: "#3b82f6",
  });
  const sid = subj.id;
  const a = await api("/api/path-nodes", "POST", { title: "节点A", subjectId: sid });
  const b = await api("/api/path-nodes", "POST", { title: "节点B", subjectId: sid });

  // 完成节点 A
  await api(`/api/path-nodes/${a.id}`, "PATCH", { status: "COMPLETED" });

  let d = await api(`/api/subjects/${sid}`);
  console.log("after complete A:", "total=", d.progress.totalNodes, "completed=", d.progress.completedNodes, "rate=", d.progress.completionRate);

  // 删除节点 A
  await api(`/api/path-nodes/${a.id}`, "DELETE");

  d = await api(`/api/subjects/${sid}`);
  console.log("after delete A:", "total=", d.progress.totalNodes, "completed=", d.progress.completedNodes, "rate=", d.progress.completionRate);

  const list = await api("/api/subjects");
  const row = list.find((s) => s.id === sid);
  console.log("subjects list row:", "total=", row.progress.totalNodes, "completed=", row.progress.completedNodes, "rate=", row.progress.completionRate);

  const stats = await api("/api/stats");
  const srow = stats.subjects.find((s) => s.id === sid);
  console.log("stats row:", "completionRate=", srow.completionRate, "nodeRate=", srow.nodeRate);

  await api(`/api/subjects/${sid}`, "DELETE");
  console.log("CLEANUP_DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
