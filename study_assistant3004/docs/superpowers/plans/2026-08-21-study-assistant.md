# 个人知识管理 + 学习路径 + 打卡 + 复盘系统 实现计划

> **面向 AI 代理的工作者：** 使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现。步骤用复选框（`- [ ]`）跟踪进度。

**目标：** 构建轻量化个人结构化学习管理 Web 系统，实现「多学科分区 → 树形学习路径 → 知识沉淀 → 文件归档 → 打卡 → 复盘 → 可视化 → AI 推荐」闭环。

**架构：** Next.js 16 App Router 全栈单应用。服务端用 Prisma + SQLite 持久化，所有数据操作走 Route Handlers（`/api/*`），前端用 Server Components 渲染页面 + 少量 Client Components 做交互（拖拽、表单、图表）。纯逻辑（进度计算、AI 结果解析）抽到 `src/lib` 用 vitest 做 TDD。

**技术栈：** Next.js 16 + TypeScript + TailwindCSS v4 + Prisma + SQLite + Recharts + @dnd-kit（树形拖拽）+ DeepSeek API（OpenAI 兼容）。

---

## 数据模型（完整 Prisma Schema）

文件：`prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum MasteryStage {
  NOT_STARTED
  LEARNING
  MASTERED
  REVIEW
}

enum NodeStatus {
  NOT_STARTED
  LEARNING
  COMPLETED
}

enum FileStatus {
  NOT_STARTED
  LEARNING
  COMPLETED
  KEY_ARCHIVE
}

enum CheckInStatus {
  MASTERED
  PARTIAL
  REVIEW
}

model Subject {
  id          String   @id @default(cuid())
  name        String   @unique
  color       String   @default("#3b82f6")
  description String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  knowledgePoints KnowledgePoint[]
  pathNodes       PathNode[]
  files           StudyFile[]
  checkIns        CheckIn[]
  reviews         Review[]
}

model KnowledgePoint {
  id         String       @id @default(cuid())
  title      String
  content    String       @default("")
  note       String       @default("")
  difficulty Difficulty   @default(MEDIUM)
  stage      MasteryStage @default(NOT_STARTED)
  tags       String       @default("")
  archived   Boolean      @default(false)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  pathNodes PathNode[]
  checkIns  CheckIn[]
  reviews   Review[]
}

model PathNode {
  id        String     @id @default(cuid())
  title     String
  kind      String     @default("chapter")
  note      String     @default("")
  order     Int        @default(0)
  status    NodeStatus @default(NOT_STARTED)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  parentId String?
  parent   PathNode?  @relation("PathNodeTree", fields: [parentId], references: [id], onDelete: Cascade)
  children PathNode[] @relation("PathNodeTree")

  knowledgePoints KnowledgePoint[]
  files           StudyFile[]
  checkIns        CheckIn[]
  reviews         Review[]
}

model StudyFile {
  id         String     @id @default(cuid())
  filename   String
  storedPath String
  mimeType   String
  size       Int
  status     FileStatus @default(NOT_STARTED)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  pathNodes PathNode[]
}

model CheckIn {
  id              String        @id @default(cuid())
  date            DateTime      @default(now())
  durationMinutes Int           @default(0)
  status          CheckInStatus @default(PARTIAL)
  note            String        @default("")
  createdAt       DateTime      @default(now())

  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  knowledgePointId String?
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id], onDelete: SetNull)

  pathNodeId String?
  pathNode   PathNode? @relation(fields: [pathNodeId], references: [id], onDelete: SetNull)
}

model Review {
  id         String   @id @default(cuid())
  date       DateTime @default(now())
  gain       String   @default("")
  question   String   @default("")
  plan       String   @default("")
  difficulty String   @default("")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  subjectId String?
  subject   Subject? @relation(fields: [subjectId], references: [id], onDelete: SetNull)

  knowledgePointId String?
  knowledgePoint   KnowledgePoint? @relation(fields: [knowledgePointId], references: [id], onDelete: SetNull)

  pathNodeId String?
  pathNode   PathNode? @relation(fields: [pathNodeId], references: [id], onDelete: SetNull)
}
```

## 进度计算核心逻辑（TDD 重点）

文件：`src/lib/progress.ts` + `src/lib/progress.test.ts`

**公式（可测试、透明）：**

- 学科完成率 `completionRate` = `100 * (completedNodes + masteredKnowledge + completedFiles) / max(1, totalNodes + totalKnowledge + totalFiles)`，四舍五入到整数。
  - `completedNodes` = status == COMPLETED 的节点数
  - `masteredKnowledge` = stage == MASTERED 的知识点数
  - `completedFiles` = status == COMPLETED 的归档文件数（KEY_ARCHIVE 视作已完成）
