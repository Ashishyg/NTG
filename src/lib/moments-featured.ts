export type FeaturedDeckImage = {
  src: string;
  alt: string;
  gridClass: string;
};

export type FeaturedDeck = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  images: FeaturedDeckImage[];
};

export const loungeFeaturedDeck: FeaturedDeck = {
  slug: "auc-cup-ii",
  eyebrow: "Featured",
  title: "NTG × Aorus Cafe League",
  subtitle: "AUC CUP II · Mangaluru",
  images: [1, 2, 3].map((n) => ({
    src: `/moments/featured/${String(n).padStart(2, "0")}.png`,
    alt: `AUC Cup II at NTG Lounge — photo ${n}`,
    gridClass: "",
  })),
};
