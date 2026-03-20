import { PrismaClient, Prisma } from "../../prisma/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const hostname = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return "";
    }
  })();

  if (hostname.endsWith("prisma.io")) {
    const adapter = new PrismaPostgresAdapter({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
    } as any);
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  } as any);
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const getPrisma = (): PrismaClientSingleton => {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = prismaClientSingleton();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = created;
  return created;
};

export const prisma = new Proxy({} as PrismaClientSingleton, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as any)[prop as any];
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClientSingleton;

export { Prisma };
