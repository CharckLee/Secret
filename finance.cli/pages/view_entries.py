"""Tab 2：账目列表 + 按月份/分类筛选 + 删除"""

import streamlit as st
from config import CATEGORIES, DB_PATH
from database import get_entries, get_available_months, delete_entry


def render() -> None:
    st.subheader("📋 账目列表")

    # ── 筛选区 ────────────────────────
    months = get_available_months(DB_PATH)
    month_options = ["全部"] + months
    category_options = ["全部"] + CATEGORIES

    col1, col2 = st.columns(2)
    with col1:
        selected_month = st.selectbox("按月份筛选", month_options, key="view_month")
    with col2:
        selected_category = st.selectbox("按分类筛选", category_options, key="view_category")

    # ── 查询与展示 ────────────────────
    month_param = None if selected_month == "全部" else selected_month
    cat_param = None if selected_category == "全部" else selected_category

    entries = get_entries(DB_PATH, month=month_param, category=cat_param)

    if not entries:
        st.info("暂无记录，请先添加账目。")
        return

    st.caption(f"共 {len(entries)} 条记录")

    # 构造表格数据
    table_data = []
    for e in entries:
        table_data.append({
            "ID": e["id"],
            "日期": e["date"],
            "分类": e["category"],
            "金额": f"¥{e['amount']:.2f}",
            "备注": e["notes"],
        })

    st.dataframe(table_data, use_container_width=True, hide_index=True)

    # ── 删除区 ────────────────────────
    st.divider()
    st.subheader("🗑️ 删除记录")

    delete_id = st.number_input("输入要删除的记录 ID", min_value=1, step=1, key="delete_id")

    if "confirm_delete" not in st.session_state:
        st.session_state.confirm_delete = False

    if st.button("删除", type="secondary"):
        if delete_id > 0:
            st.session_state.confirm_delete = True
        else:
            st.error("请输入有效的记录 ID")

    if st.session_state.confirm_delete:
        st.warning(f"确认删除记录 #{delete_id}？此操作不可撤销。")
        col_yes, col_no = st.columns(2)
        with col_yes:
            if st.button("确认删除", type="primary"):
                affected = delete_entry(DB_PATH, delete_id)
                if affected > 0:
                    st.success(f"记录 #{delete_id} 已删除")
                else:
                    st.error(f"未找到 ID 为 {delete_id} 的记录")
                st.session_state.confirm_delete = False
                st.rerun()
        with col_no:
            if st.button("取消"):
                st.session_state.confirm_delete = False
                st.rerun()
