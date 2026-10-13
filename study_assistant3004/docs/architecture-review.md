# 知序 · 架构适应性评估

> 评估目的：拿**你的真实使用数据**去对照程序的架构假设，找出"程序在设计时假设你会怎么用"与"你实际怎么用"之间的错配，并给出分级修改建议。
>
> 本文只做分析与建议，**不含任何代码改动**。
>
> 数据快照：评估当次从 `prisma/dev.db` 只读查询所得（命令见附录）。
> 方法：`codebase-design`（模块 / 接口 / 接缝 / 深度）+ `typesafe-ai`（结构化判断的视角）。

---

## 一、结论摘要（TL;DR）

程序把"学习进度可视化"整体押在两个你**几乎不用**的模型上：`CheckIn`（打卡）和 `KnowledgePoint`（知识点）。而你真正的资产在第三个模型上：`PathNode`（学习节点）+ 它的 `note` 字段。

结果：**首页 7 个信息区块（3 张卡 + 3 张图 + 1 个 AI 面板）里有 6 个的数据源为空**，剩下 1 个"整体完成率"也显示 0%（0 个节点完成）。而你有 177 个节点、130 条笔记、4 个学科这件事，首页一个字都不提。

按优先级，最该动的三件事：

1. **首页改口径**：展示节点/笔记维度的进展，把没数据的打卡类图表降级或隐藏。
2. **笔记提到台面上**：它是你 73% 节点的产出，但现在是藏得最深的字段（点"编辑"→ 弹窗 → 2 行小框）。
3. **薄弱点 / 掌握度 / AI 建议换数据源**：从 `KnowledgePoint` 换成 `PathNode`（`status` + `note`），否则这三块对你永远是空的。

---

## 二、数据快照（评估依据）

```
学科 4：人体结构与功能 78 节点 | 生命科学基础 50 | 医学统计学 28 | 概率论与数理统计 21
节点 177：kind 全部 = "chapter"
状态：NOT_STARTED 169 | LEARNING 8 | COMPLETED 0
笔记：130/177 写了笔记（73%），总 5593 字，最长 242 字，均值 43 字
      分布：0字 47 | 1–20字 36 | 21–100字 86 | 101–300字 8 | >300字 0
树深：0层 24 | 1层 58 | 2层 28 | 3层 20 | 4层 32 | 5层 15
文件 3：全是 .jpg 图片，每学科最多 1 张，全部绑定到 1 个节点，状态全 NOT_STARTED
知识点 0 | 复盘 0 | 打卡 0（此前有 2 条，已删）
```

每学科层级分布（说明你的组织形态不是一种）：

| 学科 | 层级分布 |
|---|---|
| 人体结构与功能 | d0:5, d1:4, d2:10, d3:12, **d4:32, d5:15** |
| 生命科学基础 | d0:8, d1:23, d2:11, d3:8 |
| 医学统计学 | d0:8, d1:20 |
| 概率论与数理统计 | d0:3, d1:11, d2:7 |

---

## 三、你的使用画像

从数据能读出的五条事实：

1. **你在把教材目录逐层搬进树里。** 标题是教材术语级，且习惯中英对照：`细胞膜(plasma membrane)`、`微管(microtubule)`、`静息电位 RP`、`动作电位 AP`。最深到第 5 层。
2. **笔记是你的核心产出，不是附属品。** 73% 的节点有笔记，主体是 21–100 字的要点摘录（86 条）。
3. **你还在"建结构 + 填笔记"阶段，没进入"推进进度"阶段。** 169/177 是 NOT_STARTED，0 个 COMPLETED，只有 8 个 LEARNING 用来标记"正在学这一节"。
4. **你按学科组织，学科是你的第一级导航。** 4 个学科各自成树，粒度不同（医学统计学只到 2 层，人体结构与功能到 5 层）。
5. **你的学习资料是图片。** 3 个文件全是教材/图谱照片，一科一张，绑在具体节点上——它们是"节点配图"，不是独立资料库。

---

## 四、架构错配清单

每条格式：**现象 → 证据 → 影响 → 建议 → 改动面 → 取舍**。

### C1 首页展示的全是你不用的事（严重）

- **现象**：首页 3 张统计卡（整体完成率 / 累计学习时长 / 连续打卡）+ 3 张图（学科时长占比 / 14 天时长趋势 / 知识点掌握度）+ AI 面板，共 7 个区块；其中 6 个（时长卡、打卡卡 + 3 张图 + AI 面板）的数据源是 `CheckIn` 或 `KnowledgePoint`，两者均为 0 条，仅"整体完成率"有数据源但显示 0%。
- **证据**：
  - `src/components/HomeDashboard.tsx:50-72` — 三张卡分别取 `completionRate` / `totalDurationMinutes` / `streakDays`
  - `src/components/charts/ChartsSection.tsx:26-43` — `subjectData` 取 `totalDurationMinutes`、`masteryData` 取 `stats.mastery`、`trendData` 取 `stats.trend`，三者全部来自打卡或知识点；`41-43` 行的 `hasXxxData` 为假时渲染"暂无数据"
  - `src/lib/queries.ts:89-167` — `getHomeStats` 中 `trend`（103-122）、`mastery`（124-131）、`weakPoints`（133-149）全部查 `checkIn` 与 `knowledgePoint`
