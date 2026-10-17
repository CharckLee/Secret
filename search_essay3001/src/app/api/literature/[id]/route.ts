import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// GET /api/literature/[id] — 获取单篇文献
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const literature = await prisma.literature.findUnique({
      where: { id: parseInt(id) },
      include: { tags: true, notes: true },
    });

    if (!literature) {
      return NextResponse.json({ error: '文献不存在' }, { status: 404 });
    }

    return NextResponse.json(literature);
  } catch (error) {
    console.error('GET /api/literature/[id] error:', error);
    return NextResponse.json({ error: '获取文献失败' }, { status: 500 });
  }
}

// PUT /api/literature/[id] — 更新文献
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, author, abstract, content, keywords, journalSource, journalUrl, pdfPath, aiOverview, aiAnalysis, translatedContent, tagIds } = body;

    if (title != null && title.length > 500) {
      return NextResponse.json({ error: '标题不能超过 500 字符' }, { status: 400 });
    }
    if (content != null && content.length > 500_000) {
      return NextResponse.json({ error: '正文内容不能超过 500KB' }, { status: 400 });
    }

    const existing = await prisma.literature.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return NextResponse.json({ error: '文献不存在' }, { status: 404 });
    }

    // 如果传了 tagIds，先断开所有标签再连接新的
    let tagUpdate = undefined;
    if (Array.isArray(tagIds)) {
      tagUpdate = {
        set: [],
        connect: tagIds.map((tid: number) => ({ id: tid })),
      };
    }

    const literature = await prisma.literature.update({
      where: { id: parseInt(id) },
      data: {
        ...(title != null && { title }),
        ...(author != null && { author }),
        ...(abstract != null && { abstract }),
        ...(content != null && { content }),
        ...(keywords != null && { keywords }),
        ...(journalSource != null && { journalSource }),
        ...(journalUrl != null && { journalUrl }),
        ...(pdfPath != null && { pdfPath }),
        ...(aiOverview != null && { aiOverview }),
        ...(aiAnalysis != null && { aiAnalysis }),
        ...(translatedContent != null && { translatedContent }),
        ...(tagUpdate && { tags: tagUpdate }),
      },
      include: { tags: true, notes: true },
    });

    return NextResponse.json(literature);
  } catch (error) {
    console.error('PUT /api/literature/[id] error:', error);
    return NextResponse.json({ error: '更新文献失败' }, { status: 500 });
  }
}

// DELETE /api/literature/[id] — 删除文献
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const literature = await prisma.literature.findUnique({
      where: { id: parseInt(id) },
    });

    if (!literature) {
      return NextResponse.json({ error: '文献不存在' }, { status: 404 });
    }

    // 删除关联的 PDF 文件
    if (literature.pdfPath) {
      const filePath = path.join(process.cwd(), 'public', literature.pdfPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.literature.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/literature/[id] error:', error);
    return NextResponse.json({ error: '删除文献失败' }, { status: 500 });
  }
}
