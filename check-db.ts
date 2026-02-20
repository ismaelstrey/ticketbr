import "dotenv/config";
import { PrismaClient } from "./prisma/generated/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}
const adapter = new PrismaPostgresAdapter({ connectionString });
const prisma = new PrismaClient({ adapter });

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
