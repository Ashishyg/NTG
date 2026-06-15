import { handleGalleryNotImplemented } from "@socials-gallery/api/gallery.handlers";
import { serverEnv } from "@core/config/env.server";
import { getGalleryPreview } from "@socials-gallery/index";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!serverEnv.databaseUrl) {
    return handleGalleryNotImplemented();
  }
  try {
    const gallery = await getGalleryPreview();
    return NextResponse.json({ gallery });
  } catch {
    return handleGalleryNotImplemented();
  }
}
