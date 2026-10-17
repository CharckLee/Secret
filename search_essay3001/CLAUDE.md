# LitMind · 技术说明

## 技术栈（固定不改）
Next.js 16 + TypeScript + Prisma + SQLite + TailwindCSS 4

## 常用命令
- `npm run dev` — 开发服务器 (端口 3001)
- `npx prisma studio` — 数据库管理界面
- `npx prisma db seed` — 重新播种示例数据
- `npx prisma migrate dev --name xxx` — 数据库迁移

## 开发约束
- 不做社区/社交/评论/会员/付费功能
- 不做复杂用户权限和管理员后台
- 纯本地项目，不用云端存储，不搞复杂部署
- 只做科研工具，不添加无关冗余功能

## 架构要点
- 全站 `'use client'`，无服务端组件
- 状态管理用 `useState` + URL params，不用 Redux/Zustand
- AI 调用走 `/api/ai/*` 代理，API Key 存在 `.env` 不暴露前端
- PDF 解析用 `pdfjs-dist` 客户端执行
- 笔记自动保存：2 秒 debounce
- 卡片 hover：`scale 1.02` + `shadow-lg` + `duration-200`

## 目录速查
```
src/app/api/           — API routes
src/components/        — UI 组件
src/lib/               — 工具库 (prisma, ai-service, citation, pdf-parser, utils)
src/types/index.ts     — 类型定义
prisma/schema.prisma   — 数据库模型
```
