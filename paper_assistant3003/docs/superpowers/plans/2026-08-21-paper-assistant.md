# 论文写作辅助与格式标准化工具 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
>
> **注：** 用户要求本次执行**不提交 git**。各任务末尾的 Commit 步骤在执行时一律跳过，仅作为阶段检查点标记，不要执行 `git commit`。

**目标：** 构建一个论文初稿本地辅助工具——文档导入/编辑、GB/T 7714 参考文献标准化、格式校验、DeepSeek 学术润色、语义相似片段自查、导出。

**架构：** 纯客户端 + 单一服务端代理。文稿处理（docx 解析、格式校验、参考文献标准化、语义向量化）全在浏览器本地；服务端只保留 `/api/polish` 润色代理。语义模型 bge-small-zh-v1.5 经 Web Worker 懒加载。`lib/` 全部纯逻辑，与 React 解耦。

**技术栈：** Next.js 16（App Router, Turbopack）+ TypeScript + TailwindCSS v4 + Dexie + mammoth + @huggingface/transformers + vitest。端口 3003。

---

## 文件结构总览

```
paper_assistant3003/
  package.json / next.config.ts / tsconfig.json / vitest.config.ts
  postcss.config.mjs            # Tailwind v4（create-next-app 生成）
  .env.example                  # DeepSeek 配置模板（不含真实 key）
  app/
    layout.tsx                  # 全局布局 + 导航 + 边界提示条
    page.tsx                    # 首页工作台
    globals.css                 # 主题变量 + 卡片 hover 工具类
    editor/page.tsx             # 编辑页（含格式检测面板 + 润色侧栏）
    references/page.tsx         # 参考文献管理
    similarity/page.tsx         # 语义相似比对
    api/polish/route.ts         # DeepSeek 润色代理（唯一联网点）
  components/
    Card.tsx                    # 统一圆角卡片基类（hover 封装）
    NavBar.tsx                  # 顶部导航
    BoundaryNotice.tsx          # 能力边界提示条
  lib/
    types.ts                    # 共享类型（ID、Document）
    db/index.ts                 # Dexie 数据库初始化
    db/documents.ts             # documents 表操作
    db/references.ts            # references 表操作
    db/settings.ts              # settings 表操作
    db/embeddingCache.ts        # embeddingCache 表操作
    text/normalize.ts           # 全半角/空白统一
    text/split.ts               # 中文句子切分
    text/clean.ts               # 文本清理
    reference/types.ts          # 文献类型与字段
    reference/detect.ts         # 类型识别
    reference/parse.ts          # 字段抽取
    reference/format.ts         # GB/T 7714 格式化
    reference/index.ts          # parseReference 入口
    format/types.ts             # FormatIssue 等类型
    format/check.ts             # 格式校验规则
    format/clean.ts             # 排版清理
    similarity/types.ts         # 比对相关类型
    similarity/ngram.ts         # N-Gram 字面通道
    similarity/score.ts         # 加权融合 + 余弦
    similarity/segment.ts       # 片段聚合
    similarity/pipeline.ts      # 比对管线协调（非 Worker 部分）
  worker/embedding.worker.ts    # 语义向量化 Worker
```

单元测试与实现同目录：`lib/**/*.test.ts`（vitest 仅扫描 `lib/`）。

---

## Phase 0 — 项目初始化

### 任务 0：初始化 Next.js 项目并配置工具链

**文件：**
- 创建：`package.json`、`next.config.ts`、`tsconfig.json`、`postcss.config.mjs`、`app/`、`vitest.config.ts`

- [ ] **步骤 1：脚手架初始化**

在当前目录初始化（目录内已有 `docs/`，非冲突文件，create-next-app 会保留）：

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --turbopack --yes
```

若因非空目录报错，先临时把 `docs/` 移出目录，初始化完成后再移回。

- [ ] **步骤 2：安装依赖**

```bash
npm install dexie mammoth @huggingface/transformers
npm install -D vitest
```

- [ ] **步骤 3：配置端口 3003 与测试脚本**

修改 `package.json` 的 scripts：

```json
{
  "dev": "next dev -p 3003",
  "build": "next build",
  "start": "next start -p 3003",
  "lint": "next lint",
  "test": "vitest run"
}
```

- [ ] **步骤 4：创建 vitest 配置**

创建 `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **步骤 5：验证**

运行：`npm run dev`（后台）
预期：服务监听 `http://localhost:3003`，默认 Next 首页正常显示。
验证后 `Ctrl+C` 停止。

- [ ] **步骤 6：Commit（执行时跳过）**

---

## Phase 1 — 骨架、统一 UI、数据层

### 任务 1：文本处理纯函数（清洗 / 全半角 / 句子切分）

**文件：**
- 创建：`lib/text/normalize.ts`、`lib/text/clean.ts`、`lib/text/split.ts`
- 测试：`lib/text/normalize.test.ts`、`lib/text/split.test.ts`

- [ ] **步骤 1：编写失败测试**

创建 `lib/text/normalize.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { normalizeFullwidth, collapseWhitespace, normalizeText } from './normalize';

describe('normalizeFullwidth', () => {
  it('converts fullwidth ASCII to halfwidth', () => {
    expect(normalizeFullwidth('ＡＢＣ１２３，。；：')).toBe('ABC123,.;:');
  });
  it('keeps CJK characters unchanged', () => {
    expect(normalizeFullwidth('中文摘要')).toBe('中文摘要');
  });
});

describe('collapseWhitespace', () => {
  it('collapses consecutive spaces and newlines', () => {
    expect(collapseWhitespace('a   b\n\n\nc')).toBe('a b\nc');
  });
});

describe('normalizeText', () => {
  it('applies fullwidth then whitespace normalization', () => {
    expect(normalizeText('Ａ　Ｂ')).toBe('A B');
  });
});
```

创建 `lib/text/split.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { splitSentences } from './split';

describe('splitSentences', () => {
  it('splits on Chinese sentence enders', () => {
    expect(splitSentences('第一句。第二句！第三句？第四句；结束')).toEqual([
      '第一句。', '第二句！', '第三句？', '第四句；', '结束',
    ]);
  });
  it('splits on newlines and drops empty lines', () => {
    expect(splitSentences('第一行\n\n第二行')).toEqual(['第一行', '第二行']);
  });
  it('trims and drops empty results', () => {
    expect(splitSentences('  。  ')).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run lib/text`
