import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 清理已有数据
  await prisma.note.deleteMany();
  await prisma.literature.deleteMany();
  await prisma.tag.deleteMany();

  // 创建标签
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: '生物医药', color: '#0891b2' } }),
    prisma.tag.create({ data: { name: '人工智能', color: '#7c3aed' } }),
    prisma.tag.create({ data: { name: '材料科学', color: '#059669' } }),
    prisma.tag.create({ data: { name: '深度学习', color: '#db2777' } }),
    prisma.tag.create({ data: { name: '综述', color: '#d97706' } }),
  ]);

  // 创建示例文献
  await prisma.literature.create({
    data: {
      title: '基于深度学习的蛋白质结构预测方法研究进展',
      author: '张三, 李四, 王五',
      abstract: '蛋白质结构预测是计算生物学领域的核心问题之一。本文综述了近年来基于深度学习的蛋白质结构预测方法，包括AlphaFold2、RoseTTAFold等代表性模型的原理、优势与局限性，并探讨了该领域的未来发展方向。',
      content: '完整论文内容示例：蛋白质是生命活动的主要承担者，其三维结构决定了生物学功能。传统的蛋白质结构测定方法如X射线晶体学、核磁共振和冷冻电镜等成本高昂且耗时。近年来，深度学习技术的快速发展为蛋白质结构预测带来了革命性突破...',
      keywords: '蛋白质结构预测, 深度学习, AlphaFold2, 计算生物学',
      journalSource: '生物信息学学报',
      journalUrl: 'https://doi.org/10.1234/bioinf.2024.001',
      tags: { connect: [{ id: tags[0].id }, { id: tags[1].id }] },
      notes: {
        create: {
          content: '这篇综述对AlphaFold2的原理讲解很清晰，可以作为开题报告的核心参考文献。',
        },
      },
    },
  });

  await prisma.literature.create({
    data: {
      title: '纳米材料在靶向药物递送中的应用',
      author: 'Alice Chen, Bob Wang',
      abstract: '纳米材料因其独特的物理化学性质，在靶向药物递送领域展现出巨大潜力。本研究设计了一种新型介孔二氧化硅纳米粒子，实现了对肿瘤细胞的高效靶向递送。',
      content: '完整论文内容示例：近年来，纳米技术在生物医药领域的应用日益广泛。介孔二氧化硅纳米粒子因其高比表面积、可调控的孔径和良好的生物相容性，成为药物递送系统的理想载体...',
      keywords: '纳米材料, 靶向递送, 介孔二氧化硅, 肿瘤治疗',
      journalSource: 'Advanced Materials',
      journalUrl: 'https://doi.org/10.1002/adma.20240001',
      tags: { connect: [{ id: tags[0].id }, { id: tags[2].id }] },
    },
  });

  await prisma.literature.create({
    data: {
      title: '自然语言处理在生物医学文献挖掘中的应用',
      author: '刘明, 赵红',
      abstract: '生物医学文献数量呈指数增长，传统的人工阅读方式已无法满足科研需求。本文系统介绍了自然语言处理技术在生物医学文献自动挖掘中的最新进展。',
      content: '完整论文内容示例：PubMed数据库中收录的生物医学文献已超过3400万篇，且每年新增约100万篇。如何从海量文献中快速获取关键信息成为科研人员的迫切需求...',
      keywords: '自然语言处理, 文献挖掘, 生物医学, 文本分类',
      journalSource: '情报学报',
      journalUrl: 'https://doi.org/10.3772/j.issn.1000-0135.2024.03.001',
      tags: { connect: [{ id: tags[1].id }, { id: tags[0].id }] },
      notes: {
        create: {
          content: 'NLP在文献挖掘中的应用场景总结很全面，方法论部分值得深入学习。',
        },
      },
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