- **影响**：你每次打开首页，看到的是 0%、0 分钟、0 天、三张空图。首页对你没有信息量，等于一个需要滚动的空壳。
- **建议**：首页口径改成你真实在做的三件事——**节点总量 / 笔记数量 / 各学科树的推进状态**（多少节已学、多少节有笔记、多少节空着）。打卡类图表在无数据时直接不渲染，而不是占位显示"暂无数据"。
- **改动面**：`src/lib/queries.ts`（`getHomeStats` 或新增 `getNodeStats`）、`src/components/HomeDashboard.tsx`、`src/components/charts/ChartsSection.tsx`。不涉及数据表变更。
- **取舍**：打卡/知识点相关卡片**不是删掉，而是条件渲染**——保留功能，等真有数据再出现。这样不会破坏你以后可能想用的路径。

### C2 笔记是最高频字段，却藏得最深（严重）

- **现象**：树上只渲染节点标题；要读或写笔记必须点"编辑"→ 打开 `NodeForm` 弹窗 → 在一个 `rows={2}` 的文本框里操作。
- **证据**：
  - `src/components/path/TreeOutline.tsx:330-336` — 节点下方只渲染 `node.files` 的 chip，**完全不渲染 `node.note`**
  - `src/components/path/TreeOutline.tsx:312-319` — 进入编辑的唯一入口
  - `src/components/path/TreeOutline.tsx:565-570` — `<Textarea rows={2}>`
  - 数据：130 条笔记、均值 43 字、最长 242 字 → 2 行框装不下主体内容
- **影响**：你 73% 的工作成果在界面上不可见；每次记一条要点要走 4 步（编辑→弹窗→打字→保存），这是笔记产出速度的天花板。
- **建议**：让笔记成为树的一等公民——节点行内显示笔记摘要（1–2 行，超出省略），点击即可**就地展开编辑**（不走弹窗），编辑框按内容自动增高。弹窗保留给"完整编辑 + 绑定关系"。
- **改动面**：`src/components/path/TreeOutline.tsx`（`SortableNode` 渲染 + 新增行内编辑组件）、可能新增 `PATCH /api/path-nodes/[id]` 的单字段调用（现有接口已支持 `note`，见 `src/app/api/path-nodes/[id]/route.ts:43`）。
- **取舍**：深树（5 层）下全部展开笔记会让页面变长，所以默认显示摘要、按需展开；不做"全部展开"的默认态。

### C3 知识点模型与你的知识粒度不匹配（严重）

- **现象**：`KnowledgePoint`（`title/content/note/tags/difficulty/stage`）是一个文档式模型，0 条记录。但**掌握度图表、薄弱点列表、AI 学习建议**三块功能的唯一数据源就是它。你的知识粒度实际是"节点 + 笔记"（教材术语级）。
- **证据**：
  - `src/app/api/stats/route.ts:43-50` — `mastery` 用 `prisma.knowledgePoint.groupBy`
  - `src/app/api/stats/route.ts:52-68` — `weakPoints` 查 `prisma.knowledgePoint`
  - `src/lib/progress.ts:111-119` — `isWeakPoint()` 的入参形态是 `{ stage, difficulty }`，来自知识点
  - `src/app/api/ai/recommend/route.ts:15-31` — AI 建议的输入也是 `knowledgePoint`
  - 数据：知识点 0 条；节点 177 个且 `NodeStatus` 只有 `NOT_STARTED/LEARNING/COMPLETED` 三态
- **影响**：这三块功能对你**结构性失效**——不是"数据少"，而是"永不为真"。同时 `PathNode` 的 `status` 三态表达不了你想要的信息（比如"学过但需要复习"）。
- **建议**：把这三个功能的数据源换成 `PathNode`：
  - 掌握度 → 节点状态分布（并把 `NodeStatus` 从 3 态扩到 4 态，对齐 `MasteryStage` 的 `REVIEW`）
  - 薄弱点 → `status = LEARNING` 的节点 + 笔记为空的节点
  - AI 建议 → 输入改为节点标题 + 笔记（见 C7）
  - `KnowledgePoint` 与节点的绑定关系（`PathNode.knowledgePoints`）保留但降级为可选
