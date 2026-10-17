// 简易内存速率限制器
// 生产环境应替换为 Redis 方案（如 @upstash/ratelimit），避免多实例/重启后计数器丢失

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10_000;

/** 惰性淘汰过期条目（在读路径上触发） */
function lazyEvict(now: number) {
  // 超过容量上限时做全量清理
  if (store.size > MAX_STORE_SIZE) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }
}

/**
 * 检查是否超过速率限制
 * @param key 唯一标识（如 IP + action）
 * @param maxAttempts 窗口内最大尝试次数
 * @param windowMs 时间窗口（毫秒）
 * @returns { success, remaining } — success 为 false 时表示被限制
 */
export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();

  // 惰性淘汰过期条目，防止 Map 只增不减导致自 DOS
  lazyEvict(now);

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    // 容量保护：淘汰后仍满则拒绝新 key
    if (!entry && store.size >= MAX_STORE_SIZE) {
      return { success: false, remaining: 0 };
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: maxAttempts - entry.count };
}

/**
 * 从 NextRequest 提取客户端 IP
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
