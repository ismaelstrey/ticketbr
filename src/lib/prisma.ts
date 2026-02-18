import { PrismaClient } from "@prisma/client";

declare global {
  var prismaClientInstance: PrismaClient | undefined;
}

export async function getPrismaClient(): Promise<PrismaClient> {
  if (global.prismaClientInstance) {
    return global.prismaClientInstance;
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

  if (process.env.NODE_ENV !== "production") {
    global.prismaClientInstance = client;
  }

  return client;
}
