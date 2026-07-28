import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// SQLite：连接后确保使用 UTF-8 编码，防止中文乱码
// 注意：若已有数据出现乱码，需删除 dev.db 后重新 npx prisma db push + npm run db:seed
prisma.$executeRaw`PRAGMA encoding = 'UTF-8'`.catch(() => {});