- **改动面**：`src/lib/progress.ts`（`isWeakPoint` 的入参形态）、`src/app/api/stats/route.ts`、`src/app/api/ai/recommend/route.ts`、`prisma/schema.prisma`（`NodeStatus` 加一个枚举值，需要一次 migration）。
- **取舍**：不删 `KnowledgePoint` 表——你在 `KnowledgeWarehouse` 里已有完整的增删改查，删了要连带改 3 个接口和 1 个页面。**降级为可选**的代价最小。

### C4 打卡表单摩擦过大，已被你的行为否决（中等）

- **现象**：一次打卡要填 6 个字段（学科、时长、掌握状态、学习节点、知识点、备注），其中节点下拉在你的数据量下是一个 21–78 项的列表。
- **证据**：
  - `src/components/checkin/CheckInForm.tsx:99-173` — 6 个输入项
  - `src/components/checkin/CheckInForm.tsx:53-69` — 打开表单即发 2 个请求拉节点与知识点列表
  - 数据：打卡 2 条 → 现在 0 条；而节点 177 个、笔记 130 条
- **影响**：你宁可不用，也不愿每次填 6 个字段。而首页的时长/连续天数/趋势又全靠它。
- **建议**：把打卡摩擦降到 1 步——**在节点行上直接标记"今天学了这节"**（学科、节点自动带入，时长给默认值），完整表单保留给需要精细记录的场合。
- **改动面**：`src/components/path/TreeOutline.tsx`（节点行加操作）、`src/components/checkin/CheckInForm.tsx`（改为"快速模式 + 详细模式"）、复用现有 `POST /api/checkins`。
- **取舍**：这会让 `TreeOutline` 变重（它已经有拖拽排序、增删改、文件 chip）。如果 C2 也做行内编辑，建议先把"节点行"抽成一个独立组件，避免 `TreeOutline` 继续膨胀。

### C5 文件上传强制三步，且文案与你的实际用法相悖（中等）

- **现象**：上传必须依次选"所属学科 → 所属章节 → 文件"，三者缺一不可；而标签写的是"学习资料（PDF / TXT / 文档）"，你上传的 3 个文件**全是 jpg 图片**。
- **证据**：
  - `src/components/file/FileUpload.tsx:37-40` — `if (!file || !subjectId || !nodeId)` 直接报错
  - `src/components/file/FileUpload.tsx:107-109` — 文案"学习资料（PDF / TXT / 文档）"
  - `src/components/file/FileUpload.tsx:85-105` — 章节下拉在你最大的学科下有 78 个选项
  - 数据：3 个文件全是 `image/jpeg`，各绑定 1 个节点
- **影响**：传一张教材照片要走 3 步 + 翻 78 项下拉。实际发生的频率（一科一张）说明它被当成了"偶尔用一次"的功能。
- **建议**：① 允许**先选文件、后绑定**（或从节点侧直接"添加配图"）；② 文案改为"学习资料（图片 / PDF / 文档）"；③ 章节下拉加搜索/层级缩进，78 项平铺下拉不可用。
- **改动面**：`src/components/file/FileUpload.tsx`、`src/components/path/TreeOutline.tsx`（节点侧上传入口）、`src/app/api/files/route.ts`（若允许未绑定上传则需放宽 `pathNodeIds` 校验——**注意这会与刚修的"无绑定即清理"策略冲突，需要同时定义"未绑定文件"的生命周期**）。
- **取舍**：好消息是**图片预览已经做好了**——`src/components/file/FilePreview.tsx:96-104` 已支持 `image/*` 内联显示，只是入口是 Modal 弹窗。建议把图片直接内联显示在节点行（缩略图），点开才进弹窗。

### C6 空转的枚举与缺失的导航（轻微）

- **现象一**：`kind` 枚举有 `chapter / node / milestone` 三种（`TreeOutline.tsx:31-35`），但 177 个节点**全部**是 `chapter`，两种从未使用。
- **现象二**：顶栏导航只有"工作台 / 知识仓库 / 打卡复盘"三项（`src/app/layout.tsx:12-16`），**没有"学科"入口**，而学科是你唯一的组织维度（4 个），每次都要从首页卡片绕。
- **建议**：① `kind` 要么赋值给用户（做成可切换的图标/标签），要么从表单里移除；② 导航加"学科"下拉或列表。
- **改动面**：`src/components/path/TreeOutline.tsx:527-537`（kind 选择器）、`src/app/layout.tsx`。
- **取舍**：`kind` 移除会与已有数据脱节吗？不会——现有数据全是默认值，移除是零成本。但如果以后想区分"章节/小节/考点"，保留字段、只改 UI 更稳。

### C7 AI 建议：数据源为空 + prompt-and-parse 无结构保证（基建级）

