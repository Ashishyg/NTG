import type {
  GalleryPreview,
  LeaderboardPreview,
  TournamentPreview,
  TournamentRegistrationBanner,
} from "@core/contracts";
import { getGalleryPreview } from "@socials-gallery/index";
import {
  getActiveRegistrationBanner,
  getValorantRankings,
  listTournamentPreviews,
} from "@tournaments-leagues/index";

export type HomePreviews = {
  tournaments: TournamentPreview[];
  registration: TournamentRegistrationBanner | null;
  leaderboardValorant: LeaderboardPreview;
  gallery: GalleryPreview;
};

export async function getHomePreviews(): Promise<HomePreviews> {
  const [tournaments, registration, leaderboardValorant, gallery] =
    await Promise.all([
      listTournamentPreviews(),
      getActiveRegistrationBanner(),
      getValorantRankings(5),
      getGalleryPreview(3),
    ]);

  return {
    tournaments,
    registration,
    leaderboardValorant,
    gallery,
  };
}
