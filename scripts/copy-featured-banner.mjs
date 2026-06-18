import fs from "fs";
import path from "path";

const assetsDir =
  "C:/Users/Vibhubalan/.cursor/projects/f-Projects-NTG/assets";
const prefix =
  "c__Users_Vibhubalan_AppData_Roaming_Cursor_User_workspaceStorage_b9923edd1519f91675d73a0cd14135d4_images_";

const files = [
  "image-9d27fe33-8fc5-4bd3-84e3-04e629568362",
  "image-8ac9568d-d7ad-48c0-90f8-a49912f5cb94",
  "image-a9d6dba4-f4b3-4846-afde-f766c6103066",
];

const outDir = path.join(process.cwd(), "public/moments/featured");
fs.mkdirSync(outDir, { recursive: true });

for (const f of fs.readdirSync(outDir)) {
  if (/\.(png|jpe?g|webp)$/i.test(f)) fs.unlinkSync(path.join(outDir, f));
}

files.forEach((id, i) => {
  const src = path.join(assetsDir, `${prefix}${id}.png`);
  if (!fs.existsSync(src)) {
    console.error("Missing:", src);
    process.exit(1);
  }
  const num = String(i + 1).padStart(2, "0");
  fs.copyFileSync(src, path.join(outDir, `${num}.png`));
  console.log("saved", `${num}.png`);
});

console.log("Done — 3 featured banner images.");
