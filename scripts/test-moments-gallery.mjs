import { config } from "dotenv";
config({ path: ".env.local" });

const { getMomentsGallery } = await import(
  "../src/modules/socials-gallery/application/gallery.service.ts"
);

const g = await getMomentsGallery();
console.log("featured images:", g.featured.images.length);
console.log(
  "reels:",
  g.reels.map((r) => ({ id: r.id, thumb: r.thumbnailUrl.slice(0, 60) })),
);
console.log("youtube:", g.youtube?.videoId, g.youtube?.title);
