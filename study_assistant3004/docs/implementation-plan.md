# 知序 · 实施计划（5 轮）

> 本文是 `docs/architecture-review.md` 的执行版：评估报告给出"哪里错了"，这份计划给出"具体改什么、按什么顺序、怎么验收"。
>
> **状态：5 轮全部完成**（`c07cdbb` · `d257c06` · `e6e897f` · `530e25e` · `fcabed4`）。
>
> 每轮格式：**要改的文件 → 每个文件改什么 → 验收方式 → 风险**。

---

## 一、决策基线（已确认，不再重议）

这些是从多轮讨论中固化下来的决定，后续所有工作以此为准。

| # | 决策 | 内容 |
|---|---|---|
| D1 | `LEARNING` 状态来源 | 那 8 个是**点标题被动产生**的，不是有意标记 |
| D2 | 学习单位 | **一节**（叶子节点），不是一章 |
| D3 | 状态语义 | 改为**由人显式设置**，点标题不再自动改状态 |
| D4 | 未归档判定 | **没绑定就算未归档**（`pathNodes` 为空），**不加数据库字段** |
| D5 | 未归档来源 | **两条路都要**：上传时可选"暂不归档" + 从节点解绑时转入 |
| D6 | 未归档入口 | 知识仓库 tab，**带数量徽标**（`归档文件 ｜ 未归档 (3)`） |
| D7 | 知识点处置 | **彻底删除**（含 DROP 表）；打卡、复盘保留 |
| D8 | AI 参考资料 | **图片内容**（DeepSeek 视觉模型）+ **节点笔记** |
| D9 | AI 取材范围 | **按学科范围取**（首页取各学科"正在学"，学科页取本学科） |
| D10 | 历史状态修复 | 那 8 个被动 `LEARNING` **重置为未开始** |
| D11 | 仓库准备 | 补根 `.gitignore` 规则；修 lint |
| D12 | 视觉模型 | `DeepSeek-V4-Flash-Vision-Exp` |

---

## 二、执行顺序与理由

```
第 1 轮  删除知识点功能        ← 先做，因为它和第 3 轮要改同一批文件
第 2 轮  未归档区              ← 依赖第 1 轮的 tab 容器
第 3 轮  继续学习 + 笔记可见    ← 依赖第 1 轮清理后的统计口径
第 4 轮  gitignore + lint      ← 独立，随时可做
第 5 轮  AI 视觉改造           ← 最后做，依赖第 3 轮产出的节点数据
```

**为什么第 1 轮排最前**：删知识点要动 `progress.ts` / `stats` / `HomeDashboard` / `ChartsSection` / `TreeOutline`；而第 3 轮"继续学习 + 笔记可见"也要动同一批文件。**先删后改，同一批文件只改一遍。**

---

## 第 1 轮 · 删除知识点功能 ✅ 已完成

> **验收（commit `c07cdbb`）**：vitest 33 绿 · `tsc` exit 0 · `next build` 成功 · 4 个页面 + 5 个接口全部 200 · 数据零变化（学科 4 / 节点 177 / 笔记 130 / 文件 3 / 打卡 0 / 复盘 0）· 源码零残留 · lint 问题数 13→12（无新增）
>
> 下方 checkbox 保留为原始计划记录，未逐条勾选。

**工具**：`read` · `edit` · `write` · `pwsh`（prisma / vitest / tsc / eslint / dev server）· `todo_write`

### 步骤 0 — 备份（DROP 前硬要求）

- [ ] 复制 `prisma/dev.db` → 备份副本（DROP TABLE 不可逆）

### 步骤 1 — 确认性读取（改之前看清这几个文件）

- [ ] `src/components/knowledge/KnowledgeForm.tsx`
- [ ] `src/components/review/ReviewForm.tsx`
- [ ] `src/app/api/knowledge-points/route.ts`
- [ ] `src/app/api/knowledge-points/[id]/route.ts`
- [ ] `src/app/api/subjects/route.ts`
- [ ] `src/lib/ai.test.ts`

### 步骤 2 — 数据层

| 文件 | 改什么 |
|---|---|
| `prisma/schema.prisma` | 删 `KnowledgePoint` model；删 `Difficulty`、`MasteryStage` 枚举；删 `Subject.knowledgePoints`、`PathNode.knowledgePoints`、`CheckIn.knowledgePointId`、`Review.knowledgePointId` |
| migration | `prisma migrate dev --name remove-knowledge-points` → DROP `KnowledgePoint` 表 + `_KnowledgePointToPathNode` 关联表 + 2 个外键列 |

