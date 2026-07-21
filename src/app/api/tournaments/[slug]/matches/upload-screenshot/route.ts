import { NextResponse } from "next/server";
import { guardResponse, isAuthedSession, requireSession } from "@/lib/auth-guard";
import {
  isS3Configured,
  sanitizeUploadKey,
  uploadToS3,
  validateImageBuffer,
} from "@/lib/s3";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { resolveUserTeamIds } from "@tournaments-leagues/index";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request, { params }: Params) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireSession();
  if (!isAuthedSession(auth)) return guardResponse(auth)!;

  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
  }

  const teamIds = await resolveUserTeamIds(tournament.id, auth.session.user.id);
  if (teamIds.length === 0) {
    return NextResponse.json(
      { error: "You must be on a team in this cup to upload." },
      { status: 403 },
    );
  }

  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 storage is not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 8MB." }, { status: 400 });
  }

  const type = file.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP screenshots are allowed." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magic = validateImageBuffer(buffer);
  if (!magic.ok) {
    return NextResponse.json({ error: magic.error }, { status: 400 });
  }

  const key = sanitizeUploadKey(`match-screenshots/${slug}`, file.name);
  const result = await uploadToS3(key, buffer, magic.contentType);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: result.url, key: result.key });
}
