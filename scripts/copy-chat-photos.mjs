import fs from "fs";
import path from "path";

const assetsDir =
  "C:/Users/Vibhubalan/.cursor/projects/f-Projects-NTG/assets";
const prefix =
  "c__Users_Vibhubalan_AppData_Roaming_Cursor_User_workspaceStorage_b9923edd1519f91675d73a0cd14135d4_images_";

const collageIds = [
  "image-23b767b8-c28b-4c15-b55c-8ad9da2f58af",
  "image-bfda16ae-083f-4e50-b5be-3af52246260e",
  "image-dea5373d-be20-4de8-af12-d477cabca082",
  "image-6926cc00-a086-42a1-9c9e-4497a3f1d5f6",
  "image-e9df4bfb-c0ac-455a-8ff7-aa3e5707fce6",
  "image-c1943fb8-8d7a-498a-a89f-a3c8295f1866",
  "image-5c9440e9-e14f-4b86-849c-3e72f9cc3252",
  "image-1f6e0f62-d01d-4c9c-bbf7-e7460243d18e",
  "image-31d94229-8acd-481e-8c1e-7fb6bd02268f",
];

const collageOut = path.join(process.cwd(), "public/moments/auc-cup-ii");
fs.mkdirSync(collageOut, { recursive: true });

for (const f of fs.readdirSync(collageOut)) {
  if (/\.(png|jpe?g|webp)$/i.test(f)) fs.unlinkSync(path.join(collageOut, f));
}

collageIds.forEach((id, i) => {
  const src = path.join(assetsDir, `${prefix}${id}.png`);
  if (!fs.existsSync(src)) {
    console.error("Missing:", src);
    process.exit(1);
  }
  const num = String(i + 1).padStart(2, "0");
  fs.copyFileSync(src, path.join(collageOut, `${num}.png`));
  console.log(`collage ${num}.png`);
});

console.log(`Done: ${collageIds.length} collage images.`);