### 步骤 3 — 后端

| 文件 | 改什么 |
|---|---|
| `api/knowledge-points/route.ts` | **删除文件** |
| `api/knowledge-points/[id]/route.ts` | **删除文件** |
| `api/path-nodes/[id]/route.ts` | 删 `knowledgePoints: { set }` 逻辑 |
| `api/checkins/route.ts` | 删 `knowledgePointId` 写入 |
| `api/reviews/route.ts` | 删 `knowledgePointId` 写入 |
| `api/stats/route.ts` | 删 `mastery`、`weakPoints` 两段查询与返回字段 |
| `lib/progress.ts` | 删 `isWeakPoint`、`filterWeakPoints`、`totalKnowledge` / `masteredKnowledge` / `knowledgeRate` |
| `lib/queries.ts` | 删 knowledgePoints include、mastery / weakPoints |
| `lib/ai.ts` + `api/ai/recommend/route.ts` | 数据源**临时**改为 `PathNode`（LEARNING 节点 + 空笔记节点），保证功能不空窗；第 5 轮再上视觉 |

### 步骤 4 — 前端

| 文件 | 改什么 |
|---|---|
| `types/index.ts` | 删 `Difficulty`、`MasteryStage` 及两个 LABELS |
| `types/api.ts` | 删 `KnowledgePointItem`；`SubjectProgressShape` 去掉 knowledge 字段 |
| `components/knowledge/KnowledgeForm.tsx` | **删除文件** |
| `components/KnowledgeWarehouse.tsx` | 去掉"知识点"tab（tab 容器保留给第 2 轮的"未归档"） |
| `components/SubjectDetail.tsx` | 去掉"知识点"tab |
| `components/charts/ChartsSection.tsx` | 删"知识点掌握度分布"图（三图变两图） |
| `components/path/TreeOutline.tsx` | 删"绑定知识点"区块与 `knowledgePoints` prop |
| `components/checkin/CheckInForm.tsx` | 删知识点下拉与相关 state |
| `components/review/ReviewForm.tsx` | 删知识点下拉与相关 state |

### 步骤 5 — 测试

- [ ] 修 `lib/progress.test.ts`、`lib/ai.test.ts` 里涉及知识点的断言

### 验收

- [ ] `npx vitest run` 全绿
- [ ] `npx tsc --noEmit` = 0
- [ ] 定向 `eslint`（改动文件）= 0
- [ ] `/`、`/knowledge`、`/checkin`、`/subjects/[id]` 全部 HTTP 200，界面上不再出现"知识点"
- [ ] DB 校验：`KnowledgePoint` 表已消失；节点仍 **177**、打卡 **0**、复盘 **0**（零改动）

### 风险

- migration 是 DROP TABLE，**不可逆** → 步骤 0 备份是硬要求
- 你此前"绑定知识点的节点数 = 0"，所以关系数据无损失

---

## 第 2 轮 · 未归档区 ✅ 已完成

> **验收（commit `d257c06`）**：vitest 34 绿（新增 `path.test.ts` 6 个）· `tsc` exit 0 · `next build` 成功 · 端到端 **18/18 PASS**（上传不绑定→进未归档、从节点解绑→回到未归档且**不被删除**、统计排除未归档、归档回节点）· 数据零变化 · lint 无新增
>
> 超出原清单的改动：`GET /api/path-nodes` 的 `subjectId` 改为可选（供"归档到节点"的分组选择器）；`PATCH /api/files/[id]` 改为**仅在显式传 status 时**才改状态（否则归档时会误重置状态）。
>
> **补充（commit `73c31a6`）**：删除学习节点时**不再自动删文件**。改为弹窗二选一——默认「转入未归档并删除」，也可选「连带删除文件」（后端 `DELETE /api/path-nodes/[id]?deleteFiles=true`）。端到端 **23/23 PASS**，两条路径都实测：默认路径文件进未归档且磁盘文件保留，`deleteFiles=true` 路径记录与磁盘文件一并清除。

**工具**：同第 1 轮

### 关键语义变更

> **"从节点移除文件"不再等于"删除"，而是转入未归档区。**

