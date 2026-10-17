# 个人记账本 (Personal Finance Tracker)

基于 Python Streamlit + SQLite3 的本地 Web 记账工具。

## 项目结构

```
finance.cli/
  app.py              # Streamlit 入口：页面配置 + 标题 + 3 个标签页
  config.py           # 常量：预设分类、数据库路径
  database.py         # 数据层：建表 + CRUD + 统计查询
  pages/              # 页面模块，每个文件暴露一个 render() 函数
    add_entry.py      # Tab 1：添加账目表单
    view_entries.py   # Tab 2：账目列表 + 筛选 + 删除
    statistics.py     # Tab 3：分类统计（柱状图 + 统计表）
  requirements.txt    # 依赖：streamlit
```

## 启动方式

```bash
pip install streamlit
streamlit run app.py
```

## 技术要点

- SQLite3 单表设计，CHECK 约束保障数据合法性
- 所有 SQL 查询使用 `?` 参数化，防注入
- Streamlit tabs 做页面导航，每次交互自动重新查询数据库
- 删除操作使用两步确认机制（先点删除 → 弹出警告 → 再点确认）

## 预设分类

餐饮、交通、购物、娱乐、居住、其他

## 功能

| 功能 | 说明 |
|------|------|
| 添加账目 | 金额、分类、日期、备注，表单提交 |
| 查看列表 | 按月份和分类筛选，表格展示 |
| 删除账目 | 输入 ID，两步确认删除 |
| 分类统计 | 柱状图 + 统计表（分类、笔数、合计、占比） |