预期：FAIL，报 `Cannot find module './normalize'` / `'./split'`

- [ ] **步骤 3：实现**

创建 `lib/text/normalize.ts`：

```ts
// 全角 ASCII 转半角，CJK 字符保持不变
export function normalizeFullwidth(s: string): string {
  return s.replace(/[\uff01-\uff5e]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

// 连续空白合并；单个换行保留，连续换行合并为一个
export function collapseWhitespace(s: string): string {
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
}

export function normalizeText(s: string): string {
  return collapseWhitespace(normalizeFullwidth(s));
}
```

创建 `lib/text/split.ts`：

```ts
import { normalizeText } from './normalize';

const SENTENCE_ENDERS = /[。！？；]/;

export function splitSentences(text: string): string[] {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const sentences: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/(?<=[。！？；])/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
  }
  return sentences;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run lib/text`
预期：PASS（全部用例通过）

- [ ] **步骤 5：Commit（执行时跳过）**

---

### 任务 2：共享类型 + IndexedDB 数据层（Dexie）

**文件：**
- 创建：`lib/types.ts`、`lib/db/index.ts`、`lib/db/documents.ts`、`lib/db/references.ts`、`lib/db/settings.ts`、`lib/db/embeddingCache.ts`

- [ ] **步骤 1：定义共享类型**

创建 `lib/types.ts`：

```ts
export type ID = string;

export type SourceFormat = 'txt' | 'docx' | 'paste';

export interface DocumentRecord {
  id: ID;
  title: string;
  content: string;
  sourceFormat: SourceFormat;
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **步骤 2：初始化 Dexie**

创建 `lib/db/index.ts`：

```ts
import Dexie, { type Table } from 'dexie';
import type { DocumentRecord } from '@/lib/types';
import type { ReferenceRecord } from '@/lib/reference/types';

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export interface EmbeddingCacheRecord {
  textHash: string;
  vector: Float32Array;
}

export class PaperDB extends Dexie {
  documents!: Table<DocumentRecord, string>;
  references!: Table<ReferenceRecord, string>;
  settings!: Table<SettingsRecord, string>;
  embeddingCache!: Table<EmbeddingCacheRecord, string>;

  constructor() {
    super('paper_assistant');
    this.version(1).stores({
      documents: 'id, title, updatedAt',
      references: 'id, updatedAt',
      settings: 'key',
      embeddingCache: 'textHash',
    });
  }
}

export const db = new PaperDB();
```

- [ ] **步骤 3：各表操作模块**

创建 `lib/db/documents.ts`：

```ts
import { db } from './index';
import type { DocumentRecord } from '@/lib/types';

export async function listDocuments(): Promise<DocumentRecord[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  return db.documents.get(id);
}

export async function saveDocument(doc: DocumentRecord): Promise<void> {
  await db.documents.put(doc);
}

export async function deleteDocument(id: string): Promise<void> {
  await db.documents.delete(id);
}
```

创建 `lib/db/settings.ts`：

```ts
import { db } from './index';

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value });
}
```

创建 `lib/db/embeddingCache.ts`：

```ts
import { db } from './index';

export async function getCachedEmbedding(textHash: string): Promise<Float32Array | undefined> {
  const row = await db.embeddingCache.get(textHash);
  return row?.vector;
}

export async function cacheEmbedding(textHash: string, vector: Float32Array): Promise<void> {
  await db.embeddingCache.put({ textHash, vector });
}
```

创建 `lib/db/references.ts`（占位，任务 6 补全逻辑，此处仅表操作）：

```ts
import { db } from './index';
import type { ReferenceRecord } from '@/lib/reference/types';

export async function listReferences(): Promise<ReferenceRecord[]> {
  return db.references.orderBy('updatedAt').reverse().toArray();
}

export async function saveReference(record: ReferenceRecord): Promise<void> {
  await db.references.put(record);
}

export async function deleteReference(id: string): Promise<void> {
  await db.references.delete(id);
}
```

> 注：`ReferenceRecord` 类型在任务 6 的 `lib/reference/types.ts` 中定义。为让类型检查通过，任务 6 必须先于任何引用它的编译通过点落地；本任务先创建 `lib/reference/types.ts` 的 `ReferenceRecord` 最小定义（见步骤 4），完整字段在任务 6 扩展。

- [ ] **步骤 4：创建 reference 类型最小定义**

创建 `lib/reference/types.ts`（任务 6 会扩展）：

```ts
export type ReferenceType = 'journal' | 'thesis' | 'book' | 'web';

export interface ReferenceRecord {
  id: string;
  raw: string;
  type: ReferenceType;
  fields: Record<string, string | string[] | undefined>;
  formatted: string;
  updatedAt: number;
}
```

- [ ] **步骤 5：验证类型检查**

运行：`npx tsc --noEmit`
预期：无类型错误

- [ ] **步骤 6：Commit（执行时跳过）**

---

### 任务 3：统一 UI 基类（Card / NavBar / BoundaryNotice）

**文件：**
- 创建：`components/Card.tsx`、`components/NavBar.tsx`、`components/BoundaryNotice.tsx`
- 修改：`app/globals.css`、`app/layout.tsx`

- [ ] **步骤 1：主题与 hover 工具类**

修改 `app/globals.css`，在 Tailwind 指令后追加：

```css
@import "tailwindcss";

:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --border: #e5e7eb;
  --text: #1f2937;
  --text-muted: #6b7280;
  --accent: #4f6ef7;
  --accent-soft: #eef1fe;
}

body {
  background: var(--bg);
  color: var(--text);
}

.card-hover {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card-hover:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
}
```

- [ ] **步骤 2：Card 基类**

创建 `components/Card.tsx`：

```tsx
import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`card-hover rounded-xl border bg-white p-4 ${className}`}
      style={{ borderColor: 'var(--border)' }}
    >
      {children}
    </div>
  );
}
```

- [ ] **步骤 3：NavBar**

创建 `components/NavBar.tsx`：

```tsx
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: '工作台' },
  { href: '/editor', label: '文稿编辑' },
  { href: '/references', label: '参考文献' },
  { href: '/similarity', label: '语义相似自查' },
];

export function NavBar() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          论文写作辅助
        </Link>
        <div className="flex gap-4 text-sm text-gray-600">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-black">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **步骤 4：BoundaryNotice**

