import { handlers, isAuthConfigured } from "@auth-membership/index";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthConfigured() || !handlers) {
    return NextResponse.json(
      { error: "Auth not configured", module: "auth-membership" },
      { status: 501 },
    );
  }
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured() || !handlers) {
    return NextResponse.json(
      { error: "Auth not configured", module: "auth-membership" },
      { status: 501 },
    );
  }
  return handlers.POST(req);
}
