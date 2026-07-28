import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Session Cookie 名称
const SESSION_COOKIE = "minimall_session";
// 签名密钥
const AUTH_SECRET = process.env.AUTH_SECRET || "minimall-secret-change-me";

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
    .createHmac("sha256", AUTH_SECRET)
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
  const payload = `${userId}:${role}`;
  const signed = sign(payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
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

    const [userIdStr, role] = payload.split(":");
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId) || !role) return null;

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