创建 `components/BoundaryNotice.tsx`：

```tsx
export function BoundaryNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 ${className}`}
    >
      本工具无全网学术数据库，仅用于初稿辅助自查，不等同、不可替代学校官方查重系统；文稿在浏览器本地处理，不云端留存。
    </div>
  );
}
```

- [ ] **步骤 5：接入全局布局**

修改 `app/layout.tsx`，导入并渲染 NavBar 与 BoundaryNotice：

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { BoundaryNotice } from '@/components/BoundaryNotice';

export const metadata: Metadata = {
  title: '论文写作辅助与格式标准化工具',
  description: '本地论文初稿辅助工具：参考文献标准化、格式校验、语义相似自查。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-6">
          <BoundaryNotice />
        </footer>
      </body>
    </html>
  );
}
```

- [ ] **步骤 6：验证构建**

运行：`npm run build`
预期：构建成功，无类型/ESLint 错误

- [ ] **步骤 7：Commit（执行时跳过）**

---

### 任务 4：首页工作台

**文件：**
- 修改：`app/page.tsx`

- [ ] **步骤 1：实现首页**

修改 `app/page.tsx`：

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { listDocuments, type DocumentRecord } from '@/lib/db/documents';

const FEATURES = [
  { href: '/editor', title: '文稿编辑', desc: '粘贴 / 导入 txt / docx，在线编辑' },
  { href: '/editor', title: '格式检测', desc: '标题层级、缩进、空行、图表公式校验' },
  { href: '/references', title: '参考文献管理', desc: '批量解析并转为 GB/T 7714' },
  { href: '/editor', title: '文本润色', desc: '选段 DeepSeek 学术润色，双栏对比' },
  { href: '/similarity', title: '语义相似自查', desc: '识别文字不同、含义相近的片段' },
];

