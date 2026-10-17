"""个人记账本 — 数据层：SQLite3 建表、CRUD、统计查询"""

import sqlite3
from config import DB_PATH


def _connect(db_path: str = DB_PATH) -> sqlite3.Connection:
    """创建数据库连接"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # 查询结果可以用列名访问
    return conn


# ── 初始化 ──────────────────────────────────────────────

def init_db(db_path: str = DB_PATH) -> None:
    """创建数据库和表（如果不存在）"""
    conn = _connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS entries (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            amount     REAL    NOT NULL CHECK(amount > 0),
            category   TEXT    NOT NULL CHECK(category IN ('餐饮','交通','购物','娱乐','居住','其他')),
            date       TEXT    NOT NULL,
            notes      TEXT    DEFAULT '',
            created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
        )
    ''')
    conn.commit()
    conn.close()


# ── 增 ──────────────────────────────────────────────────

def add_entry(db_path: str, amount: float, category: str, date: str, notes: str) -> int:
    """添加一条账目，返回新记录的 ID"""
    conn = _connect(db_path)
    cursor = conn.execute(
        'INSERT INTO entries (amount, category, date, notes) VALUES (?, ?, ?, ?)',
        (amount, category, date, notes)
    )
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id


# ── 查 ──────────────────────────────────────────────────

def get_entries(db_path: str, month: str = None, category: str = None) -> list[dict]:
    """查询账目列表，支持按月、按分类筛选"""
    conn = _connect(db_path)
    query = 'SELECT id, amount, category, date, notes FROM entries WHERE 1=1'
    params = []

    if month:
        query += ' AND date LIKE ?'
        params.append(f'{month}%')  # month 格式如 '2026-07'

    if category:
        query += ' AND category = ?'
        params.append(category)

    query += ' ORDER BY date DESC, id DESC'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_available_months(db_path: str) -> list[str]:
    """获取有记录的所有月份（降序）"""
    conn = _connect(db_path)
    rows = conn.execute(
        "SELECT DISTINCT substr(date, 1, 7) AS month FROM entries ORDER BY month DESC"
    ).fetchall()
    conn.close()
    return [row['month'] for row in rows]


# ── 删 ──────────────────────────────────────────────────

def delete_entry(db_path: str, entry_id: int) -> int:
    """按 ID 删除记录，返回受影响的行数（0 或 1）"""
    conn = _connect(db_path)
    cursor = conn.execute('DELETE FROM entries WHERE id = ?', (entry_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected


# ── 统计 ────────────────────────────────────────────────

def get_category_stats(db_path: str, month: str = None) -> list[dict]:
    """按分类汇总：返回每个分类的笔数和合计金额"""
    conn = _connect(db_path)
    query = '''
        SELECT category, COUNT(*) AS count, SUM(amount) AS total
        FROM entries
        WHERE 1=1
    '''
    params = []

    if month:
        query += ' AND date LIKE ?'
        params.append(f'{month}%')

    query += ' GROUP BY category ORDER BY total DESC'
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ── 自测 ────────────────────────────────────────────────

if __name__ == '__main__':
    import os
    test_db = 'test_finance.db'

    # 清理旧测试库
    if os.path.exists(test_db):
        os.remove(test_db)

    init_db(test_db)
    print('[OK] 数据库初始化成功')

    # 添加测试数据
    test_data = [
        (35.50, '餐饮', '2026-07-20', '午餐'),
        (128.00, '购物', '2026-07-21', '超市采购'),
        (15.00, '交通', '2026-07-22', '地铁'),
        (80.00, '娱乐', '2026-06-15', '电影'),
        (2000.00, '居住', '2026-07-01', '房租'),
    ]
    for amount, cat, date, notes in test_data:
        eid = add_entry(test_db, amount, cat, date, notes)
        print(f'[OK] 添加记录 #{eid}: {cat} CNY{amount:.2f}')

    # 查询全部
    all_entries = get_entries(test_db)
    print(f'[OK] 共 {len(all_entries)} 条记录')

    # 按月筛选
    july = get_entries(test_db, month='2026-07')
    print(f'[OK] 7月有 {len(july)} 条记录')

    # 可用月份
    months = get_available_months(test_db)
    print(f'[OK] 可用月份: {months}')

    # 分类统计
    stats = get_category_stats(test_db, month='2026-07')
    for s in stats:
        print(f'  {s["category"]}: {s["count"]}笔 CNY{s["total"]:.2f}')

    # 删除
    deleted = delete_entry(test_db, 1)
    print(f'[OK] 删除记录 #1: {"成功" if deleted else "失败"}')

    # 清理
    os.remove(test_db)
    print('[OK] 测试通过，测试库已清理')
