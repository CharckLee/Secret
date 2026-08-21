# 论文写作辅助与格式标准化工具

面向毕业论文初稿阶段的轻量化本地 Web 辅助工具。文稿处理全部在浏览器本地完成，仅 AI 润色功能联网调用大模型接口。

## 功能

- **文稿编辑**：粘贴 / 导入 `.txt` / `.docx`（mammoth 本地解析），在线编辑，自动保存
- **格式校验**：标题层级、连续空行等规范检测，附修改建议；一键排版清理
- **参考文献标准化**：批量粘贴知网/万方/百度学术条目，自动识别类型并转为 GB/T 7714-2015 顺序编码制
- **AI 学术润色**：选段润色，双栏对比，采纳替换（调用 DeepSeek，严格保留数据与结论）
- **文稿语义相似片段自查**：浏览器端 bge-small-zh-v1.5 语义向量 + N-Gram 字面匹配，识别文字不同、含义相近的片段；离线时自动降级为字面匹配

## 能力边界

本工具无全网学术数据库，仅用于初稿辅助自查，不等同、不可替代学校官方的论文相似度检测系统；文稿不云端留存。

## 技术栈

Next.js 16（App Router, Turbopack）· TypeScript · TailwindCSS v4 · Dexie（IndexedDB）· mammoth · @huggingface/transformers · vitest

## 启动

```bash
npm install
npm run dev    # http://localhost:3003
```

## 配置（仅润色功能需要）

复制 `.env.example` 为 `.env.local`，填入 DeepSeek key：

```bash
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

不配置也可使用除润色外的全部功能。

## 测试与构建

```bash
npm test          # vitest 单测（lib/ 纯逻辑）
npm run build     # 生产构建
npm run lint      # ESLint
```
