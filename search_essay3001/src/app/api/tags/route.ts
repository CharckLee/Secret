import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tags — 获取所有标签
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { literature: true },
        },
      },
    });

    const result = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      literatureCount: tag._count.literature,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 });
  }
}

// POST /api/tags — 创建标签
export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: '标签名不能为空' }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: '标签名不能超过 50 字符' }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: color || '#0891b2',
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: '标签名已存在' }, { status: 409 });
    }
    console.error('POST /api/tags error:', error);
    return NextResponse.json({ error: '创建标签失败' }, { status: 500 });
  }
}
