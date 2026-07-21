import { PrismaClient } from "@prisma/client";

// ====== Prisma Singleton (Neon PostgreSQL) ======
// Uses datasourceUrl to pass Neon URL directly at runtime.
// Lazy initialization: PrismaClient is NOT created at module load time.
// This prevents PrismaClientInitializationError during Vercel build
// (when database is not accessible during static page collection).

const NEON_URL = "postgresql://neondb_owner:npg_mrf5YU9VgBbe@ep-wandering-sound-auc3pst8-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: NEON_URL,
    log: ["error", "warn"],
  });
}

// Lazy getter: only creates PrismaClient when first accessed
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const value = (globalForPrisma.prisma as any)[prop];
    return typeof value === "function" ? value.bind(globalForPrisma.prisma) : value;
  },
});

export default db;
