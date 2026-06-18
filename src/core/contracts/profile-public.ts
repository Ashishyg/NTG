import type { GameSlug } from "@prisma/client";

export type PublicGameIdentity = {
  game: GameSlug;
  platform: string;
  externalId: string;
  verified: boolean;
};

export type PublicProfile = {
  id: string;
  displayName: string;
  town: string;
  image: string | null;
  gameLinks: PublicGameIdentity[];
};
