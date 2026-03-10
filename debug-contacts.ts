
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching recent WhatsApp contacts...");
  const contacts = await prisma.whatsAppContact.findMany({
    take: 10,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      remoteJid: true,
      pushName: true
    }
  });
  console.log("Contacts:", JSON.stringify(contacts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
