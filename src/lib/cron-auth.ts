import { serverEnv } from "@core/config/env.server";

export function isCronAuthorized(req: Request): boolean {
  const secret = serverEnv.cronSecret;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
