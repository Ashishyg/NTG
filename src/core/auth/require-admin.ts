/**
 * @deprecated Import from `@/lib/auth-guard` instead.
 * Kept for backward compatibility with existing `@core/auth/require-admin` imports.
 */
export {
  requireSession,
  requireAdmin,
  guardResponse,
  isAuthedSession,
  isAuthedAdmin,
  type SessionResult,
  type AdminResult,
  type GuardSession,
} from "@/lib/auth-guard";
