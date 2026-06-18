import type { TournamentRegistrationBanner } from "@core/contracts";
import type { TournamentDisplay } from "@/lib/tournament-display";

export type TournamentVaultProps = {
  tournaments: TournamentDisplay[];
  registration: TournamentRegistrationBanner | null;
};