- **现象**：AI 学习建议是"拼 prompt → 调 DeepSeek → 手写容错解析 JSON"。
- **证据**：
  - `src/lib/ai.ts:30-54` — `extractJson` 三级兜底：先 `JSON.parse`，失败再试 markdown code fence，再试首尾大括号截取
  - `src/lib/ai.ts:71-82` — `parseAiRecommendation` 逐字段 `typeof === "string"` 兜底，无类型/无置信度
  - `src/lib/ai.ts:103-122` — `buildPrompt` 的输入只有薄弱知识点标题
  - `src/app/api/ai/recommend/route.ts:15-31` — 输入查 `knowledgePoint` → 0 条
- **影响**：这个面板现在固定输出"暂无薄弱知识点"。即使有数据，`extractJson` 的三级兜底说明**模型输出格式不可靠**这件事实已经被代码承认了。
- **建议**：这是 `typesafe-ai` 描述的典型场景——**"a prompt-and-parse step that could become a structured decision"**。拆成两个结构化判断，而不是让模型自由生成 JSON：
  1. **`Noul`（条件是否成立）**：给定一个节点的「标题 + 笔记」，判断"这条笔记是否显示该节点尚未掌握"。
  2. **`Score`（程度）**：在 `未开始 / 听说过 / 能复述 / 能应用 / 能讲清` 这类有序档位上打分，用于**排序**——你要的是"先看哪一节"，不是一段劝学文字。
  3. 教学建议文本由**代码模板**组装（用节点的标题/笔记填充），不依赖模型生成结构。
- **改动面**：`src/lib/ai.ts`（新增结构化判断层，替代 `extractJson`/`parseAiRecommendation`）、`src/app/api/ai/recommend/route.ts`（换数据源为 `pathNode`）。**接入 TypeSafe SDK 属于下载依赖，需先列清单批准**；API 凭据属红线，需你本人提供。
- **取舍**：这一步工作量大于 C1–C6，且依赖外部服务。建议放在前六项之后，作为独立一轮。

---

## 五、分级建议总表

| 级别 | 项 | 一句话 | 涉及 schema 变更 |
|---|---|---|---|
| **必改** | C1 | 首页改展示节点/笔记维度，空图表条件渲染 | 否 |
| **必改** | C2 | 笔记行内可见可编辑，编辑框加大 | 否 |
| **必改** | C3 | 掌握度/薄弱点/AI 建议数据源换成节点 | 是（NodeStatus 加 REVIEW） |
| **建议** | C4 | 打卡降为 1 步（节点行直接标记） | 否 |
| **建议** | C5 | 上传允许多种绑定顺序、文案加图片、下拉可搜索 | 可能（未绑定文件的生命周期） |
| **建议** | C6 | kind 枚举赋值或移除；导航加"学科" | 否 |
| **可选** | C7 | AI 建议改为结构化判断（TypeSafe Noul/Score） | 否（但需下载 SDK） |

### 建议的实施顺序

`C2 → C1 → C3`（这三个一起做效果最明显：笔记可见 → 首页有内容 → 统计口径打通），然后 `C6 → C5 → C4`，最后 `C7`。

---

## 六、明确不建议做的事

1. **不要为了"让知识点功能跑起来"而硬造知识点记录。** 那是让人的行为去迎合程序。C3 的方向是让程序去认你已经在用的东西（节点 + 笔记）。
2. **不要因为打卡为空就删掉打卡功能。** 用条件渲染把它让位即可——你处于"建结构"阶段，以后进入"刷题推进"阶段时它可能重新有用。
3. **不要给 5 层深树加"全部展开笔记"的默认态。** 会在最需要扫读的学科（人体结构与功能，47 个节点在 4–5 层）上把页面撑爆。
4. **不要在 C2/C4 之前重构 `TreeOutline` 的整体结构。** 它已经承担拖拽排序、增删改、知识点绑定、文件 chip、编辑弹窗五种职责；任何大改都应该先抽"节点行"组件，而不是先动逻辑。

---

## 附录：取证命令

数据均可复现（只读，不改库）。本次评估通过 Node + Prisma 直接执行以下查询，未写入任何数据。

关键查询：

```js
// 学科总览（含各模型计数）
prisma.subject.findMany({ include: { _count: { select: {
  pathNodes: true, knowledgePoints: true, files: true, checkIns: true, reviews: true } } } })

// 节点形态（状态 / kind / 深度分布）
prisma.pathNode.findMany({ select: { status: true, kind: true, parentId: true, note: true } })

// 打卡明细（含关联对象，用于确认绑定习惯）
prisma.checkIn.findMany({ include: { subject: true, pathNode: true, knowledgePoint: true } })

// 文件绑定关系
prisma.studyFile.findMany({ include: { pathNodes: true, subject: true } })
```

---

*本报告由 DSH 生成，数据快照取自评估当次的 `prisma/dev.db` 只读查询。*
