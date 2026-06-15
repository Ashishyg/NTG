import { handleMatchesNotImplemented } from "@tournaments-leagues/api/tournament.handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleMatchesNotImplemented();
}

export async function POST() {
  return handleMatchesNotImplemented();
}