这需要**回退**第 1 轮之前那次修复里加的"解绑即删"逻辑。这不是 bug 回归，因为你的原始诉求（"移除的文件不该出现在归档列表和统计里"）由两条规则同时满足：

| 状态 | 归档文件列表 | 进度统计 | 位置 |
|---|---|---|---|
| 已绑定节点 | 显示 | 计入 | 归档文件 |
| 无绑定 | **不显示** | **不计入** | **未归档区（新）** |

### 步骤

| # | 文件 | 改什么 |
|---|---|---|
| 1 | `api/path-nodes/[id]/route.ts` | 回退"解绑即删" → 只解绑、不删记录、不删磁盘文件 |
| 2 | `lib/utils.ts` + `utils.test.ts` | `diffRemovedIds` 失去用途（不再需要找出被解绑的文件）→ 删函数与测试 |
| 3 | `api/files/route.ts` | `POST` 放宽：`pathNodeIds` 允许为空（= 未归档）；`GET` 增加 scope 区分并返回未归档数量 |
| 4 | `api/files/[id]/route.ts` | 新增"绑定到节点"能力（未归档 → 归档） |
| 5 | `components/KnowledgeWarehouse.tsx` | `归档文件 ｜ 未归档 (3)` tab，带数量徽标 |
| 6 | `components/file/FileList.tsx` | 支持未归档模式：显示"绑定节点""删除"操作 |
| 7 | `components/file/FileUpload.tsx` | 加"暂不归档"选项；下拉加搜索 |
| 8 | 统计层 | **不动** —— `pathNodes: { some: {} }` 过滤保留，未归档天然不计入 |

### 验收

- [ ] 上传时可不选节点 → 文件进入未归档
- [ ] 从节点解绑文件 → 进入未归档（**不再被删除**）
- [ ] 未归档文件不出现在"归档文件"列表，不计入进度与统计
- [ ] 未归档文件可"绑回节点" → 转入归档
- [ ] 未归档文件可手动删除
- [ ] tab 徽标数量与实际一致

---

## 第 3 轮 · 首页"继续学习" + 笔记可见 ✅ 已完成

