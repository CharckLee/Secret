import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";

// 登录请求体校验
const LoginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod 校验
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const { password } = parsed.data;

    // 查找用户
    const user = await prisma.user.findUnique({ where: { email } });

    // 统一错误提示：不区分"用户不存在"和"密码错误"
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    // 写入 session
    await setSession(user.id, user.role);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch {
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
