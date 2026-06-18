export type GalleryPreviewItem = {
  id: string;
  platform: string;
  mediaType: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  publishedAt: string | null;
};

export type GalleryPreview = {
  items: GalleryPreviewItem[];
};
