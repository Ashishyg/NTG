-- CreateEnum
CREATE TYPE "RosterTeamStatus" AS ENUM ('ACTIVE', 'RECRUITING');
CREATE TYPE "ListingType" AS ENUM ('JOB', 'ROSTER_TRYOUT');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- AlterEnum
ALTER TYPE "UserActivityAction" ADD VALUE 'LISTING_APPLY';

-- CreateTable
CREATE TABLE "RosterTeam" (
    "id" TEXT NOT NULL,
    "gameKey" TEXT NOT NULL,
    "gameLabel" TEXT NOT NULL,
    "status" "RosterTeamStatus" NOT NULL DEFAULT 'RECRUITING',
    "benefitsMarkdown" TEXT,
    "tryoutsOpenAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RosterPlayer" (
    "id" TEXT NOT NULL,
    "rosterTeamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameKey" TEXT,
    "gameLabel" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingApplication" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "snapshotDisplayName" TEXT,
    "snapshotPhone" TEXT,
    "snapshotRiotId" TEXT,
    "snapshotRankTier" TEXT,
    "snapshotRankTierId" INTEGER,
    "snapshotValorantRoles" JSONB,
    "snapshotSteamId64" TEXT,
    "snapshotCs2Hours" DOUBLE PRECISION,
    "snapshotCs2PeakPremier" TEXT,
    "snapshotCs2FaceitRank" TEXT,
    "snapshotOlympusId" TEXT,
    "snapshotDateOfBirth" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RosterTeam_gameKey_key" ON "RosterTeam"("gameKey");
CREATE INDEX "RosterTeam_sortOrder_idx" ON "RosterTeam"("sortOrder");
CREATE UNIQUE INDEX "RosterPlayer_rosterTeamId_userId_key" ON "RosterPlayer"("rosterTeamId", "userId");
CREATE INDEX "RosterPlayer_rosterTeamId_sortOrder_idx" ON "RosterPlayer"("rosterTeamId", "sortOrder");
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
CREATE INDEX "Listing_status_type_sortOrder_idx" ON "Listing"("status", "type", "sortOrder");
CREATE UNIQUE INDEX "ListingApplication_listingId_userId_key" ON "ListingApplication"("listingId", "userId");
CREATE INDEX "ListingApplication_listingId_createdAt_idx" ON "ListingApplication"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_rosterTeamId_fkey" FOREIGN KEY ("rosterTeamId") REFERENCES "RosterTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingApplication" ADD CONSTRAINT "ListingApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingApplication" ADD CONSTRAINT "ListingApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default roster teams and CS2 tryout listing
INSERT INTO "RosterTeam" ("id", "gameKey", "gameLabel", "status", "benefitsMarkdown", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('roster_valorant', 'valorant', 'Valorant', 'ACTIVE', E'## Why play for NTG?\n\n- Dedicated practice slots at the NTG lounge\n- Tournament entries and scrim support\n- Coaching and VOD review with staff\n- Community events and LAN access\n\n_Content is placeholder — edit in admin._', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('roster_cs2', 'cs2', 'Counter-Strike 2', 'RECRUITING', E'## Why play for NTG?\n\n- High-spec PC setups and stable LAN\n- Team practice room bookings\n- NTG-hosted cups and external event support\n- Growth path from open tryouts to main roster\n\n_Content is placeholder — edit in admin._', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Listing" ("id", "slug", "type", "title", "description", "gameKey", "gameLabel", "status", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('listing_cs2_tryout', 'ntg-cs2-team-applications-open', 'ROSTER_TRYOUT', 'NTG CS2 Team — Applications Open', E'We are building the official NTG Counter-Strike 2 roster. Apply with your linked Steam profile and rank details from your NTG account.\n\n**Requirements:** NTG member account, linked Steam, CS2 rank info on profile.', 'cs2', 'Counter-Strike 2', 'OPEN', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
