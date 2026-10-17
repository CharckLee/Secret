import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Session Cookie 名称
const SESSION_COOKIE = "minimall_session";
// Session 有效期：7 天
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// -------------------- 密钥管理 --------------------

let _authSecret: string | null = null;

/** 惰性获取 AUTH_SECRET，仅在首次签名/验证时校验 */
function getAuthSecret(): string {
  if (_authSecret) return _authSecret;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === "minimall-secret-change-me") {
    throw new Error(
      "AUTH_SECRET 环境变量未设置或仍为默认值。请在 .env 中设置一个至少 32 位的随机字符串。"
    );
  }
  _authSecret = secret;
  return _authSecret;
}

// -------------------- 密码工具 --------------------

/** 哈希密码 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** 验证密码 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// -------------------- Session 签名工具 --------------------

/** 对 payload 做 HMAC-SHA256 签名，返回 "payload.signature" */
function sign(payload: string): string {
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** 验证签名并返回 payload，无效则返回 null */
function unsign(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const expected = sign(payload);

  // 恒定时间比较防止时序攻击
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return payload;
}

// -------------------- Session 工具 --------------------

/**
 * 写入 Session Cookie
 * @param userId 用户 ID
 * @param role 用户角色
 */
export async function setSession(
  userId: number,
  role: string
): Promise<void> {
  // payload 格式：userId:role:exp（exp 为 Unix 秒级时间戳）
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}:${role}:${exp}`;
  const signed = sign(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    // sameSite: "strict" 会导致从外部链接进入时丢失 session
    // JSON API 本身已有 Content-Type 校验防护 CSRF，故保留 "lax"
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * 从 Cookie 读取当前用户信息（只解析 session，不查数据库）
 * 返回 { userId, role } 或 null
 */
export async function getSession(): Promise<{
  userId: number;
  role: string;
} | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session) return null;

  try {
    const payload = unsign(session.value);
    if (!payload) return null;

    const parts = payload.split(":");
    // 兼容旧格式（userId:role）和新格式（userId:role:exp）
    const userIdStr = parts[0];
    const role = parts[1];
    const expStr = parts[2];

    const userId = parseInt(userIdStr, 10);
    if (isNaN(userId) || !role) return null;

    // 校验过期时间
    if (expStr) {
      const exp = parseInt(expStr, 10);
      if (isNaN(exp) || Date.now() / 1000 > exp) return null;
    }

    return { userId, role };
  } catch {
    return null;
  }
}

/**
 * 获取当前登录用户的完整信息（查数据库）
 * 返回 User 对象或 null
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totalSpent: true,
      membershipLevel: true,
      createdAt: true,
    },
  });

  return user;
}

/** 清除 Session Cookie（退出登录） */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0, // 立即过期
  });
}

// -------------------- 权限工具 --------------------

/** 登录校验 — 未登录返回 401 响应，通过返回 session */
export async function requireAuth(): Promise<
  | { userId: number; role: string }
  | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  return session;
}

/** Admin 权限校验 — 非 ADMIN 返回 403 响应，通过返回 null */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限访问" }, { status: 403 });
  }
  return null;
}
