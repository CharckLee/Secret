import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/notes/[id] — 更新笔记
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { content } = await request.json();

    if (content && content.length > 100_000) {
      return NextResponse.json({ error: '笔记内容不能超过 100KB' }, { status: 400 });
    }

    const existing = await prisma.note.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }

    const note = await prisma.note.update({
      where: { id: parseInt(id) },
      data: { content },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('PUT /api/notes/[id] error:', error);
    return NextResponse.json({ error: '更新笔记失败' }, { status: 500 });
  }
}

// DELETE /api/notes/[id] — 删除笔记
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.note.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    await prisma.note.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notes/[id] error:', error);
    return NextResponse.json({ error: '删除笔记失败' }, { status: 500 });
  }
}
