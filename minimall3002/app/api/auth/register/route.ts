import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSession } from "@/lib/auth";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

// 注册请求体校验
const RegisterSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少需要6位"),
  name: z.string().min(1, "姓名不能为空").max(50),
});

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    // 速率限制：每 IP 每小时最多 3 次注册
    const ip = getClientIP(request);
    const rl = rateLimit(`register:${ip}`, 3, 60 * 60_000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "注册请求过于频繁，请稍后再试" },
        {
          status: 429,
          headers: { "Retry-After": "3600" },
        }
      );
    }

    const body = await request.json();

    // Zod 校验
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const { password, name } = parsed.data;

    // 检查邮箱唯一性 — 速率限制已大幅降低枚举风险
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    // 创建用户
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: "USER",
      },
    });

    // 注册后自动登录
    await setSession(user.id, user.role);

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}
