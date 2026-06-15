import fs from "fs";
import path from "path";

const REELS_DIR = path.join(process.cwd(), "public/covers/reels");

const urls = (
  process.env.INSTAGRAM_REEL_URLS ??
  "https://www.instagram.com/reel/DZe4zVFJ2oj/,https://www.instagram.com/reel/DZW7qw3N54a/,https://www.instagram.com/reel/DZPVMG_Ma36/"
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function shortcode(url) {
  return url.match(/\/reel\/([^/?]+)/)?.[1];
}

async function coverUrl(shortcode) {
  const res = await fetch(`https://www.instagram.com/p/${shortcode}/media/?size=l`, {
    headers,
    redirect: "manual",
  });
  const loc = res.headers.get("location");
  if ((res.status === 301 || res.status === 302) && loc?.startsWith("http")) return loc;
  return null;
}

fs.mkdirSync(REELS_DIR, { recursive: true });

// Migrate legacy path if present
const legacyDir = path.join(process.cwd(), "public/moments/reels");
if (fs.existsSync(legacyDir)) {
  for (const f of fs.readdirSync(legacyDir)) {
    if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
    const dest = path.join(REELS_DIR, f);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(legacyDir, f), dest);
      console.log("migrated", f);
    }
  }
}

for (const url of urls) {
  const id = shortcode(url);
  if (!id) continue;

  const src = await coverUrl(id);
  if (!src) {
    console.error("No cover for", id);
    continue;
  }

  const img = await fetch(src, { headers });
  if (!img.ok) {
    console.error("Download failed", id, img.status);
    continue;
  }

  const buf = Buffer.from(await img.arrayBuffer());
  const out = path.join(REELS_DIR, `${id}.jpg`);
  fs.writeFileSync(out, buf);
  console.log("saved", id, buf.length, "bytes → /covers/reels/");
}

console.log("Done. Local paths only — no CDN URLs stored.");
