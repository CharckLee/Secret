"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrderStatusLabel } from "@/lib/utils";

// 类型定义
interface Order {
  id: number;
  status: string;
  total: number;
  discount: number;
  address: string;
  receiver: string;
  phone: string;
  createdAt: string;
  user: { id: number; name: string; email: string };
  items: {
    id: number;
    quantity: number;
    price: number;
    product: { id: number; name: string };
  }[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 状态样式
function getStatusStyle(status: string): string {
  switch (status) {
    case "PENDING": return "bg-amber-50 text-amber-600";
    case "PAID": return "bg-blue-50 text-blue-600";
    case "SHIPPED": return "bg-purple-50 text-purple-600";
    case "COMPLETED": return "bg-green-50 text-green-600";
    case "CANCELLED": return "bg-gray-100 text-gray-500";
    default: return "bg-gray-100 text-gray-500";
  }
}

// 当前状态下可执行的操作按钮
function getAllowedActions(
  status: string
): { label: string; targetStatus: string; style: string }[] {
  switch (status) {
    case "PENDING":
      return [
        { label: "设为已支付", targetStatus: "PAID", style: "bg-blue-600 hover:bg-blue-700" },
        { label: "取消订单", targetStatus: "CANCELLED", style: "bg-gray-500 hover:bg-gray-600" },
      ];
    case "PAID":
      return [
        { label: "设为已发货", targetStatus: "SHIPPED", style: "bg-purple-600 hover:bg-purple-700" },
        { label: "取消订单", targetStatus: "CANCELLED", style: "bg-gray-500 hover:bg-gray-600" },
      ];
    case "SHIPPED":
      return [
        { label: "设为已完成", targetStatus: "COMPLETED", style: "bg-green-600 hover:bg-green-700" },
        { label: "取消订单", targetStatus: "CANCELLED", style: "bg-gray-500 hover:bg-gray-600" },
      ];
    default:
      return [];
  }
}

// 订单管理页
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 筛选
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
        setPagination(data.pagination);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // 更新状态
  async function handleStatusChange(orderId: number, newStatus: string) {
    setUpdatingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`订单 #${orderId} 已更新为「${getOrderStatusLabel(newStatus)}」`);
        loadOrders();
        setTimeout(() => setSuccessMsg(""), 2000);
      } else {
        setError(data.error || "操作失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text mb-6">订单管理</h1>

      {/* 消息提示 */}
      {error && (
        <div className="mb-4 bg-red-50 text-danger text-sm px-4 py-2.5 rounded-lg">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-50 text-success text-sm px-4 py-2.5 rounded-lg">{successMsg}</div>
      )}

      {/* 状态筛选 */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">全部状态</option>
          <option value="PENDING">待付款</option>
          <option value="PAID">已支付</option>
          <option value="SHIPPED">已发货</option>
          <option value="COMPLETED">已完成</option>
          <option value="CANCELLED">已取消</option>
        </select>
      </div>

      {/* 订单列表 */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-text-muted">暂无订单</div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => {
              const actions = getAllowedActions(order.status);
              const isExpanded = expandedId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-surface rounded-xl border border-border overflow-hidden"
                >
                  {/* 订单头部 */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-text-muted font-mono">
                        #{String(order.id).padStart(8, "0")}
                      </span>
                      <span className="text-sm text-text font-medium">
                        {order.user.name}
                      </span>
                      <span className="text-xs text-text-muted">
                        {order.user.email}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(order.status)}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-danger">
                        ¥{order.total.toFixed(2)}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </span>
                      <span className="text-xs text-text-muted">
                        {isExpanded ? "收起 ▲" : "展开 ▼"}
                      </span>
                    </div>
                  </div>

                  {/* 展开的详情 */}
                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-gray-50/30 space-y-3">
                      {/* 收货信息 */}
                      <div className="text-xs text-text-muted grid grid-cols-3 gap-2">
                        <span>收货人：{order.receiver}</span>
                        <span>电话：{order.phone}</span>
                        <span>地址：{order.address}</span>
                      </div>

                      {/* 商品明细 */}
                      <div>
                        <p className="text-xs text-text-muted mb-2">商品明细：</p>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-text">
                                {item.product.name} × {item.quantity}
                              </span>
                              <span className="text-text-muted">
                                ¥{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-success">会员折扣</span>
                            <span className="text-success">-¥{order.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-medium pt-2 border-t border-border mt-2">
                          <span>合计</span>
                          <span className="text-danger">¥{order.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      {actions.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          {actions.map((action) => (
                            <button
                              key={action.targetStatus}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(order.id, action.targetStatus);
                              }}
                              disabled={updatingId === order.id}
                              className={`px-3 py-1.5 text-white text-xs rounded font-medium transition-colors disabled:opacity-50 ${action.style}`}
                            >
                              {updatingId === order.id ? "处理中..." : action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-30"
              >
                上一页
              </button>
              <span className="text-sm text-text-muted px-3">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-30"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
