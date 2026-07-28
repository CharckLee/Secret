/** 心悦会员等级映射 */
export function getMembershipLabel(level: string): string | null {
  switch (level) {
    case "LEVEL_1":
      return "心悦1级";
    case "LEVEL_2":
      return "心悦2级";
    case "LEVEL_3":
      return "心悦3级";
    default:
      return null;
  }
}

/** 会员等级对应的折扣率 */
export function getMembershipDiscountRate(level: string): number {
  switch (level) {
    case "LEVEL_1":
      return 0.02; // 9.8 折
    case "LEVEL_2":
      return 0.05; // 9.5 折
    case "LEVEL_3":
      return 0.1; // 9 折
    default:
      return 0;
  }
}

/** 根据累计消费金额计算会员等级 */
export function calculateMembershipLevel(totalSpent: number): string {
  if (totalSpent >= 800000) return "LEVEL_3";
  if (totalSpent >= 80000) return "LEVEL_2";
  if (totalSpent >= 8000) return "LEVEL_1";
  return "NONE";
}

/** 订单状态 → 中文标签 */
export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "待付款";
    case "PAID":
      return "已支付";
    case "SHIPPED":
      return "已发货";
    case "COMPLETED":
      return "已完成";
    case "CANCELLED":
      return "已取消";
    default:
      return status;
  }
}
