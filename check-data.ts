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
  console.log("Checking data in DB...");
  const count = await prisma.ticket.count();
  console.log(`Count: ${count}`);
  const tickets = await prisma.ticket.findMany({ select: { id: true, number: true, subject: true } });
  console.log(tickets);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
