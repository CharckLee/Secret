---
name: weekly-report-generator
description: >
  自动扫描 Git 提交记录和 TODO 变更，生成结构化周报 Markdown 文件。
  当用户提到"周报"、"weekly report"、"本周总结"、"上周总结"、"工作周报"、"生成周报"、"weekly summary"、"每周报告"时必须使用此技能。
  当用户想要查看本周或指定周的 Git 活动、TODO 变化、代码提交汇总时也要使用此技能。
compatibility:
  - Bash (git)
  - Read
  - Glob
  - Grep
---

# 周报生成器

扫描指定周的 Git 提交记录和 TODO 变更，生成结构化的周报 Markdown。

## 核心原则

- **内容优先于形式**：周报的价值在于准确的数据和清晰的分类，不要花哨的装饰
- **宁缺毋滥**：如果某周没有提交，如实报告不要编造
- **可追溯**：每条记录都要能回溯到具体 commit hash

## 工作流程

### 第一步：确定目标周

默认生成本周（当前自然周，周一起始）的周报。用户可以指定：
- "上周" → 上一自然周
- "第N周" → 指定 ISO 周编号
- 具体日期范围 → 按指定范围

用 Bash 计算日期范围：

```bash
# 计算本周一的日期（ISO 8601，周一为一周第一天）
dow=$(date +%u)  # 1=Mon, 7=Sun
days_since_monday=$((dow - 1))
monday=$(date -d "$days_since_monday days ago" +%Y-%m-%d)
sunday=$(date -d "$((7 - dow)) days" +%Y-%m-%d)
week_num=$(date +%V)  # ISO 周编号
year=$(date +%Y)

# 上一周
prev_monday=$(date -d "7 days ago" -d "$days_since_monday days ago" +%Y-%m-%d)
```

注意：计算日期时，所有 `date` 调用必须在同一个 shell 中执行，因为在单独命令之间 shell 变量会丢失。

### 第二步：收集 Git 提交记录

用一条复合命令收集所有 Git 数据，避免重复查询：

```bash
echo "===COMMITS===" && git log --since="$MONDAY" --until="$MONDAY_OF_NEXT_WEEK" --format="%h|%an|%ad|%s" --date=short --no-merges && echo "===DIFF_STATS===" && git log --since="$MONDAY" --until="$MONDAY_OF_NEXT_WEEK" --no-merges --format="" --stat --diff-filter=AMCR && echo "===TODO_DIFF===" && git log --since="$MONDAY" --until="$MONDAY_OF_NEXT_WEEK" -p --no-merges | grep -E "^[+-].*\b(TODO|FIXME|HACK|XXX|OPTIMIZE|BUG)\b" || echo "(no TODO changes found)"
```

解析要点：
- 如果 `===COMMITS===` 下面是空的（紧跟着 `===DIFF_STATS===`），说明本周无提交
- commit 行格式：`hash|author|date|message`
- DIFF_STATS 部分显示每个提交改动了哪些文件
- TODO_DIFF 显示增减行中的 TODO/FIXME/HACK/XXX/OPTIMIZE/BUG 标记

### 第三步：收集代码库 TODO 存量

用 Grep 扫描当前代码库中所有 TODO 注释：

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX\|OPTIMIZE\|BUG" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.rs" --include="*.go" --include="*.java" --include="*.c" --include="*.cpp" --include="*.h" --include="*.css" --include="*.scss" --include="*.html" --include="*.vue" --include="*.svelte" --include="*.rb" --include="*.php" --include="*.swift" --include="*.kt" --include="*.yaml" --include="*.yml" --include="*.toml" --include="*.md" .
```

排除 node_modules、.git、dist、build、__pycache__ 等目录（grep 默认不排除），如果项目有这些目录，添加 `--exclude-dir` 参数。

同时用 `wc -l` 统计每个标签的数量，获得汇总数据。

### 第四步：生成周报

在项目根目录输出文件，命名格式：`weekly-report-{year}W{week_num}.md`

如果日期范围跨两个月，加注两个月的名称。文件名示例：
- `weekly-report-2026W30.md`（7月20日 - 7月26日）
- `weekly-report-2026W05.md`（1月26日 - 2月1日）

## 周报模板

必须严格使用以下模板结构：

```markdown
# 周报：{week_label}（{date_range}）

> 生成时间：{generated_at}
> 仓库：{repo_name}（{branch}）

---

## 📊 概览

| 指标 | 数值 |
|------|------|
| 提交次数 | {commit_count} |
| 贡献者 | {author_count} 人 |
| 改动文件 | {changed_files_count} 个 |
| 新增 TODO | {new_todo_count} 个 |
| 解决 TODO | {resolved_todo_count} 个 |
| 代码库 TODO 存量 | {total_todo_inventory} 个 |

---

## 📝 提交记录

{如果没有提交，写："本周暂无代码提交。"}

{有提交时：}

| Hash | 作者 | 日期 | 描述 |
|------|------|------|------|
| `{short_hash}` | {author} | {date} | {message} |

---

## 📁 改动文件

{按提交分组，使用 DIFF_STATS 输出中的文件路径}

### {commit_hash} - {commit_message}
- `{file_path}` (+{additions} -{deletions})

---

## 🔧 TODO 变更

### 新增
{从 TODO_DIFF 中提取以 `+` 开头的行}

| 文件 | 行号 | 内容 |
|------|------|------|
| `{file}` | {line} | `{todo_text}` |

{没有新增时写："本周未新增 TODO。"}

### 已解决
{从 TODO_DIFF 中提取以 `-` 开头的行}

| 文件 | 行号 | 内容 |
|------|------|------|
| `{file}` | {line} | `{todo_text}` |

{没有解决时写："本周未解决已有 TODO。"}

---

## 📋 代码库 TODO 清单

{按类型分组列出当前代码库中所有 TODO 标记}

### TODO（{count} 个）
- `{file}:{line}` — {content}

### FIXME（{count} 个）
- `{file}:{line}` — {content}

### HACK（{count} 个）
- `{file}:{line}` — {content}

### 其他
{XXX, OPTIMIZE, BUG 等其余标签汇总}

{如果代码库中没有任何 TODO 标记，写："🎉 代码库中没有待办标记。"}

---

## 📌 备注

{如果有值得注意的事项，写在这里。例如：}
- 本周出现了同一天多个提交集中在同一个功能上，可能是迭代较快的特性开发
- TODO 数量较上周增长了 N%，建议关注是否需要安排清理任务
```

## 输出后确认

生成文件后，打印：
1. 文件路径
2. 报告摘要（提交数、TODO 变化数、文件大小）
3. 询问是否需要调整任何内容

## 边缘情况处理

- **本周无提交**：正常生成周报，概览数值为 0，提交记录写"本周暂无代码提交"，TODOs 部分只用 grep 当前库存
- **本周无 TODO 变更**：分别标注"本周未新增 TODO"和"本周未解决已有 TODO"，TODOs 清单仍列出当前库中的标记
- **Git 仓库很新（只有一个提交）**：不报错，正确处理 since/until 范围
- **跨月周**：日期范围会自然跨越月分界（如 1月30日 - 2月5日），文件名按 ISO 周编号命名
- **多仓库场景**：只在当前工作目录的 git 仓库中操作，不遍历子目录中的其他仓库

## 示例

**输入**：帮我生成这周的周报

**执行流程**：
1. 计算日期范围：今天是周二，所以周一=昨天，周日=5天后
2. `git log --since="2026-07-20" --until="2026-07-27" --format="..." --no-merges`
3. grep 代码库 TODO
4. 生成 `weekly-report-2026W30.md`
5. 告知用户文件路径和摘要