- 子指标独立返回：`nodeRate` / `knowledgeRate` / `fileRate`（各自为 0 时不算分母）。
- 全局进度 `globalProgress` = 所有学科完成率加权平均（按各学科项目总数加权；项目总数为 0 的学科不计入）。
- `totalDurationMinutes` = 该学科/全局打卡时长求和。
- `streakDays` = 从今天（或最近有打卡的一天）起连续有打卡记录的天数，按 `date` 的日期部分去重判断。
- `weakPoints` = stage ∈ {LEARNING, REVIEW} 或（difficulty == HARD 且 stage != MASTERED）的知识点，供 AI 推荐使用。

测试用例覆盖：空数据、单类型分母为 0 的降级、完成率四舍五入、全局加权、连续打卡跨天与断卡、weakPoints 过滤。

## 文件结构

```
study_assistant3004/
├── prisma/
│   └── schema.prisma
├── data/
│   └── uploads/                  # 归档文件磁盘存储（gitignore）
├── src/
│   ├── app/
│   │   ├── layout.tsx            # 全局布局 + 导航
│   │   ├── page.tsx              # 首页工作台（学科方块 + 全局进度 + 图表 + 快捷入口）
│   │   ├── globals.css           # 学术简约主题变量 + hover 规范
│   │   ├── subjects/[id]/page.tsx# 学科独立详情页（树形大纲 + 数据统计）
│   │   ├── knowledge/page.tsx    # 全局知识仓库 + 文件归档管理
│   │   ├── checkin/page.tsx      # 打卡与复盘中心
│   │   └── api/
│   │       ├── subjects/route.ts
│   │       ├── subjects/[id]/route.ts
│   │       ├── knowledge-points/route.ts
│   │       ├── knowledge-points/[id]/route.ts
│   │       ├── path-nodes/route.ts
│   │       ├── path-nodes/[id]/route.ts
│   │       ├── path-nodes/reorder/route.ts
│   │       ├── files/route.ts
│   │       ├── files/[id]/route.ts
│   │       ├── checkins/route.ts
│   │       ├── reviews/route.ts
│   │       ├── stats/route.ts
│   │       └── ai/recommend/route.ts
│   ├── components/
│   │   ├── ui/                    # Card Button Modal Input Select Badge EmptyState
│   │   ├── subject/               # SubjectCard SubjectForm
│   │   ├── knowledge/             # KnowledgeCard KnowledgeForm KnowledgeDetail
│   │   ├── path/                  # TreeOutline PathNodeItem（@dnd-kit 拖拽）
│   │   ├── checkin/               # CheckInPanel CheckInForm
│   │   ├── review/                # ReviewForm ReviewList ReviewDetail
│   │   ├── file/                  # FileUpload FileList FileCard
│   │   ├── charts/                # CompletionChart TrendChart MasteryPie
│   │   └── ai/                    # AiRecommendPanel
│   ├── lib/
│   │   ├── prisma.ts              # PrismaClient 单例
│   │   ├── progress.ts            # 进度计算（纯函数）
│   │   ├── ai.ts                  # DeepSeek 客户端 + 结果解析（纯函数）
│   │   └── utils.ts               # cn() 等
│   └── types/
│       └── index.ts               # 共享类型
├── .env                           # DATABASE_URL（非密钥）；DEEPSEEK_API_KEY 留空
├── .env.example                   # 文档化所有环境变量
├── vitest.config.ts
└── package.json                   # dev 脚本端口 3004
```

## UI 主题规范（全局统一）

- 圆角：`rounded-xl`（卡片）`rounded-lg`（输入/按钮）
- 配色：低饱和学术色板，主色 slate/blue 系，学科色用 Tailwind 预设（blue/emerald/amber/violet/rose/cyan）
- 卡片 hover：`hover:scale-[1.02] hover:shadow-lg transition-transform transition-shadow duration-200`
- 状态色：未开始=slate-200、学习中=amber、已完成=emerald、待复习=rose
- 全站中文文案

---

## 阶段拆分

### Phase 0 — 脚手架与数据层（地基）

**文件：** 项目根 + `prisma/schema.prisma` + `src/lib/prisma.ts` + `src/app/globals.css` + `src/app/layout.tsx` + `src/lib/utils.ts` + `vitest.config.ts` + `src/lib/progress.ts` + `src/lib/progress.test.ts` + `src/components/ui/*`

