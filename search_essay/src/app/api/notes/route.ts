import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/notes?literatureId=X — 获取某文献的笔记
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const literatureId = searchParams.get('literatureId');

    if (!literatureId) {
      return NextResponse.json({ error: '缺少 literatureId 参数' }, { status: 400 });
    }

    const notes = await prisma.note.findMany({
      where: { literatureId: parseInt(literatureId) },
      orderBy: { createTime: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('GET /api/notes error:', error);
    return NextResponse.json({ error: '获取笔记失败' }, { status: 500 });
  }
}

// POST /api/notes — 创建笔记
export async function POST(request: NextRequest) {
  try {
    const { literatureId, content } = await request.json();

    if (!literatureId || !content) {
      return NextResponse.json(
        { error: 'literatureId 和 content 不能为空' },
        { status: 400 },
      );
    }
    if (content.length > 100_000) {
      return NextResponse.json({ error: '笔记内容不能超过 100KB' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        literatureId: parseInt(literatureId),
        content,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return NextResponse.json({ error: '创建笔记失败' }, { status: 500 });
  }
}
