import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/literature — 文献列表（支持搜索、标签筛选、分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tagId = searchParams.get('tagId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0') || 0;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } },
        { keywords: { contains: search } },
        { abstract: { contains: search } },
      ];
    }

    if (tagId) {
      where.tags = { some: { id: parseInt(tagId) } };
    }

    const [items, total] = await Promise.all([
      prisma.literature.findMany({
        where,
        select: {
          id: true,
          title: true,
          author: true,
          abstract: true,
          keywords: true,
          journalSource: true,
          journalUrl: true,
          pdfPath: true,
          aiOverview: true,
          createTime: true,
          updateTime: true,
          tags: true,
          notes: true,
        },
        orderBy: { createTime: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.literature.count({ where }),
    ]);

    return NextResponse.json({ items, total });
  } catch (error) {
    console.error('GET /api/literature error:', error);
    return NextResponse.json({ error: '获取文献列表失败' }, { status: 500 });
  }
}

// POST /api/literature — 手动创建文献
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, author, abstract, content, keywords, journalSource, journalUrl, pdfPath, tagIds } = body;

    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    if (title.length > 500) {
      return NextResponse.json({ error: '标题不能超过 500 字符' }, { status: 400 });
    }
    if (content && content.length > 500_000) {
      return NextResponse.json({ error: '正文内容不能超过 500KB' }, { status: 400 });
    }

    const literature = await prisma.literature.create({
      data: {
        title,
        author: author || null,
        abstract: abstract || null,
        content: content || null,
        keywords: keywords || null,
        journalSource: journalSource || null,
        journalUrl: journalUrl || null,
        pdfPath: pdfPath || null,
        tags: tagIds?.length
          ? { connect: tagIds.map((id: number) => ({ id })) }
          : undefined,
      },
      include: { tags: true },
    });

    return NextResponse.json(literature, { status: 201 });
  } catch (error) {
    console.error('POST /api/literature error:', error);
    return NextResponse.json({ error: '创建文献失败' }, { status: 500 });
  }
}
