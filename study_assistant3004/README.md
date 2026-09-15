# 知序 · 个人知识管理与学习路径系统

> 面向大学生、理工科与医学生的轻量化个人结构化学习管理工具。区别于待办清单与打卡工具，核心定位是**把零散学习内容变成结构化知识体系**，落地「路径规划 → 知识点沉淀 → 每日打卡 → 深度复盘 → 数据可视化 → AI 推荐」的完整学习闭环。

- 纯个人私域工具：无登录、无社交、无积分排行，数据本地持久化
- 统一学术简约 UI：圆角卡片 + 低饱和配色 + hover 放大阴影反馈

---

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 多学科分区 | 自由创建/编辑/删除学科，自定义名称与标签配色，各学科进度完全隔离，全局总进度汇总 |
| 树形学习路径 | 每个学科独立搭建可拖拽树形大纲，自由新增章节/子节点/阶段目标，调整学习顺序 |
| 结构化知识录入 | 标题、正文、备注、难度标签、掌握阶段、自定义标签，支持编辑/归档/封存 |
| 文件归档折算 | 批量上传 PDF/TXT/文档并绑定学科，标记学习状态，**已完成归档文件自动计入学科进度** |
| 精细化打卡 | 按节点/知识点打卡，记录时长与掌握状态（已掌握/部分掌握/待复习），连续打卡天数统计 |
| 学习复盘 | 今日收获/遗留疑问/明日计划/难点总结四段模板，与知识点、节点双向绑定 |
| 数据可视化 | 整体完成率、各学科学习占比、近 14 天时长趋势、知识点掌握度分布、薄弱点统计 |
| AI 学习建议 | 基于学科薄弱知识点，AI 汇总掌握情况并给出针对性学习方法 |

## 技术栈

- **框架**：Next.js 16（App Router）+ TypeScript
- **样式**：TailwindCSS v4
- **数据库**：Prisma + SQLite（本地持久化）
- **图表**：Recharts
- **树形拖拽**：@dnd-kit
- **AI**：DeepSeek API（OpenAI 兼容），未配置密钥时自动降级为本地规则推荐

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（生成 SQLite + Prisma Client）
npx prisma migrate dev

# 3. 启动开发服务器（端口 3004）
npm run dev
```

打开 http://localhost:3004 即可使用。

其他命令：

```bash
npm run build     # 生产构建
npm start         # 生产运行（端口 3004）
npm test          # 运行单元测试（Vitest）
npx prisma studio # 可视化查看数据库
```

## 环境变量

复制 `.env.example` 为 `.env`，按需配置：

```bash
# SQLite 数据库文件（相对 prisma 目录）
DATABASE_URL="file:./dev.db"

# DeepSeek API（AI 智能推荐），留空则自动降级为规则推荐
DEEPSEEK_API_KEY=""
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

> `DEEPSEEK_API_KEY` 留空不影响核心功能使用，仅 AI 推荐走本地规则降级。

## 数据模型

7 张核心表（`prisma/schema.prisma`）：

- `Subject` 学科：名称、标签配色、描述
- `KnowledgePoint` 知识点：标题、正文、备注、难度、掌握阶段、自定义标签、归档
- `PathNode` 树形节点：自关联 `parentId` 构成树，`order` 排序，状态（未开始/学习中/已完成），多对多绑定知识点与文件
- `StudyFile` 归档文件：文件名、磁盘路径、类型、大小、状态（待学习/学习中/已完成/重点归档）
- `CheckIn` 打卡：日期、时长、掌握状态，绑定节点或知识点
- `Review` 复盘：今日收获/遗留疑问/明日计划/难点总结，双向绑定

## 进度计算口径

- **学科完成率** = `(已完成节点 + 已掌握知识点 + 已完成文件) / (节点总数 + 知识点总数 + 文件总数)`
- 归档文件 `COMPLETED` 与 `KEY_ARCHIVE` 均计为完成，打通「资料归档 = 有效学习进度」
- 全局进度按各学科项目数加权汇总
- 连续打卡按日期去重、跨天连续计数；已掌握打卡会自动高亮对应节点/知识点

## 目录结构

```
src/
├── app/
│   ├── page.tsx                 # 首页工作台
│   ├── subjects/[id]/page.tsx   # 学科独立详情页
│   ├── knowledge/page.tsx       # 知识仓库 + 文件归档
│   ├── checkin/page.tsx         # 打卡与复盘中心
│   └── api/                     # REST 路由（subjects/knowledge-points/path-nodes/files/checkins/reviews/stats/ai）
├── components/
│   ├── ui/                      # 基础组件（Card/Button/Modal/Badge 等）
│   ├── path/TreeOutline.tsx     # 可拖拽树形大纲
│   ├── charts/ChartsSection.tsx # 可视化看板
│   ├── ai/AiRecommendPanel.tsx  # AI 学习建议面板
│   └── ...                      # 各业务组件
├── lib/
│   ├── prisma.ts                # Prisma 单例
│   ├── progress.ts              # 进度计算（纯函数，有单测）
│   ├── ai.ts                    # DeepSeek 客户端 + 结果解析（有单测）
│   └── ...
└── types/                       # 共享类型
```

## 创新亮点（作品集/答辩）

1. **知识体系构建，而非记事打卡**：维度高于普通待办工具，学术感更强
2. **树形学习路径是稀缺功能**：绝大多数学生工具没有，答辩亮点极强
3. **完整闭环**：规划 → 学习 → 打卡 → 复盘 → 数据反馈 → AI 推荐，体系完整
4. **文件归档 = 进度**：解决「只存文件不学习、进度无法量化」的痛点
5. **技术栈现代、代码整洁**：纯函数逻辑带单元测试，适合作为主打作品集项目
