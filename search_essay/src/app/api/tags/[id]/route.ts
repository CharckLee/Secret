import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/tags/[id] — 更新标签
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { name, color } = await request.json();

    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json({ error: '标签名不能为空' }, { status: 400 });
      }
      if (trimmed.length > 50) {
        return NextResponse.json({ error: '标签名不能超过 50 字符' }, { status: 400 });
      }
    }

    const existing = await prisma.tag.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }

    const tag = await prisma.tag.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('PUT /api/tags/[id] error:', error);
    return NextResponse.json({ error: '更新标签失败' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] — 删除标签
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.tag.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ error: '标签不存在' }, { status: 404 });
    }
    await prisma.tag.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tags/[id] error:', error);
    return NextResponse.json({ error: '删除标签失败' }, { status: 500 });
  }
}
