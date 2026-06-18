#!/usr/bin/env node
/**
 * Import tournament photos into public/moments/auc-cup-ii/
 *
 * Usage:
 *   node scripts/import-moments-photos.mjs path/to/downloaded/photos
 *
 * - Dedupes by file content hash (skips duplicates)
 * - Renames to 01.jpg, 02.jpg, …
 * - Outputs .webp when source is png; keeps jpg/jpeg as jpg
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const OUT_DIR = path.join(process.cwd(), "public", "moments", "auc-cup-ii");

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function collectImages(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectImages(full));
    } else if (IMAGE_EXT.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function extFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpeg" || ext === ".jpg") return ".jpg";
  if (ext === ".png") return ".png";
  if (ext === ".webp") return ".webp";
  return ".jpg";
}

function main() {
  const sourceDir = process.argv[2];
  if (!sourceDir) {
    console.error("Usage: node scripts/import-moments-photos.mjs <source-folder>");
    process.exit(1);
  }

  const resolved = path.resolve(sourceDir);
  if (!fs.existsSync(resolved)) {
    console.error(`Source folder not found: ${resolved}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seen = new Set();
  const unique = [];
  for (const file of collectImages(resolved)) {
    const h = hashFile(file);
    if (seen.has(h)) {
      console.log(`Skip duplicate: ${file}`);
      continue;
    }
    seen.add(h);
    unique.push(file);
  }

  unique.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  const existing = fs.readdirSync(OUT_DIR).filter((f) => IMAGE_EXT.test(f));
  for (const f of existing) {
    fs.unlinkSync(path.join(OUT_DIR, f));
  }

  let index = 1;
  for (const file of unique) {
    const ext = extFor(file);
    const outName = `${String(index).padStart(2, "0")}${ext}`;
    const outPath = path.join(OUT_DIR, outName);
    fs.copyFileSync(file, outPath);
    console.log(`→ ${outName}  (${path.basename(file)})`);
    index += 1;
  }

  console.log(`\nImported ${unique.length} photo(s) to public/moments/auc-cup-ii/`);
}

main();
