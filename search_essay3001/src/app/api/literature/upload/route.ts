import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

// POST /api/literature/upload — 上传 PDF
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '未命名文献';
    const author = (formData.get('author') as string) || '';
    const text = (formData.get('text') as string) || '';

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }
    if (title.length > 500) {
      return NextResponse.json({ error: '标题不能超过 500 字符' }, { status: 400 });
    }
    if (text.length > 500000) {
      return NextResponse.json({ error: '文本内容过长，请精简后重试' }, { status: 400 });
    }

    // 文件大小校验（防止 OOM）
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: '文件为空' }, { status: 400 });
    }

    // 读取文件头进行魔术字节校验
    const buffer = Buffer.from(await file.arrayBuffer());
    const isPDFByMagic = buffer.length >= 4 && PDF_MAGIC_BYTES.every((b, i) => buffer[i] === b);

    // MIME 类型双重校验
    const isPDFByMime = file.type === 'application/pdf';

    if (!isPDFByMagic && !isPDFByMime) {
      return NextResponse.json({ error: '仅支持上传 PDF 文件' }, { status: 400 });
    }

    // 使用 UUID 避免并发文件名碰撞
    const fileName = `${crypto.randomUUID()}.pdf`;
    const relativePath = `uploads/${fileName}`;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    await writeFile(absolutePath, buffer);

    // 创建文献记录
    const literature = await prisma.literature.create({
      data: {
        title,
        author: author || null,
        content: text || null,
        pdfPath: relativePath,
      },
      include: { tags: true },
    });

    return NextResponse.json(literature, { status: 201 });
  } catch (error) {
    console.error('POST /api/literature/upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
