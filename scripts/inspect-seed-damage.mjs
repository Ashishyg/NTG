/**
 * Inspect likely damage from running the old full db:seed on a live database.
 * Run: npx dotenv -e .env.local -- node scripts/inspect-seed-damage.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MOCK_EMAILS = [
  "vachan@ntgesports.com",
  "shanks@ntgesports.com",
  "conor@ntgesports.com",
  "player4@ntgesports.com",
  "player5@ntgesports.com",
];

try {
  console.log("=== Mock seed users (@ntgesports.com) ===\n");
  for (const email of MOCK_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { playerProfile: true },
    });
    if (!user) {
      console.log(`${email}: not found`);
      continue;
    }
    console.log(
      `${email} | created ${user.createdAt.toISOString()} | profile @${user.playerProfile?.displayName ?? "none"}`,
    );
  }

  console.log("\n=== Real users missing @username (no PlayerProfile) ===\n");
  const noProfile = await prisma.user.findMany({
    where: { signupCompleted: true, playerProfile: null },
    select: { email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const u of noProfile) {
    console.log(`${u.email ?? "(no email)"} | ${u.name ?? "(no name)"} | ${u.createdAt.toISOString()}`);
  }

  console.log("\n=== Tournament statuses ===\n");
  const cups = await prisma.tournament.findMany({
    where: { slug: { in: ["fc26-cup-1", "auc-cup-3"] } },
    select: {
      slug: true,
      name: true,
      status: true,
      autoManageStatus: true,
      registrationOpensAt: true,
      startsAt: true,
      updatedAt: true,
    },
  });
  for (const t of cups) {
    console.log(
      `${t.slug} (${t.name}): ${t.status} | auto=${t.autoManageStatus} | updated ${t.updatedAt.toISOString()}`,
    );
  }

  console.log("\n=== Recent admin audit (tournament / member) ===\n");
  const audit = await prisma.adminAuditLog.findMany({
    where: {
      OR: [
        { action: { contains: "tournament" } },
        { action: { contains: "member" } },
        { action: { contains: "gamepass" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: { createdAt: true, action: true, target: true, adminId: true },
  });
  if (audit.length === 0) {
    console.log("(no matching audit rows)");
  } else {
    for (const row of audit) {
      console.log(`${row.createdAt.toISOString()} | ${row.action} | ${row.target ?? ""}`);
    }
  }
} finally {
  await prisma.$disconnect();
}