- [ ] 用 `create-next-app`（TS + Tailwind + App Router + src 目录）初始化，`next` 锁 16.x
- [ ] 配置 `package.json`：`dev`/`start` 端口 3004；加 `test` 脚本（vitest）
- [ ] 安装依赖：`prisma @prisma/client recharts @dnd-kit/core @dnd-kit/sortable vitest`
- [ ] 写 `prisma/schema.prisma`（上文完整 schema），`DATABASE_URL="file:./dev.db"`，`npx prisma migrate dev --name init`
- [ ] 写 `src/lib/prisma.ts`（global 单例，防 HMR 多实例）
- [ ] 写 `src/lib/progress.ts` 纯函数 + `progress.test.ts`（TDD：先写失败测试 → 实现 → 通过）
- [ ] 建 `src/components/ui/` 基础组件（Card/Button/Modal/Input/Select/Badge/EmptyState）
- [ ] 写 `globals.css` 主题变量与 hover 工具类，`layout.tsx` 顶部导航
- [ ] Commit

### Phase 1 — 核心闭环（多学科 + 知识 + 树形路径 + 打卡 + 复盘 + 首页）

**文件：** `src/app/page.tsx`、`src/app/subjects/[id]/page.tsx`、`src/app/api/subjects/*`、`src/app/api/knowledge-points/*`、`src/app/api/path-nodes/*`、`src/app/api/checkins/*`、`src/app/api/reviews/*`、对应 `src/components/*`

- [ ] 学科 CRUD：`/api/subjects` + 首页新增/编辑/删除学科方块
- [ ] 知识录入：`/api/knowledge-points` + 知识仓库页 + 标签（难度/阶段/自定义 tags）+ 归档/封存
- [ ] 树形路径：`/api/path-nodes`（增删改 + 绑定知识点）+ 拖拽排序 `/api/path-nodes/reorder`（@dnd-kit）+ 学科详情页树形大纲渲染（状态色区分）
- [ ] 打卡：`/api/checkins`（按节点/知识点，时长 + 掌握状态）+ 打卡面板 + 连续天数/断卡
- [ ] 复盘：`/api/reviews`（模板四字段 + 与节点/知识点双向绑定）+ 复盘列表/详情
- [ ] 首页工作台：全局进度卡片（总完成率/累计时长/连续天数）+ 学科圆角方块 + 快捷入口
- [ ] 学科详情页独立数据统计（完成率/时长/薄弱点/归档数）
- [ ] Commit

### Phase 2 — 文件归档 + 可视化看板

**文件：** `src/app/api/files/*`、`src/components/file/*`、`src/app/api/stats/*`、`src/components/charts/*`

- [ ] 文件上传归档：`/api/files`（multipart，存 `data/uploads/`，元数据入库，绑定学科/节点）+ 状态标记（待学习/学习中/已完成/重点归档）
- [ ] 已完成文件折算进度（复用 progress.ts，`KEY_ARCHIVE` 计入完成）
- [ ] 可视化：`/api/stats` 聚合 + Recharts 图表（学科占比饼图、每日/每周时长趋势、掌握度饼图、薄弱模块）
- [ ] Commit

### Phase 3 — AI 智能推荐

**文件：** `src/lib/ai.ts` + `src/app/api/ai/recommend/route.ts` + `src/components/ai/AiRecommendPanel.tsx`

- [ ] `src/lib/ai.ts`：DeepSeek OpenAI 兼容客户端（fetch）+ 结果解析纯函数（JSON 容错），纯函数部分 TDD
- [ ] `/api/ai/recommend`：收集 weakPoints + 各学科进度，调 DeepSeek 生成「下一步节点 + 待复习薄弱点 + 精简解释」
- [ ] `.env.example` 文档化 `DEEPSEEK_API_KEY`/`DEEPSEEK_BASE_URL`；无 key 时接口优雅降级为规则推荐
- [ ] 学科详情页 / 首页接入推荐面板
- [ ] Commit

---

## 硬性约束落实

- 无登录、无社交、无积分排行；纯本地 SQLite + `data/uploads` 磁盘存储
- 所有卡片统一 hover 规范（scale 1.02 + 阴影 + 200ms）
- 端口 3004
- 不提交 `.env`、`data/uploads/`、`prisma/dev.db`（加入 `.gitignore`）

## 验证策略

- 每个 Phase 结束：`npm run test`（vitest 纯逻辑）+ `npx tsc --noEmit` + `npm run build` 通过 + `npm run dev` 手动走查该阶段闭环
- 关键逻辑（进度计算、streak、AI 解析）必须有单测证据，不凭肉眼断言