> **验收（commit `e6e897f`）**：vitest **41 绿**（`path.ts` 新增 5 个纯函数 / 21 个新测试，先见红灯再转绿）· `tsc` exit 0 · `next build` 成功 · 端到端 **18/18 PASS** · lint 12（基线，零新增）
>
> **数据修复**：8 个被"点标题"误标的 `LEARNING` 已重置为 `NOT_STARTED`（现在 177 个节点全为未开始）。
>
> **实际落地**：首页新增「继续学习」区（每学科一条，可一键「标记在学」/「学完这节」）· 统计改为节点维度（已学 X/**132** 节、写过笔记的节点 **130**）· 点标题改为折叠 / 展开，新增显式「开始学习」按钮（状态只由人主动设置）· 节点笔记行内可见、点击就地编辑、失焦保存 · 无数据的图表整块不渲染。

**工具**：`skill(test-driven-development)` · `read` · `edit` · `write` · `pwsh` · `todo_write`

### 步骤

| # | 文件 | 改什么 |
|---|---|---|
| 1 | `lib/path.ts`（新增）+ `lib/path.test.ts`（新增） | 纯函数：按树序找"下一个未完成叶子"、节点 → "继续学习"条目（含父链路径）。**先写测试见红，再实现** |
| 2 | `lib/queries.ts` | 新增 `getContinueLearning()`（正在学节点 + 树路径 + 笔记摘要）与节点维度统计（已学 / 总节数 / 有笔记数） |
| 3 | `app/page.tsx` + `components/HomeDashboard.tsx` | 顶部改「继续学习」区；进度改用节点计算，**不再依赖打卡** |
| 4 | `components/charts/ChartsSection.tsx` | 无数据的图表**不渲染**（去掉"暂无数据"占位） |
| 5 | `components/path/TreeOutline.tsx` | ①点标题只展开、**不再改状态**；②"开始学习"改显式动作；③节点行内显示笔记摘要；④点摘要就地编辑（自动增高）；⑤抽出 `NodeRow` 子组件 |
| 6 | 数据修复 | 8 个被动 `LEARNING` → `NOT_STARTED` |

### 设计要点

- **"今天学哪节"采用混合策略**：默认按树序自动推荐下一节（零摩擦）；你也可以把任意节点显式标成"正在学"来覆盖推荐。兼顾 D2（一节）与 D3（有意设置）。
- 深树（5 层）下**不做**"全部展开笔记"的默认态，只显示摘要、按需展开。

### 验收

- [ ] 新纯函数单测先见红、再转绿
- [ ] 全量 `vitest` 绿 · `tsc` = 0 · 定向 lint = 0
- [ ] 首页顶部显示「继续学习」
- [ ] 树上能看到笔记摘要，并能就地编辑
- [ ] 点标题**不再**改变节点状态
- [ ] 8 个 `LEARNING` 已重置为未开始
- [ ] 既有数据零改动

---

## 第 4 轮 · gitignore + lint ✅ 已完成

> **验收（commit `530e25e`）**：`npm run lint` **从 12 problems 清到 0**（exit 0）· `tsc` exit 0 · vitest **64 绿** · `next build` 成功 · 4 个页面 200 · `smoke-progress.mjs` 实跑通过 · 数据零变化
>
> **根 `.gitignore`**：`Secret/`（第 4 行）、`SKILLS/`、`minimall3002/`、`finance.cli8501/`、`Cinema-DNA/` 全部命中；已跟踪的 `study_assistant3004` / `paper_assistant3003` 未受影响。`git status` 不再出现这些目录。
>
> **lint 修法**：11 个 `react-hooks/set-state-in-effect` 用两种官方模式消除 —— ①「渲染期调整 state」（`if (dep !== prevDep) { setPrevDep(dep); ... }`）用于表单打开重置与 props→state 同步；② `queueMicrotask` 用于 `useApi` 的加载态（保留行为同时避开 effect 同步路径）。另修 `smoke-progress.mjs` 的 unused var，并同步了它因口径改名而过时的字段名。

| # | 文件 | 改什么 |
|---|---|---|
| 1 | `D:\AI Vibecoding\.gitignore` | 补 `Secret/`、`SKILLS/`、`minimall3002/`、`finance.cli8501/`、`Cinema-DNA/` 忽略规则（**只加规则，不动已有内容**；工作区外 → 已提权写入） |
| 2 | 8 个文件 | 修 11 个 `react-hooks/set-state-in-effect` + 1 个 unused var |

### 验收

- [ ] `git -C "D:\AI Vibecoding" check-ignore` 对上述目录全部命中
- [ ] `npm run lint` 输出干净
- [ ] 重跑 `vitest` / `tsc` 确认没碰坏业务

---

## 第 5 轮 · AI 学习建议（视觉 + 节点内容）✅ 已完成

> **验收（commit `fcabed4`）**：实测 AI 能读到图片与笔记 · 学科级调用只吃本学科资料 · **缓存命中 26–29ms**（首次 13–46 秒）· vitest **69 绿** · tsc / lint 均 0 · `next build` 成功 · 数据零变化
>
> **探测结论（推翻了原假设）**：`DeepSeek-V4.1-Flash` 与 `DeepSeek-V4-Flash-Vision-Exp` **都不是有效模型名**（接口 400，并列出真实可用名：`deepseek-flash`、`deepseek-v4-pro`）。实测 **`deepseek-chat` 会被路由到 `deepseek-flash`，它原生支持图片**；`deepseek-v4-pro` 则明确不支持。图片传参用标准 OpenAI `image_url` + base64 data URL。
>
> **落地**：`.env` 显式声明 `DEEPSEEK_MODEL="deepseek-flash"` · 按学科取该学科的**图片**（上限 4 张 / 单图 2MB）+ 他**已写的笔记**（上限 60 条）一并送入 · 进程内按学科缓存（键 = 学科 + 节点最后更新时间 + 图片集合）· 面板显示取材范围与缓存命中状态。
>
> **验收中发现并修掉的缺陷**：待推进节点定义为「正在学 / 尚无笔记」，而 8 个误标状态被重置后，待推进节点全是空笔记的 → 首版实现下 **130 条笔记一条都没进 prompt**。已改为同时附带「已写笔记」作为背景资料。

**这一轮有一个必须由你参与的前置步骤。**（已完成）

### 步骤 0 — 前置验证（需你参与）

在写任何代码前，先用一张真实图片发**一次最小验证请求**，确认三件事：

1. 模型名 `DeepSeek-V4-Flash-Vision-Exp` 在接口里的确切写法
2. 端点是否就是 `https://api.deepseek.com` 的 `/chat/completions`
3. 图片传参格式（标准 OpenAI `image_url` + base64 data URL，还是别的字段）

**验证不通过就停下来问你或查官方文档，不猜格式、不硬写。**

### 步骤

| # | 文件 | 改什么 |
|---|---|---|
| 1 | `.env` | 视验证结果补 `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`（当前 `.env` 只有 2 行，缺这两项，代码靠默认值兜底） |
| 2 | `lib/ai.ts` | 调用改为视觉模型；输入 = 本学科图片 + 本学科节点笔记；输出结构化 |
| 3 | `api/ai/recommend/route.ts` | 数据源 = `PathNode` + `StudyFile`，**按学科范围取** |
| 4 | 缓存 | 按学科缓存；笔记与状态未变则复用结果，避免重复读图与重复计费 |

### 验收

- [ ] 最小验证请求返回预期结构
- [ ] 学科页只吃该学科的图片与节点
- [ ] 同一学科重复请求命中缓存，不重复调用
- [ ] 无图片或无笔记的学科有合理降级（不报错、不空转）

---

## 三、需要你参与 / 决定的

| # | 事项 | 卡在哪一步 | 说明 |
|---|---|---|---|
| 1 | **`.env` 里的两个 API key** | 已处理，待你确认 | 原值 `sk-e586…`，新值 `sk-65ba…`，已按授权替换。若你想恢复原值、或两个 key 各有用途（如视觉专用），告诉我 |
| 2 | **两个 key 建议轮换** | 收尾时 | 两者都出现在本次会话记录里，建议项目调试完后在 platform.deepseek.com 各轮换一次 |
| 3 | **视觉调用格式验证** | 第 5 轮步骤 0 | 可以用你给的最小验证请求，也可以授权我查官方文档 |
| 4 | **每轮开工批准** | 每轮开始时 | 未获明确同意不动手 |

---

## 四、数据基线（验收对照用）

```
学科 4：人体结构与功能 78 节点 | 生命科学基础 50 | 医学统计学 28 | 概率论与数理统计 21
节点 177：NOT_STARTED 169 | LEARNING 8 | COMPLETED 0
笔记：130/177（73%），总 5593 字
文件 3：全为 jpg 图片，各绑定 1 个节点
知识点 0 | 复盘 0 | 打卡 0
```

第 1 轮结束后，这张表里**只有 `KnowledgePoint` 表消失**，其余数字必须一字不变。

---

## 五、评估报告后续项（C4 / C5 / C6 / C7）

> 前 5 轮消化了 C1、C2、C3。本节记录剩下的评估建议。

### C6 · `kind` 赋予含义 + 学科入口 ✅ 已完成

**发现（改之前）**：`kind` 是死字段 —— 全项目只有"表单能选、API 能存"，树渲染一处都不读它；而且它的 177 行**全是默认值 `chapter`**，表单里的选项值还是 `node`/`milestone`（与 schema 实际使用的 `section`/`point` 对不上）。

**做法**：

1. `kindVisual()` 把 kind 映射成树上视觉：章 = 加粗 + 蓝竖条 / 节 = 中等字重 / 点 = 前置圆点；未知或空值兜底为"点"
2. `inferKind()` 让**新建节点按父节点自动定类型**（顶层=章 → 节 → 点 → 点），移动节点时**级联重算整棵子树**
3. 表单移除手选「类型」下拉（客户端传 `kind` 会被忽略），改为只读提示
4. 按层级**回填**历史数据：`24 章 / 58 节 / 95 点`
5. 新建 `/subjects` 学科列表页，导航加「学科」
6. 「知识仓库」正名为「文件仓库」（含首页快捷入口，以及打卡页提到已删知识点的过时文案）

**验收**：vitest **85 绿** · `tsc` 0 · `lint` 0 · `next build` 成功 · 端到端 **13/13 PASS**（含章/节/点样式实际渲染、自动推断、以及"客户端伪造 kind 被忽略"）

**commits**：`1b0d33d`（视觉）· `f6526bb`（学科页 + 改名）· `b584ff6`（自动推断）

### C5 · 上传流程放开 / C4 · 打卡降摩擦 —— 未开始

用户决定**暂不开始 C5**。

---

*本计划由 DSH 生成，与 `docs/architecture-review.md` 配套使用。*
