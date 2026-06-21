import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log("User columns:", Object.keys(users[0] || {}));
  } catch (e) {
    console.error("Query failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
