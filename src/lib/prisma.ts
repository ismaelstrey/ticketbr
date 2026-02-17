type PrismaClientLike = {
  ticket: any;
  ticketEvent: any;
};

declare global {
  var prismaClientInstance: PrismaClientLike | undefined;
}

export async function getPrismaClient(): Promise<PrismaClientLike> {
  if (global.prismaClientInstance) {
    return global.prismaClientInstance;
  }

  const moduleName = "@prisma/client";
  const mod = await import(moduleName);
  const client = new mod.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  }) as PrismaClientLike;

  if (process.env.NODE_ENV !== "production") {
    global.prismaClientInstance = client;
  }

  return client;
}
