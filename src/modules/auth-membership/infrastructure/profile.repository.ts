import { prisma } from "@core/database/client";
import type { PublicProfile } from "@core/contracts";
import type { CreateGameIdentityInput, UpdateProfileInput } from "../domain/types";

export class ProfileRepository {
  async findPublicByUserId(userId: string): Promise<PublicProfile | null> {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { image: true } },
        gameLinks: true,
      },
    });
    if (!profile) return null;
    return {
      id: profile.id,
      displayName: profile.displayName,
      town: profile.town,
      image: profile.user.image,
      gameLinks: profile.gameLinks.map((g) => ({
        game: g.game,
        platform: g.platform,
        externalId: g.externalId,
        verified: g.verified,
      })),
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicProfile | null> {
    const existing = await prisma.playerProfile.findUnique({ where: { userId } });
    if (!existing) return null;
    await prisma.playerProfile.update({
      where: { userId },
      data: {
        displayName: input.displayName,
        town: input.town,
        bio: input.bio,
      },
    });
    return this.findPublicByUserId(userId);
  }

  async linkGameIdentity(
    userId: string,
    input: CreateGameIdentityInput,
  ): Promise<PublicProfile | null> {
    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (!profile) return null;
    await prisma.gameIdentity.upsert({
      where: {
        profileId_game_platform: {
          profileId: profile.id,
          game: input.game,
          platform: input.platform,
        },
      },
      create: {
        profileId: profile.id,
        game: input.game,
        platform: input.platform,
        externalId: input.externalId,
      },
      update: { externalId: input.externalId },
    });
    return this.findPublicByUserId(userId);
  }
}
