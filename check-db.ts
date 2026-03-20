import "dotenv/config";
import { PrismaClient } from "./prisma/generated/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

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

const prisma = hostname.endsWith("prisma.io")
  ? new PrismaClient({ adapter: new PrismaPostgresAdapter({ connectionString }) } as any)
  : new PrismaClient({ adapter: new PrismaPg({ connectionString }) } as any);

async function main() {
    console.log("Checking DB...");
    try {
        const count = await prisma.ticket.count();
        console.log(`Ticket count: ${count}`);
        const tickets = await prisma.ticket.findMany({ take: 2 });
        console.log("First 2 tickets:", tickets);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
