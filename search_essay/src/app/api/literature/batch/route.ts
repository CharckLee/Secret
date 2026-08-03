import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatGB7714 } from '@/lib/citation';
import fs from 'fs';
import path from 'path';

// POST /api/literature/batch — 批量操作
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids, tagIds } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择文献' }, { status: 400 });
    }

    switch (action) {
      case 'delete': {
        // 先获取 PDF 路径
        const literatures = await prisma.literature.findMany({
          where: { id: { in: ids } },
          select: { id: true, pdfPath: true },
        });

        // 先清理 PDF 文件（每个文件独立 try-catch，单个失败不影响其他）
        let filesDeleted = 0;
        for (const lit of literatures) {
          if (lit.pdfPath) {
            const filePath = path.join(process.cwd(), 'public', lit.pdfPath);
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                filesDeleted++;
              }
            } catch (fileErr) {
              console.error(`删除 PDF 文件失败: ${filePath}`, fileErr);
            }
          }
        }

        // 文件清理完毕后再删除数据库记录
        const deleteResult = await prisma.literature.deleteMany({
          where: { id: { in: ids } },
        });

        return NextResponse.json({
          success: true,
          deleted: deleteResult.count,
          filesDeleted,
        });
      }

      case 'changeTags': {
        if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
          return NextResponse.json({ error: '请选择标签' }, { status: 400 });
        }

        // 批量更新标签
        for (const id of ids) {
          await prisma.literature.update({
            where: { id },
            data: {
              tags: {
                set: tagIds.map((tid: number) => ({ id: tid })),
              },
            },
          });
        }

        return NextResponse.json({ success: true, updated: ids.length });
      }

      case 'export': {
        const literatures = await prisma.literature.findMany({
          where: { id: { in: ids } },
          include: { tags: true },
        });

        const citations = literatures.map((lit) => formatGB7714(lit)).join('\n\n');

        return NextResponse.json({ citations });
      }

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('POST /api/literature/batch error:', error);
    return NextResponse.json({ error: '批量操作失败' }, { status: 500 });
  }
}
