/**
 * 清理"幽灵文件"：数据库中已不再绑定任何学习节点的 StudyFile 记录，
 * 以及 data/uploads 里没有任何记录引用的磁盘残留。
 *
 * 默认 dry-run，只打印将要删除的内容；加 --apply 才真正删除。
 *   node scripts/cleanup-orphan-files.mjs           # 预演
 *   node scripts/cleanup-orphan-files.mjs --apply   # 真删
 */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

const orphans = await prisma.studyFile.findMany({
  where: { pathNodes: { none: {} } },
  select: { id: true, filename: true, storedPath: true, size: true },
  orderBy: { createdAt: "asc" },
});

console.log(`[1] 未绑定任何节点的文件记录：${orphans.length} 条`);
for (const f of orphans) {
  const onDisk = await fs
    .access(f.storedPath)
    .then(() => "磁盘文件存在")
    .catch(() => "磁盘文件已缺失");
  console.log(`    - ${f.filename} (${f.id}) · ${onDisk}`);
}

const uploadDir = path.join(process.cwd(), "data", "uploads");
const all = await prisma.studyFile.findMany({ select: { storedPath: true } });
const known = new Set(all.map((f) => path.basename(f.storedPath)));
const entries = await fs.readdir(uploadDir).catch(() => []);
const diskOrphans = entries.filter((name) => !known.has(name));

console.log(`\n[2] data/uploads 中无记录引用的文件：${diskOrphans.length} 个`);
for (const name of diskOrphans) console.log(`    - ${name}`);

if (!apply) {
  console.log("\n[dry-run] 未做任何修改。确认无误后加 --apply 执行删除。");
  await prisma.$disconnect();
  process.exit(0);
}

if (orphans.length > 0) {
  await prisma.studyFile.deleteMany({
    where: { id: { in: orphans.map((f) => f.id) } },
  });
  for (const f of orphans) await fs.unlink(f.storedPath).catch(() => {});
}
for (const name of diskOrphans) {
  await fs.unlink(path.join(uploadDir, name)).catch(() => {});
}

console.log(
  `\n[done] 已删除 ${orphans.length} 条记录、${diskOrphans.length} 个磁盘残留文件。`,
);
await prisma.$disconnect();
