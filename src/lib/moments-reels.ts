/** Reel captions by shortcode — env INSTAGRAM_REEL_CAPTIONS overrides per index. */
export const reelCaptionsById: Record<string, string> = {
  DZe4zVFJ2oj: "The prophecy has been fulfilled 🗣️",
  DZW7qw3N54a: "Can't end on an L#gaming#gf#fyp",
  DZPVMG_Ma36: "In her element 💅",
};

export function captionForReelId(id: string): string | null {
  const text = reelCaptionsById[id]?.trim();
  return text && text.length > 0 ? text : null;
}
