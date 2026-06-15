import type { GameSlug } from "@prisma/client";

export type { UserRole } from "@prisma/client";

export type CreateGameIdentityInput = {
  game: GameSlug;
  platform: string;
  externalId: string;
};

export type UpdateProfileInput = {
  displayName?: string;
  town?: string;
  bio?: string;
};
