import { handleSignupStatus } from "@auth-membership/api/register.handlers";

export async function GET() {
  return handleSignupStatus();
}
