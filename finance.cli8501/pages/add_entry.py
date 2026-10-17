"""Tab 1：添加账目表单"""

import streamlit as st
from config import CATEGORIES, DB_PATH
from database import add_entry


def render() -> None:
    st.subheader("📝 添加新记录")

    with st.form("add_form", clear_on_submit=True):
        col1, col2, col3 = st.columns(3)

        with col1:
            amount = st.number_input(
                "金额", min_value=0.01, step=0.01, format="%.2f",
                help="请输入大于 0 的金额"
            )
        with col2:
            category = st.selectbox("分类", CATEGORIES)
        with col3:
            date = st.date_input("日期")

        notes = st.text_area("备注（选填）", max_chars=200, placeholder="例如：午餐、地铁充值...")

        submitted = st.form_submit_button("添加记录", type="primary", use_container_width=True)

        if submitted:
            if amount <= 0:
                st.error("金额必须大于 0")
            else:
                entry_id = add_entry(DB_PATH, amount, category, str(date), notes)
                st.success(f"添加成功！记录编号：{entry_id}")
                st.rerun()
