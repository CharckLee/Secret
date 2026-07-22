"""个人记账本 — Streamlit 主入口"""

import streamlit as st
from database import init_db
from pages.add_entry import render as render_add
from pages.view_entries import render as render_view
from pages.statistics import render as render_stats

# ── 页面配置 ──────────────────────────
st.set_page_config(
    page_title="个人记账本",
    page_icon="💰",
    layout="wide",
)

# ── 初始化数据库 ──────────────────────
init_db()

# ── 页面标题 ──────────────────────────
st.title("💰 个人记账本")

# ── 标签页 ────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "📝 添加记录",
    "📋 查看记录",
    "📊 分类统计",
])

with tab1:
    render_add()

with tab2:
    render_view()

with tab3:
    render_stats()
