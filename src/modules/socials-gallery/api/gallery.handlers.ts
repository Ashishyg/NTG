import { NextResponse } from "next/server";

export function handleGalleryNotImplemented() {
  return NextResponse.json(
    { error: "Gallery API stub", module: "socials-gallery" },
    { status: 501 },
  );
}
