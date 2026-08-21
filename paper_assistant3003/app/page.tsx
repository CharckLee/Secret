'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { listDocuments } from '@/lib/db/documents';
import type { DocumentRecord } from '@/lib/types';

const FEATURES = [
  { href: '/editor', title: '文稿编辑', desc: '粘贴 / 导入 txt / docx，在线编辑' },
  { href: '/editor', title: '格式检测', desc: '标题层级、缩进、空行、图表公式校验' },
  { href: '/references', title: '参考文献管理', desc: '批量解析并转为 GB/T 7714' },
  { href: '/editor', title: '文本润色', desc: '选段 DeepSeek 学术润色，双栏对比' },
  { href: '/similarity', title: '语义相似自查', desc: '识别文字不同、含义相近的片段' },
];

export default function HomePage() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => setDocs([]));
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold">工作台</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href}>
              <Card className="h-full">
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">历史文稿</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">暂无文稿，点击上方「文稿编辑」开始。</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {docs.map((doc) => (
              <Link key={doc.id} href={`/editor?id=${doc.id}`}>
                <Card>
                  <h3 className="font-semibold">{doc.title || '未命名文稿'}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    更新于 {new Date(doc.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
