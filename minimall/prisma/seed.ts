import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 清理旧数据
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 创建分类
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: "数码产品", slug: "digital" },
    }),
    prisma.category.create({
      data: { name: "服装配饰", slug: "clothing" },
    }),
    prisma.category.create({
      data: { name: "家居生活", slug: "home" },
    }),
    prisma.category.create({
      data: { name: "食品饮料", slug: "food" },
    }),
    prisma.category.create({
      data: { name: "图书音像", slug: "books" },
    }),
  ]);

  console.log(`创建了 ${categories.length} 个分类`);

  // 创建示例商品
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "无线蓝牙耳机 Pro",
        description: "高品质降噪蓝牙耳机，支持蓝牙5.3，续航长达40小时。内置13mm动圈单元，音质出色，佩戴舒适。",
        price: 299,
        stock: 150,
        imageUrl: "https://picsum.photos/seed/earphone/400/400",
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "机械键盘 RGB 87键",
        description: "Cherry MX红轴机械键盘，1680万色RGB背光，铝合金面板。支持热插拔轴座，可自由更换轴体。",
        price: 459,
        stock: 80,
        imageUrl: "https://picsum.photos/seed/keyboard/400/400",
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "便携充电宝 20000mAh",
        description: "大容量快充充电宝，支持PD 65W双向快充，可同时充3台设备。轻薄便携，航空可携带。",
        price: 159,
        stock: 200,
        imageUrl: "https://picsum.photos/seed/powerbank/400/400",
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C 扩展坞 7合1",
        description: "Type-C多功能扩展坞，含HDMI 4K输出、USB 3.0 x3、SD/TF卡槽、PD充电口。即插即用，兼容MacBook和iPad。",
        price: 199,
        stock: 120,
        imageUrl: "https://picsum.photos/seed/dock/400/400",
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "智能手表 GT4 运动版",
        description: "1.43寸AMOLED屏幕，100+运动模式，血氧/心率/睡眠监测，14天续航。支持GPS定位和NFC支付。",
        price: 899,
        stock: 60,
        imageUrl: "https://picsum.photos/seed/watch/400/400",
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "男士休闲衬衫 条纹款",
        description: "纯棉免烫面料，经典条纹设计，商务休闲两不误。修身版型，多色可选。",
        price: 189,
        stock: 300,
        imageUrl: "https://picsum.photos/seed/shirt/400/400",
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "女士帆布单肩包",
        description: "简约帆布单肩包，大容量设计。可装15寸笔记本，通勤百搭。高密度帆布，耐磨耐用。",
        price: 129,
        stock: 250,
        imageUrl: "https://picsum.photos/seed/bag/400/400",
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "纯色棉质T恤 基础款",
        description: "100%新疆长绒棉，亲肤柔软不起球。经典圆领，四季百搭，12色可选。",
        price: 79,
        stock: 500,
        imageUrl: "https://picsum.photos/seed/tshirt/400/400",
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "运动跑鞋 轻量透气款",
        description: "飞织鞋面+EVA缓震中底，单只仅重210g。透气不闷脚，适合日常跑步和健身训练。",
        price: 329,
        stock: 180,
        imageUrl: "https://picsum.photos/seed/shoes/400/400",
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "实木书架 简约多层",
        description: "北美白橡木材质，6层大容量设计。榫卯结构稳固承重强，适合书房和客厅。",
        price: 599,
        stock: 40,
        imageUrl: "https://picsum.photos/seed/bookshelf/400/400",
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "LED护眼台灯 智能调光",
        description: "国AA级照度，无频闪无蓝光危害。支持触控调光+色温调节，记忆亮度，45分钟定时提醒。",
        price: 239,
        stock: 100,
        imageUrl: "https://picsum.photos/seed/lamp/400/400",
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "记忆棉颈椎枕 慢回弹",
        description: "人体工学曲线设计，50D记忆棉，外套可拆洗。适合仰睡和侧睡，有效缓解颈椎压力。",
        price: 149,
        stock: 160,
        imageUrl: "https://picsum.photos/seed/pillow/400/400",
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "不锈钢保温壶 1.5L",
        description: "316不锈钢内胆，24小时保温，12小时保冷。食品级材质，大口径易清洁。",
        price: 119,
        stock: 220,
        imageUrl: "https://picsum.photos/seed/thermos/400/400",
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "云南小粒咖啡豆 500g",
        description: "云南保山产区，阿拉比卡精品咖啡豆。中度烘焙，焦糖巧克力风味，酸苦平衡。",
        price: 68,
        stock: 400,
        imageUrl: "https://picsum.photos/seed/coffee/400/400",
        categoryId: categories[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "有机绿茶 明前龙井 100g",
        description: "西湖核心产区，明前采摘，一芽一叶。豆香馥郁，鲜爽回甘，手工炒制。",
        price: 168,
        stock: 90,
        imageUrl: "https://picsum.photos/seed/tea/400/400",
        categoryId: categories[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "混合坚果礼盒 800g",
        description: "6种坚果组合：腰果、巴旦木、夏威夷果、核桃、榛子、开心果。每日坚果科学配比。",
        price: 99,
        stock: 300,
        imageUrl: "https://picsum.photos/seed/nuts/400/400",
        categoryId: categories[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "TypeScript 高级编程",
        description: "全面讲解TypeScript类型系统、泛型编程和工程实战。适合有JS基础、想深入学习TS的开发者。",
        price: 89,
        stock: 500,
        imageUrl: "https://picsum.photos/seed/tsbook/400/400",
        categoryId: categories[4].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "深入理解计算机系统（原书第4版）",
        description: "经典CS教材CS:APP第四版，涵盖计算机系统核心概念。从程序员视角理解硬件和系统软件。",
        price: 139,
        stock: 80,
        imageUrl: "https://picsum.photos/seed/csapp/400/400",
        categoryId: categories[4].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "前端开发实战指南",
        description: "React 19 + Next.js 16 全栈开发实战。从零搭建企业级前端项目，含服务端渲染和性能优化。",
        price: 79,
        stock: 350,
        imageUrl: "https://picsum.photos/seed/frontend/400/400",
        categoryId: categories[4].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "设计模式：可复用面向对象软件的基础",
        description: "GoF四人帮经典之作，23种设计模式详解。软件工程师必读，设计模式入门首选。",
        price: 69,
        stock: 200,
        imageUrl: "https://picsum.photos/seed/designpattern/400/400",
        categoryId: categories[4].id,
      },
    }),
  ]);

  console.log(`创建了 ${products.length} 个商品`);

  // 创建管理员账号
  const bcrypt = await import("bcryptjs");
  const adminHash = bcrypt.hashSync("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@minimall.com",
      password: adminHash,
      name: "管理员",
      role: "ADMIN",
    },
  });

  console.log("创建了管理员账号: admin@minimall.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
