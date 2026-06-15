import { NextResponse } from "next/server";
import { getPublicProfile } from "../application/profile.service";

export async function handleGetProfile(userId: string) {
  const profile = await getPublicProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

export function handleProfileNotImplemented() {
  return NextResponse.json(
    { error: "Profile API not yet implemented", module: "auth-membership" },
    { status: 501 },
  );
}
