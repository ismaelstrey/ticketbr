import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking data in DB...");
  const count = await prisma.ticket.count();
  console.log(`Count: ${count}`);
  const tickets = await prisma.ticket.findMany({ select: { id: true, number: true, subject: true } });
  console.log(tickets);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
