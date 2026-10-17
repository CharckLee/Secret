// 业务错误类 — 用于在 Prisma 事务内外传递可区分的错误类型
// 替代字符串匹配 throw new Error("...") + catch e.message === "..." 模式

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** 库存不足 */
export class InsufficientStockError extends AppError {
  constructor(productName?: string) {
    super(productName ? `「${productName}」库存不足，请调整数量后重试` : "库存不足");
    this.name = "InsufficientStockError";
  }
}

/** 订单已被支付（并发防护） */
export class OrderAlreadyPaidError extends AppError {
  constructor() {
    super("订单已支付，请勿重复操作");
    this.name = "OrderAlreadyPaidError";
  }
}

/** 订单状态已被变更（管理员并发） */
export class OrderStatusChangedError extends AppError {
  constructor() {
    super("订单状态已被其他操作变更，请刷新后重试");
    this.name = "OrderStatusChangedError";
  }
}
