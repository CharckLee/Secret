"""Tab 3：分类统计 — 柱状图 + 统计表"""

import streamlit as st
import pandas as pd
from config import CATEGORIES, DB_PATH
from database import get_category_stats, get_available_months


def render() -> None:
    st.subheader("📊 分类统计")

    # ── 月份筛选 ──────────────────────
    months = get_available_months(DB_PATH)
    month_options = ["全部"] + months
    selected_month = st.selectbox("按月份筛选", month_options, key="stats_month")

    month_param = None if selected_month == "全部" else selected_month
    stats = get_category_stats(DB_PATH, month=month_param)

    if not stats:
        st.info("暂无数据，无法生成统计。")
        return

    # ── 构造 DataFrame ────────────────
    df = pd.DataFrame(stats)
    df.columns = ["分类", "笔数", "合计金额"]
    total_amount = df["合计金额"].sum()
    df["占比(%)"] = (df["合计金额"] / total_amount * 100).round(1)

    # ── 柱状图 ────────────────────────
    st.subheader("分类支出柱状图")
    chart_df = df.set_index("分类")[["合计金额"]]
    st.bar_chart(chart_df, use_container_width=True)

    # ── 统计表 ────────────────────────
    st.subheader("统计明细")
    display_df = df.copy()
    display_df["合计金额"] = display_df["合计金额"].apply(lambda x: f"¥{x:,.2f}")
    display_df["占比(%)"] = display_df["占比(%)"].apply(lambda x: f"{x}%")
    st.dataframe(display_df, use_container_width=True, hide_index=True)

    # 总计行
    st.metric("总支出", f"¥{total_amount:,.2f}")