export default function HomePage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    listDocuments().then(setDocs);
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">工作台</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href}>
              <Card className="h-full">
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">历史文稿</h2>
        {docs.length === 0 ? (
          <BoundaryNotice className="mb-4" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {docs.map((doc) => (
              <Link key={doc.id} href={`/editor?id=${doc.id}`}>
                <Card>
                  <h3 className="font-semibold">{doc.title || '未命名文稿'}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    更新于 {new Date(doc.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：Commit（执行时跳过）**

---

## Phase 2 — 核心模块

### 任务 5：参考文献类型识别（detect）

**文件：**
- 创建：`lib/reference/detect.ts`
- 测试：`lib/reference/detect.test.ts`
- 修改：`lib/reference/types.ts`（扩展字段）

- [ ] **步骤 1：扩展 ParsedReference 类型**

修改 `lib/reference/types.ts`，追加：

```ts
export interface ParsedReference {
  authors: string[];
  title: string;
  journal?: string;      // 期刊名 或 出版者
  year?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  place?: string;        // 出版地 / 保存地
  school?: string;       // 学位授予单位
  doi?: string;
  url?: string;
  pubDate?: string;      // 电子文献发布日期
  accessDate?: string;   // 引用日期
}

export interface ParseResult {
  type: ReferenceType;
  fields: ParsedReference;
  formatted: string;
}
```

- [ ] **步骤 2：编写失败测试**

创建 `lib/reference/detect.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { detectType } from './detect';

describe('detectType', () => {
  it('detects web resource by URL without volume/issue', () => {
    expect(detectType('张三. 基于深度学习的图像识别[EB/OL]. https://example.com')).toBe('web');
  });
  it('detects thesis by 学位论文 keyword', () => {
    expect(detectType('李四. 某研究[D]. 北京: 某大学, 2020.')).toBe('thesis');
  });
  it('detects book by publisher and place', () => {
    expect(detectType('王五. 机器学习导论[M]. 北京: 高等教育出版社, 2019.')).toBe('book');
  });
  it('defaults to journal when volume/issue/pages present', () => {
    expect(detectType('赵六. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.')).toBe('journal');
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run lib/reference/detect.test.ts`
预期：FAIL，`Cannot find module './detect'`

- [ ] **步骤 4：实现类型识别**

创建 `lib/reference/detect.ts`：

```ts
import type { ReferenceType } from './types';

// 优先级从高到低
export function detectType(raw: string): ReferenceType {
  const hasUrl = /https?:\/\//i.test(raw) || /doi\s*[:：]?\s*10\.\d{4,}/i.test(raw);
  const hasVolumeIssue = /\d+\s*\(\d+\)/.test(raw) || /第\s*\d+\s*卷/.test(raw);
  const hasPages = /\d+\s*-\s*\d+/.test(raw);
  const hasThesis = /学位论文|硕士|博士|\[D\]|大学|学院/.test(raw);
  const hasPublisher = /出版社|出版/.test(raw);

  if (hasUrl && !hasVolumeIssue && !hasPages) return 'web';
  if (hasThesis) return 'thesis';
  if (hasPublisher && !hasVolumeIssue && !hasPages) return 'book';
  return 'journal';
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run lib/reference/detect.test.ts`
预期：PASS

- [ ] **步骤 6：Commit（执行时跳过）**

---

### 任务 6：参考文献字段抽取（parse）

**文件：**
- 创建：`lib/reference/parse.ts`
- 测试：`lib/reference/parse.test.ts`

- [ ] **步骤 1：编写失败测试**

创建 `lib/reference/parse.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { parseFields } from './parse';

describe('parseFields', () => {
  const journal = '赵六, 钱七. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.';

  it('extracts authors for journal', () => {
    const f = parseFields(journal, 'journal');
    expect(f.authors).toEqual(['赵六', '钱七']);
  });
  it('extracts year/volume/issue/pages', () => {
    const f = parseFields(journal, 'journal');
    expect(f.year).toBe('2021');
    expect(f.volume).toBe('42');
    expect(f.issue).toBe('3');
    expect(f.pages).toBe('100-110');
  });
  it('extracts DOI when present', () => {
    const f = parseFields('作者. 题名[J]. 刊名, 2020, 1(1): 1-2. DOI:10.1234/abc.', 'journal');
    expect(f.doi).toBe('10.1234/abc');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run lib/reference/parse.test.ts`
预期：FAIL，`Cannot find module './parse'`

- [ ] **步骤 3：实现字段抽取**

创建 `lib/reference/parse.ts`：

```ts
import type { ParsedReference, ReferenceType } from './types';

function extractAuthors(raw: string): string[] {
  const authorPart = raw.split(/\.\s*(?=[^\d])/)[0] ?? '';
  return authorPart
    .split(/[,，;；、]/)
    .map((a) => a.trim().replace(/^\[\d+\]\s*/, ''))
    .filter((a) => a.length > 0 && a.length <= 10);
}

function extractYear(raw: string): string | undefined {
  return raw.match(/(19|20)\d{2}/)?.[0];
}

function extractVolumeIssue(raw: string): { volume?: string; issue?: string } {
  const m = raw.match(/(\d+)\s*\(\s*(\d+)\s*\)/);
  return m ? { volume: m[1], issue: m[2] } : {};
}

function extractPages(raw: string): string | undefined {
  return raw.match(/(\d+)\s*-\s*(\d+)/)?.[0];
}

function extractDoi(raw: string): string | undefined {
  return raw.match(/10\.\d{4,}\/\S+/)?.[0]?.replace(/[.,;]+$/, '');
}

function extractUrl(raw: string): string | undefined {
  return raw.match(/https?:\/\/\S+/)?.[0]?.replace(/[.,;]+$/, '');
}

export function parseFields(raw: string, type: ReferenceType): ParsedReference {
  const { volume, issue } = extractVolumeIssue(raw);
  return {
    authors: extractAuthors(raw),
    title: '',
    year: extractYear(raw),
    volume,
    issue,
    pages: extractPages(raw),
    doi: extractDoi(raw),
    url: extractUrl(raw),
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`npx vitest run lib/reference/parse.test.ts`
预期：PASS

- [ ] **步骤 5：Commit（执行时跳过）**

---

### 任务 7：参考文献格式化（format + index 入口）

**文件：**
- 创建：`lib/reference/format.ts`、`lib/reference/index.ts`
- 测试：`lib/reference/format.test.ts`

- [ ] **步骤 1：编写失败测试**

创建 `lib/reference/format.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { formatReference } from './format';
import { parseReference } from './index';

describe('formatReference', () => {
  it('formats journal with 3+ authors as 等', () => {
    expect(
      formatReference({
        authors: ['甲', '乙', '丙', '丁'],
        title: '某研究',
        journal: '某学报',
        year: '2021',
        volume: '42',
        issue: '3',
        pages: '100-110',
      }),
    ).toBe('甲, 乙, 丙, 等. 某研究[J]. 某学报, 2021, 42(3): 100-110.');
  });

  it('formats thesis', () => {
    expect(
      formatReference({
        authors: ['李四'],
        title: '某研究',
        school: '某大学',
        place: '北京',
        year: '2020',
      }),
    ).toBe('李四. 某研究[D]. 北京: 某大学, 2020.');
  });
});

describe('parseReference', () => {
  it('parses and formats a journal entry end-to-end', () => {
    const r = parseReference('赵六, 钱七. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.');
    expect(r.type).toBe('journal');
    expect(r.formatted).toContain('[J]');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npx vitest run lib/reference/format.test.ts`
预期：FAIL，`Cannot find module './format'`

- [ ] **步骤 3：实现格式化**

创建 `lib/reference/format.ts`：

```ts
import type { ParsedReference } from './types';

function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return '[佚名]';
  if (authors.length <= 3) return authors.join(', ');
  return `${authors.slice(0, 3).join(', ')}, 等`;
}

export function formatReference(f: ParsedReference): string {
  const authors = formatAuthors(f.authors);

  if (f.type === 'journal') {
    let s = `${authors}. ${f.title || '[题名缺失]'}[J]. ${f.journal || '[刊名缺失]'}`;
    if (f.year) s += `, ${f.year}`;
    if (f.volume) s += `, ${f.volume}`;
    if (f.issue) s += `(${f.issue})`;
    if (f.pages) s += `: ${f.pages}`;
    return `${s}.`;
  }

  if (f.type === 'thesis') {
    const parts = [authors, `${f.title || '[题名缺失]'}[D].`];
    const loc = [f.place, f.school].filter(Boolean).join(': ');
    if (loc) parts.push(`${loc}`);
    if (f.year) parts.push(`${f.year}`);
    return `${parts.filter(Boolean).join(' ')}.`;
  }

  if (f.type === 'book') {
    const parts = [authors, `${f.title || '[题名缺失]'}[M].`];
    if (f.place) parts.push(`${f.place}:`);
    if (f.publisher) parts.push(f.publisher);
    if (f.year) parts.push(`${f.year}`);
    return `${parts.join(' ')}.`;
  }

  // web
  const parts = [authors, `${f.title || '[题名缺失]'}[EB/OL].`];
  if (f.pubDate) parts.push(`(${f.pubDate})`);
  if (f.accessDate) parts.push(`[${f.accessDate}]`);
  if (f.url) parts.push(f.url);
  return parts.join(' ');
}
```

- [ ] **步骤 4：实现入口**

创建 `lib/reference/index.ts`：

```ts
import { detectType } from './detect';
import { parseFields } from './parse';
import { formatReference } from './format';
import type { ParseResult, ReferenceType } from './types';

export function parseReference(raw: string): ParseResult {
  const type: ReferenceType = detectType(raw);
  const fields = parseFields(raw, type);
  const formatted = formatReference({ ...fields, type });
  return { type, fields, formatted };
}
```

> 注意：`formatReference` 需读取 `f.type`，故 `ParsedReference` 需含 `type`。调整 `formatReference` 签名接收 `ParsedReference & { type: ReferenceType }`，或直接在 `lib/reference/types.ts` 给 `ParsedReference` 增加 `type` 字段。**以「在 `ParsedReference` 增加 `type: ReferenceType` 字段」为准**，同步修改 `parseFields` 返回值为含 `type` 的对象。

- [ ] **步骤 5：统一类型（消除不一致）**

修改 `lib/reference/types.ts` 的 `ParsedReference`，新增 `type: ReferenceType` 字段；修改 `lib/reference/parse.ts` 的 `parseFields` 返回对象包含 `type`；修改 `lib/reference/format.ts` 的 `formatReference(f: ParsedReference)` 直接读 `f.type`。

- [ ] **步骤 6：运行测试验证通过**

运行：`npx vitest run lib/reference`
预期：PASS（detect / parse / format 全部通过）

- [ ] **步骤 7：Commit（执行时跳过）**

---

### 任务 8：参考文献管理页面

**文件：**
- 创建：`app/references/page.tsx`
- 修改：`lib/db/references.ts`（补 `ReferenceRecord` 构造辅助）

- [ ] **步骤 1：实现页面（客户端组件）**

创建 `app/references/page.tsx`：

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { parseReference } from '@/lib/reference';
import { listReferences, saveReference, deleteReference } from '@/lib/db/references';
import type { ReferenceRecord } from '@/lib/reference/types';

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceRecord[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    listReferences().then(setItems);
  }, []);

  async function handleImport() {
    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);
    const now = Date.now();
    const records: ReferenceRecord[] = lines.map((raw, i) => {
      const r = parseReference(raw);
      return {
        id: `ref-${now}-${i}`,
        raw,
        type: r.type,
        fields: { ...r.fields, type: r.type },
        formatted: r.formatted,
        updatedAt: now,
      };
    });
    for (const rec of records) await saveReference(rec);
    setItems(await listReferences());
    setInput('');
  }

  async function handleDelete(id: string) {
    await deleteReference(id);
    setItems(await listReferences());
  }

  function handleExport() {
    const text = items.map((r, i) => `[${i + 1}] ${r.formatted}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'references.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">参考文献管理</h1>

      <Card>
        <h2 className="mb-2 font-semibold">批量粘贴导入（GB/T 7714 自动标准化）</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          placeholder="每行一条文献，粘贴知网/万方/百度学术导出的条目…"
          className="w-full rounded border p-2 text-sm"
        />
        <button onClick={handleImport} className="mt-2 rounded bg-blue-600 px-4 py-2 text-white">
          解析并导入
        </button>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">已导入条目（{items.length}）</h2>
        <button onClick={handleExport} className="rounded border px-4 py-2 text-sm">
          导出规范化清单
        </button>
      </div>

      <div className="grid gap-3">
        {items.map((item, i) => (
          <Card key={item.id} className="flex items-start justify-between">
            <div className="text-sm">
              <span className="mr-2 font-mono text-gray-400">[{i + 1}]</span>
              <span>{item.formatted}</span>
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {item.type}
              </span>
            </div>
            <button onClick={() => handleDelete(item.id)} className="ml-4 text-xs text-red-500">
              删除
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：手动验证**

运行 `npm run dev`，访问 `http://localhost:3003/references`，粘贴一条期刊文献，确认解析、格式化、导出正常。

- [ ] **步骤 4：Commit（执行时跳过）**

---

### 任务 9：相似度计算纯函数（ngram / score / segment）

**文件：**
- 创建：`lib/similarity/types.ts`、`lib/similarity/ngram.ts`、`lib/similarity/score.ts`、`lib/similarity/segment.ts`
- 测试：`lib/similarity/ngram.test.ts`、`lib/similarity/score.test.ts`、`lib/similarity/segment.test.ts`

- [ ] **步骤 1：定义类型**

创建 `lib/similarity/types.ts`：

```ts
export interface SentenceUnit {
  index: number;
  text: string;
}

export interface MatchPair {
  aIndex: number;
  bIndex: number;
  semantic: number; // 0-1 语义余弦
  lexical: number;  // 0-1 字面 Dice
  score: number;    // 0-1 加权
}

export interface Segment {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  score: number;
}
```

- [ ] **步骤 2：编写失败测试（ngram）**

创建 `lib/similarity/ngram.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { diceCoefficient } from './ngram';

describe('diceCoefficient', () => {
  it('returns 1 for identical strings', () => {
    expect(diceCoefficient('同一段文字', '同一段文字')).toBe(1);
  });
  it('returns 0 for disjoint strings', () => {
    expect(diceCoefficient('abc', 'xyz')).toBe(0);
  });
  it('is higher for verbatim copy than paraphrase', () => {
    const verbatim = diceCoefficient('深度学习模型表现优异', '深度学习模型表现优异');
    const paraphrase = diceCoefficient('深度学习模型表现优异', '神经网络算法性能很好');
    expect(verbatim).toBeGreaterThan(paraphrase);
  });
});
```

创建 `lib/similarity/score.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { combinedScore, cosineSimilarity } from './score';

describe('cosineSimilarity', () => {
  it('equals 1 for identical vectors', () => {
    const v = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });
  it('equals 0 for orthogonal vectors', () => {
    expect(cosineSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0, 5);
  });
});

describe('combinedScore', () => {
  it('weights semantic at 0.7 and lexical at 0.3', () => {
    expect(combinedScore(1, 0)).toBeCloseTo(0.7, 5);
    expect(combinedScore(0, 1)).toBeCloseTo(0.3, 5);
  });
});
```

创建 `lib/similarity/segment.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { mergeSegments } from './segment';
import type { MatchPair } from './types';

describe('mergeSegments', () => {
  it('merges adjacent matching pairs into one segment', () => {
    const pairs: MatchPair[] = [
      { aIndex: 0, bIndex: 10, semantic: 0.8, lexical: 0.5, score: 0.71 },
      { aIndex: 1, bIndex: 11, semantic: 0.85, lexical: 0.5, score: 0.745 },
    ];
    const segs = mergeSegments(pairs, 0.7);
    expect(segs).toHaveLength(1);
    expect(segs[0].aStart).toBe(0);
    expect(segs[0].aEnd).toBe(1);
    expect(segs[0].bStart).toBe(10);
    expect(segs[0].bEnd).toBe(11);
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run lib/similarity`
预期：FAIL，模块未找到

- [ ] **步骤 4：实现**

创建 `lib/similarity/ngram.ts`：

```ts
function ngrams(s: string, n: number): Set<string> {
  const set = new Set<string>();
  if (s.length < n) return set;
  for (let i = 0; i <= s.length - n; i++) {
    set.add(s.slice(i, i + n));
  }
  return set;
}

export function diceCoefficient(a: string, b: string): number {
  const set2 = ngrams(a, 2);
  const set3 = ngrams(a, 3);
  const b2 = ngrams(b, 2);
  const b3 = ngrams(b, 3);

  let inter = 0;
  let total = 0;
  for (const g of set2) { total++; if (b2.has(g)) inter++; }
  for (const g of b2) { if (!set2.has(g)) total++; }
  for (const g of set3) { total++; if (b3.has(g)) inter++; }
  for (const g of b3) { if (!set3.has(g)) total++; }

  return total === 0 ? 0 : (2 * inter) / total;
}
```

创建 `lib/similarity/score.ts`：

```ts
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function combinedScore(semantic: number, lexical: number): number {
  return 0.7 * semantic + 0.3 * lexical;
}
```

创建 `lib/similarity/segment.ts`：

```ts
import type { MatchPair, Segment } from './types';

export function mergeSegments(pairs: MatchPair[], threshold: number): Segment[] {
  const filtered = pairs.filter((p) => p.score >= threshold);
  if (filtered.length === 0) return [];

  filtered.sort((x, y) => x.aIndex - y.aIndex || x.bIndex - y.bIndex);

  const segments: Segment[] = [];
  let cur: Segment = {
    aStart: filtered[0].aIndex,
    aEnd: filtered[0].aIndex,
    bStart: filtered[0].bIndex,
    bEnd: filtered[0].bIndex,
    score: filtered[0].score,
  };

  for (let i = 1; i < filtered.length; i++) {
    const p = filtered[i];
    const adjacent =
      p.aIndex <= cur.aEnd + 1 && p.bIndex <= cur.bEnd + 1;
    if (adjacent) {
      cur.aEnd = Math.max(cur.aEnd, p.aIndex);
      cur.bEnd = Math.max(cur.bEnd, p.bIndex);
      cur.score = Math.max(cur.score, p.score);
    } else {
      segments.push(cur);
      cur = {
        aStart: p.aIndex,
        aEnd: p.aIndex,
        bStart: p.bIndex,
        bEnd: p.bIndex,
        score: p.score,
      };
    }
  }
  segments.push(cur);
  return segments;
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run lib/similarity`
预期：PASS

- [ ] **步骤 6：Commit（执行时跳过）**

---

### 任务 10：语义向量化 Worker

**文件：**
- 创建：`worker/embedding.worker.ts`、`lib/similarity/pipeline.ts`

- [ ] **步骤 1：实现 Worker**

创建 `worker/embedding.worker.ts`：

```ts
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'onnx-community/bge-small-zh-v1.5-ONNX', {
      dtype: 'q8',
      device: 'wasm',
    });
  }
  return extractor;
}

self.onmessage = async (e: MessageEvent) => {
  const { texts } = e.data as { texts: string[] };
  try {
    const pipe = await getExtractor();
    const vectors: number[][] = [];
    for (const text of texts) {
      const out = await pipe(text, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(out.data));
    }
    self.postMessage({ ok: true, vectors });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
```

- [ ] **步骤 2：实现管线协调（浏览器侧）**

创建 `lib/similarity/pipeline.ts`：

```ts
import type { MatchPair, SentenceUnit } from './types';
import { diceCoefficient } from './ngram';
import { combinedScore, cosineSimilarity } from './score';
import { splitSentences } from '@/lib/text/split';
import { getCachedEmbedding, cacheEmbedding } from '@/lib/db/embeddingCache';

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const missing: number[] = [];
  const results: (Float32Array | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i++) {
    const h = await hashText(texts[i]);
    const cached = await getCachedEmbedding(h);
    if (cached) results[i] = cached;
    else missing.push(i);
  }

  if (missing.length > 0) {
    const missingTexts = missing.map((i) => texts[i]);
    const vectors = await runWorkerEmbedding(missingTexts);
    for (let j = 0; j < missing.length; j++) {
      const vec = Float32Array.from(vectors[j]);
      results[missing[j]] = vec;
      await cacheEmbedding(await hashText(texts[missing[j]]), vec);
    }
  }
  return results as Float32Array[];
}

function runWorkerEmbedding(texts: string[]): Promise<number[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('@/worker/embedding.worker', import.meta.url));
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.vectors);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ texts });
  });
}

export function buildUnits(text: string): SentenceUnit[] {
  return splitSentences(text).map((t, i) => ({ index: i, text: t }));
}

export function compareUnits(
  aUnits: SentenceUnit[],
  bUnits: SentenceUnit[],
  aVecs: Float32Array[],
  bVecs: Float32Array[],
  topK = 50,
): MatchPair[] {
  const pairs: MatchPair[] = [];
  for (let i = 0; i < aUnits.length; i++) {
    const sims: { j: number; s: number }[] = [];
    for (let j = 0; j < bUnits.length; j++) {
      const s = cosineSimilarity(aVecs[i], bVecs[j]);
      sims.push({ j, s });
    }
    sims.sort((x, y) => y.s - x.s);
    for (const { j, s } of sims.slice(0, topK)) {
      const lexical = diceCoefficient(aUnits[i].text, bUnits[j].text);
      pairs.push({
        aIndex: aUnits[i].index,
        bIndex: bUnits[j].index,
        semantic: s,
        lexical,
        score: combinedScore(s, lexical),
      });
    }
  }
  return pairs;
}
```

> 注：若同一文档内部自查（aUnits === bUnits），需在 `compareUnits` 中跳过 `i === j` 自比。为此在 `compareUnits` 增加 `self: boolean` 参数：当 `self` 为 true 且 `aUnits[i].index === bUnits[j].index` 时跳过。

- [ ] **步骤 3：验证类型检查**

运行：`npx tsc --noEmit`
预期：无类型错误（`@huggingface/transformers` 类型若缺失，用 `// @ts-ignore` 或安装对应类型并注明）

- [ ] **步骤 4：Commit（执行时跳过）**

---

### 任务 11：语义相似比对页面

**文件：**
- 创建：`app/similarity/page.tsx`

- [ ] **步骤 1：实现页面**

创建 `app/similarity/page.tsx`：

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { buildUnits, compareUnits, embedTexts } from '@/lib/similarity/pipeline';
import { mergeSegments } from '@/lib/similarity/segment';
import type { Segment, SentenceUnit } from '@/lib/similarity/types';

export default function SimilarityPage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'self' | 'cross'>('self');
  const [threshold, setThreshold] = useState(0.7);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [units, setUnits] = useState<SentenceUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true);
    setError('');
    try {
      const aUnits = buildUnits(text);
      const aVecs = await embedTexts(aUnits.map((u) => u.text));
      const pairs = compareUnits(aUnits, aUnits, aVecs, aVecs, 50, true);
      const segs = mergeSegments(pairs, threshold);
      setUnits(aUnits);
      setSegments(segs);
    } catch (err) {
      setError(`语义模型加载失败（可能未联网下载）：${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">文稿语义相似片段自查</h1>
      <BoundaryNotice />

      <Card>
        <div className="flex items-center gap-4">
          <label className="text-sm">
            模式：
            <select value={mode} onChange={(e) => setMode(e.target.value as 'self' | 'cross')}
              className="ml-2 rounded border p-1">
              <option value="self">单文档内部自查</option>
              <option value="cross">多文档交叉比对（后续启用）</option>
            </select>
          </label>
          <label className="text-sm">
            阈值：{threshold.toFixed(2)}
            <input type="range" min={0.5} max={0.95} step={0.01} value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))} className="ml-2" />
          </label>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
          placeholder="粘贴论文正文…" className="mt-3 w-full rounded border p-2 text-sm" />
        <button onClick={run} disabled={loading || !text}
          className="mt-2 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
          {loading ? '向量化中（首次需下载模型）…' : '开始比对'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((seg, i) => {
          const aText = units.slice(seg.aStart, seg.aEnd + 1).map((u) => u.text).join('');
          const bText = units.slice(seg.bStart, seg.bEnd + 1).map((u) => u.text).join('');
          return (
            <Card key={i}>
              <div className="mb-2 text-sm font-semibold text-blue-600">
                相似度 {(seg.score * 100).toFixed(0)}%
              </div>
              <div className="mb-2 rounded bg-yellow-50 p-2 text-sm">A：{aText}</div>
              <div className="rounded bg-yellow-50 p-2 text-sm">B：{bText}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：Commit（执行时跳过）**

---

## Phase 3 — 格式校验、润色、导出、编辑页整合

### 任务 12：格式校验引擎（check + clean）

**文件：**
- 创建：`lib/format/types.ts`、`lib/format/check.ts`、`lib/format/clean.ts`
- 测试：`lib/format/check.test.ts`、`lib/format/clean.test.ts`

- [ ] **步骤 1：定义类型**

创建 `lib/format/types.ts`：

```ts
export type Severity = 'error' | 'warning' | 'info';

export interface FormatIssue {
  type: string;
  line: number;
  severity: Severity;
  message: string;
  suggestion: string;
}
```

- [ ] **步骤 2：编写失败测试**

创建 `lib/format/check.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { checkFormat } from './check';

describe('checkFormat', () => {
  it('flags consecutive blank lines', () => {
    const issues = checkFormat('第一段\n\n\n\n第二段');
    expect(issues.some((i) => i.type === 'blank-lines')).toBe(true);
  });
  it('flags missing heading hierarchy (level 2 without level 1)', () => {
    const issues = checkFormat('2.1 小节\n正文内容');
    expect(issues.some((i) => i.type === 'heading-hierarchy')).toBe(true);
  });
  it('returns no issues for clean text', () => {
    const issues = checkFormat('一、引言\n这是正文段落。');
    expect(issues).toHaveLength(0);
  });
});
```

创建 `lib/format/clean.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { cleanLayout } from './clean';

describe('cleanLayout', () => {
  it('removes consecutive blank lines', () => {
    expect(cleanLayout('a\n\n\n\nb')).toBe('a\n\nb');
  });
  it('trims trailing whitespace per line', () => {
    expect(cleanLayout('a   \nb')).toBe('a\nb');
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`npx vitest run lib/format`
预期：FAIL，模块未找到

- [ ] **步骤 4：实现 check**

创建 `lib/format/check.ts`：

```ts
import type { FormatIssue } from './types';

const H1 = /^(一|二|三|四|五|六|七|八|九|十)、/;
const H2 = /^（[一二三四五六七八九十]+）/;
const H3 = /^\d+\.\d+\s/;

export function checkFormat(text: string): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const lines = text.split('\n');

  let blankCount = 0;
  let hasH1 = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (line.trim() === '') {
      blankCount++;
      if (blankCount >= 2) {
        issues.push({
          type: 'blank-lines',
          line: lineNo,
          severity: 'warning',
          message: '存在连续空行',
          suggestion: '合并为单个空行',
        });
      }
    } else {
      blankCount = 0;
    }

    if (H1.test(line.trim())) hasH1 = true;

    if (H2.test(line.trim()) && !hasH1) {
      issues.push({
        type: 'heading-hierarchy',
        line: lineNo,
        severity: 'error',
        message: '二级标题出现于一、级标题之前',
        suggestion: '补充一级标题，或调整层级',
      });
    }
  }

  return issues;
}
```

创建 `lib/format/clean.ts`：

```ts
export function cleanLayout(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`npx vitest run lib/format`
预期：PASS

- [ ] **步骤 6：Commit（执行时跳过）**

---

### 任务 13：DeepSeek 润色代理 + 配置模板

**文件：**
- 创建：`app/api/polish/route.ts`、`.env.example`

- [ ] **步骤 1：创建配置模板**

创建 `.env.example`（不含真实 key）：

```bash
# DeepSeek OpenAI 兼容接口（用户自行填入真实值到 .env.local）
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

- [ ] **步骤 2：实现代理 route**

创建 `app/api/polish/route.ts`：

```ts
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是学术论文润色助手。请优化以下文本的语句逻辑，剔除口语化表达，使其符合学术写作规范。严格保留所有科学观点、实验数据、数字和核心结论，不得改变原意、不得编造内容。只输出润色后的文本，不要解释。`;

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: '缺少 text' }, { status: 400 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: '未配置 DEEPSEEK_API_KEY' }, { status: 500 });
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json({ error: `上游接口错误 ${resp.status}: ${body}` }, { status: 502 });
    }

    const data = await resp.json();
    const polished = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ polished });
  } catch (err) {
    return NextResponse.json({ error: `请求失败: ${err}` }, { status: 500 });
  }
}
```

- [ ] **步骤 3：验证构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 4：Commit（执行时跳过）**

---

### 任务 14：编辑页（导入 / 编辑 / 格式检测 / 润色侧栏）

**文件：**
- 创建：`app/editor/page.tsx`

- [ ] **步骤 1：实现编辑页**

创建 `app/editor/page.tsx`：

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/Card';
import { BoundaryNotice } from '@/components/BoundaryNotice';
import { checkFormat } from '@/lib/format/check';
import { cleanLayout } from '@/lib/format/clean';
import { splitSentences } from '@/lib/text/split';
import { getDocument, saveDocument } from '@/lib/db/documents';
import { db } from '@/lib/db';

export default function EditorPage() {
  const params = useSearchParams();
  const id = params.get('id');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [issues, setIssues] = useState<ReturnType<typeof checkFormat>>([]);
  const [polish, setPolish] = useState('');
  const [polishing, setPolishing] = useState(false);
  const [polishError, setPolishError] = useState('');
  const [selection, setSelection] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) {
      getDocument(id).then((d) => {
        if (d) { setTitle(d.title); setContent(d.content); }
      });
    }
  }, [id]);

  useEffect(() => {
    setIssues(checkFormat(content));
  }, [content]);

  async function persist() {
    if (!content.trim()) return;
    const docId = id ?? `doc-${Date.now()}`;
    const now = Date.now();
    await saveDocument({
      id: docId,
      title: title || '未命名文稿',
      content,
      sourceFormat: 'paste',
      createdAt: now,
      updatedAt: now,
    });
  }

  async function handleFile(file: File) {
    if (file.name.endsWith('.txt')) {
      setContent(await file.text());
    } else if (file.name.endsWith('.docx')) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      setContent(result.value);
    }
  }

  async function handlePolish() {
    setPolishing(true);
    setPolishError('');
    try {
      const resp = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selection || content }),
      });
      const data = await resp.json();
      if (!resp.ok) setPolishError(data.error ?? '润色失败');
      else setPolish(data.polished);
    } catch (err) {
      setPolishError(`请求失败: ${err}`);
    } finally {
      setPolishing(false);
    }
  }

  function applyPolish() {
    setContent(polish);
    setPolish('');
  }

  function onSelect() {
    const el = textareaRef.current;
    if (el) setSelection(el.value.slice(el.selectionStart, el.selectionEnd));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="文稿标题" className="text-2xl font-bold outline-none" />
        <div className="flex gap-2">
          <button onClick={persist} className="rounded bg-blue-600 px-4 py-2 text-white">保存</button>
          <label className="cursor-pointer rounded border px-4 py-2 text-sm">
            导入文件
            <input type="file" accept=".txt,.docx" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          <button onClick={() => setContent(cleanLayout(content))}
            className="rounded border px-4 py-2 text-sm">一键排版清理</button>
        </div>
      </div>

      <BoundaryNotice />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <textarea ref={textareaRef} value={content} onSelect={onSelect}
          onChange={(e) => setContent(e.target.value)} rows={24}
          className="w-full rounded border p-3 font-mono text-sm" />

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">格式检测结果（{issues.length}）</h2>
            {issues.length === 0 ? (
              <p className="text-sm text-gray-500">未发现格式问题</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {issues.map((iss, i) => (
                  <li key={i} className="rounded bg-gray-50 p-2">
                    <span className="font-semibold">第 {iss.line} 行</span> [{iss.type}] {iss.message}
                    <p className="mt-1 text-xs text-gray-500">建议：{iss.suggestion}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">AI 学术润色</h2>
            <p className="mb-2 text-xs text-gray-500">
              {selection ? `已选 ${splitSentences(selection).length} 句` : '未选段时润色全文'}
            </p>
            <button onClick={handlePolish} disabled={polishing}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {polishing ? '润色中…' : '开始润色'}
            </button>
            {polishError && <p className="mt-2 text-xs text-red-600">{polishError}</p>}
            {polish && (
              <div className="mt-3 space-y-2">
                <div className="rounded bg-gray-50 p-2 text-xs">原文：{selection || content}</div>
                <div className="rounded bg-blue-50 p-2 text-xs">润色：{polish}</div>
                <div className="flex gap-2">
                  <button onClick={applyPolish} className="rounded bg-green-600 px-3 py-1 text-xs text-white">采纳替换</button>
                  <button onClick={() => setPolish('')} className="rounded border px-3 py-1 text-xs">放弃</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：验证构建**

运行：`npm run build`
预期：构建成功

- [ ] **步骤 3：Commit（执行时跳过）**

---

### 任务 15：导出功能收尾 + 全量验证

**文件：**
- 修改：`app/editor/page.tsx`（补导出按钮，若未含）

- [ ] **步骤 1：补文稿导出（编辑页）**

在编辑页工具栏追加导出按钮（Markdown / txt 二选一下载）：

```tsx
function handleExportText() {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title || 'document'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

按钮：`<button onClick={handleExportText} className="rounded border px-4 py-2 text-sm">导出 txt</button>`

- [ ] **步骤 2：运行全量单测**

运行：`npm test`
预期：PASS（`lib/` 下全部测试通过）

- [ ] **步骤 3：运行生产构建**

运行：`npm run build`
预期：构建成功，无类型/ESLint 错误

- [ ] **步骤 4：端到端手动验证清单**

运行 `npm run dev`，逐项验证：
1. 首页工作台：5 个导航入口跳转正确，历史文稿可打开。
2. 编辑页：粘贴/导入 txt/docx、编辑、格式检测面板实时刷新、排版清理、润色（需配 key）、导出 txt。
3. 参考文献页：批量粘贴 → 解析标准化 → 导出清单。
4. 语义自查页：粘贴正文 → 首次下载模型 → 双栏高亮相似片段 + 分数，阈值滑块可调。

- [ ] **步骤 5：Commit（执行时跳过）**

---

## 自检结论

- **规格覆盖度**：文档导入/编辑（任务 14）、格式校验+排版清理（任务 12）、参考文献标准化（任务 5-8）、AI 润色（任务 13-14）、语义相似自查（任务 9-11）、导出（任务 8/15）、IndexedDB（任务 2）、边界提示（任务 3-4）、错误降级（任务 11 页面提示、任务 13 接口错误处理）。
- **占位符**：无 TODO/待定；每个代码步骤均有完整代码。
- **类型一致性**：`ParsedReference` 含 `type` 字段（任务 7 步骤 5 统一）；`ReferenceRecord.fields` 用 `Record<string, string | string[] | undefined>` 兼容；`compareUnits` 的 `self` 参数已在任务 10 注明。
