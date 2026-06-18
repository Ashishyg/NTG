-- CreateEnum
CREATE TYPE "PlayedGame" AS ENUM ('VALORANT', 'CS2');

-- CreateEnum
CREATE TYPE "RegistrationParticipantRole" AS ENUM ('CAPTAIN', 'PLAYER');

-- CreateEnum
CREATE TYPE "ValorantRole" AS ENUM ('DUELIST', 'INITIATOR', 'CONTROLLER', 'SENTINEL', 'FLEX');

-- CreateEnum
CREATE TYPE "MomentsDisplayMode" AS ENUM ('BLEND', 'CAROUSEL');

-- AlterEnum
ALTER TYPE "TournamentStatus" ADD VALUE 'UPCOMING';

-- AlterTable
ALTER TABLE "LeaderboardEntry" ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "mmr" INTEGER,
ADD COLUMN     "peakMmr" INTEGER,
ADD COLUMN     "premierRating" INTEGER,
ADD COLUMN     "rankTier" TEXT,
ADD COLUMN     "rankTierId" INTEGER;

-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "cs2FaceitRank" TEXT,
ADD COLUMN     "cs2PeakPremierRank" TEXT,
ADD COLUMN     "playedGames" "PlayedGame"[] DEFAULT ARRAY[]::"PlayedGame"[],
ADD COLUMN     "valorantRoles" "ValorantRole"[] DEFAULT ARRAY[]::"ValorantRole"[];

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "autoManageStatus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bracketUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "hubBannerUrl" TEXT,
ADD COLUMN     "hubCarouselImages" JSONB,
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "prizeSplit" JSONB,
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "registrationOpensAt" TIMESTAMP(3),
ADD COLUMN     "showOnEsportsHub" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teams" JSONB;

-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN     "participantRole" "RegistrationParticipantRole" NOT NULL DEFAULT 'PLAYER',
ADD COLUMN     "partnerUserId" TEXT,
ADD COLUMN     "snapshotAccountId" TEXT,
ADD COLUMN     "snapshotCs2FaceitRank" TEXT,
ADD COLUMN     "snapshotCs2Hours" DOUBLE PRECISION,
ADD COLUMN     "snapshotCs2PeakPremier" TEXT,
ADD COLUMN     "snapshotDateOfBirth" DATE,
ADD COLUMN     "snapshotDisplayName" TEXT,
ADD COLUMN     "snapshotOlympusId" TEXT,
ADD COLUMN     "snapshotPartnerAccountId" TEXT,
ADD COLUMN     "snapshotPhone" TEXT,
ADD COLUMN     "snapshotRankTier" TEXT,
ADD COLUMN     "snapshotRankTierId" INTEGER,
ADD COLUMN     "snapshotRiotId" TEXT,
ADD COLUMN     "snapshotSteamId64" TEXT,
ADD COLUMN     "snapshotValorantRoles" JSONB,
ADD COLUMN     "teamId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "cs2HoursPlayed" DOUBLE PRECISION,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "olympusId" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "riotGameName" TEXT,
ADD COLUMN     "riotPuuid" TEXT,
ADD COLUMN     "riotRegion" TEXT,
ADD COLUMN     "riotTagLine" TEXT,
ADD COLUMN     "signupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "steamId64" TEXT,
ADD COLUMN     "steamLinkedAt" TIMESTAMP(3),
ADD COLUMN     "steamPersonaName" TEXT,
ADD COLUMN     "steamProfileUrl" TEXT;

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seed" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "captainUserId" TEXT,
    "logoUrl" TEXT,
    "sourceRegistrationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeamPlayer" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "registrationId" TEXT,
    "displayName" TEXT NOT NULL,
    "riotGameName" TEXT,
    "riotTagLine" TEXT,
    "valorantRoles" JSONB,
    "peakPremierRank" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTeamPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentsFeaturedDeck" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "displayMode" "MomentsDisplayMode" NOT NULL DEFAULT 'BLEND',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomentsFeaturedDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomentsFeaturedImage" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MomentsFeaturedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialReelPost" (
    "id" TEXT NOT NULL,
    "reelUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialReelPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_expiresAt_idx" ON "EmailOtp"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_sourceRegistrationId_key" ON "TournamentTeam"("sourceRegistrationId");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_sortOrder_idx" ON "TournamentTeam"("tournamentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeamPlayer_registrationId_key" ON "TournamentTeamPlayer"("registrationId");

-- CreateIndex
CREATE INDEX "TournamentTeamPlayer_teamId_sortOrder_idx" ON "TournamentTeamPlayer"("teamId", "sortOrder");

-- CreateIndex
CREATE INDEX "TournamentTeamPlayer_registrationId_idx" ON "TournamentTeamPlayer"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "MomentsFeaturedDeck_slug_key" ON "MomentsFeaturedDeck"("slug");

-- CreateIndex
CREATE INDEX "MomentsFeaturedImage_deckId_sortOrder_idx" ON "MomentsFeaturedImage"("deckId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SocialReelPost_reelUrl_key" ON "SocialReelPost"("reelUrl");

-- CreateIndex
CREATE INDEX "TournamentRegistration_tournamentId_participantRole_idx" ON "TournamentRegistration"("tournamentId", "participantRole");

-- CreateIndex
CREATE INDEX "TournamentRegistration_teamId_idx" ON "TournamentRegistration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "User_accountId_key" ON "User"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_riotPuuid_key" ON "User"("riotPuuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_steamId64_key" ON "User"("steamId64");

-- AddForeignKey
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_captainUserId_fkey" FOREIGN KEY ("captainUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeamPlayer" ADD CONSTRAINT "TournamentTeamPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeamPlayer" ADD CONSTRAINT "TournamentTeamPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeamPlayer" ADD CONSTRAINT "TournamentTeamPlayer_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TournamentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentRegistration" ADD CONSTRAINT "TournamentRegistration_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MomentsFeaturedImage" ADD CONSTRAINT "MomentsFeaturedImage_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "MomentsFeaturedDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

