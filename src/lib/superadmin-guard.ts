import { prisma } from "@core/database/client";
import { guardResponse, isAuthedAdmin, requireAdmin, type AdminResult } from "@/lib/auth-guard";
import { isSuperAdminEmail } from "@/lib/superadmin";

export { guardResponse, isAuthedAdmin };

/** Requires admin role plus superadmin email match. */
export async function requireSuperAdmin(): Promise<AdminResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true },
  });

  if (!isSuperAdminEmail(user?.email)) {
    return { ok: false, status: 403, error: "Super admin access required" };
  }

  return auth;
}
