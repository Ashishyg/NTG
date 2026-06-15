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

export type ReelPreview = {
  id: string;
  permalink: string;
  thumbnailUrl: string;
  title: string | null;
};

export type YoutubePreview = {
  videoId: string;
  title: string;
  permalink: string;
  thumbnailUrl: string;
  publishedAt: string | null;
};

export type MomentsGallery = {
  featured: FeaturedDeck;
  reels: ReelPreview[];
  youtube: YoutubePreview | null;
};
