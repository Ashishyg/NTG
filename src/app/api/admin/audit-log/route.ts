import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { formatAuditTargetLabel } from "@/lib/admin-audit-format";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const fetchAll = !limitParam || limitParam === "all";
  const take = fetchAll ? undefined : Math.min(Math.max(Number(limitParam) || 50, 1), 5000);

  const rows = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    ...(take !== undefined ? { take } : {}),
    include: {
      admin: {
        select: { name: true, email: true },
      },
    },
  });

  const memberIds = [
    ...new Set(
      rows
        .filter((r) => r.action.startsWith("member.") && r.target)
        .map((r) => r.target as string),
    ),
  ];

  const tournamentSlugs = [
    ...new Set(
      rows
        .filter((r) => r.action.startsWith("tournament.") && r.target)
        .map((r) => r.target as string),
    ),
  ];

  const [members, tournaments] = await Promise.all([
    memberIds.length
      ? prisma.user.findMany({
          where: { id: { in: memberIds } },
          select: {
            id: true,
            name: true,
            email: true,
            riotGameName: true,
            riotTagLine: true,
            playerProfile: { select: { displayName: true } },
          },
        })
      : Promise.resolve([]),
    tournamentSlugs.length
      ? prisma.tournament.findMany({
          where: { slug: { in: tournamentSlugs } },
          select: { slug: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const memberLabels = new Map(
    members.map((u) => [
      u.id,
      u.playerProfile?.displayName ??
        u.name ??
        (u.riotGameName && u.riotTagLine ? `${u.riotGameName}#${u.riotTagLine}` : null) ??
        u.email ??
        "Member account",
    ]),
  );

  const tournamentLabels = new Map(tournaments.map((t) => [t.slug, t.name]));

  return NextResponse.json({
    logs: rows.map((r) => {
      const resolvedTarget =
        (r.target && memberLabels.get(r.target)) ||
        (r.target && tournamentLabels.get(r.target)) ||
        null;

      return {
        id: r.id,
        action: r.action,
        target: r.target ?? null,
        targetLabel: formatAuditTargetLabel(r.action, r.target, r.metadata, resolvedTarget),
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        adminName: r.admin.name ?? r.admin.email ?? "Admin",
      };
    }),
  });
}
