import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
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
