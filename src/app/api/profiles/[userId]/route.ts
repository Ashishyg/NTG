import { handleProfileNotImplemented } from "@auth-membership/api/profile.handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleProfileNotImplemented();
}
