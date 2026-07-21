import { PrismaClient } from "@prisma/client";

// ====== Prisma Singleton (Neon PostgreSQL) ======
const NEON_URL = "postgresql://neondb_owner:npg_mrf5YU9VgBbe@ep-wandering-sound-auc3pst8-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: NEON_URL } },
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
