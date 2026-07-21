-- CreateEnum
CREATE TYPE "StageType" AS ENUM (
  'SINGLE_ELIMINATION',
  'DOUBLE_ELIMINATION',
  'ROUND_ROBIN',
  'SWISS',
  'GSL',
  'LEAGUE',
  'FREE_FOR_ALL',
  'BATTLE_ROYALE',
  'CUSTOM'
);

CREATE TYPE "StageStatus" AS ENUM ('DRAFT', 'READY', 'LIVE', 'COMPLETE');

CREATE TYPE "StageMatchFormat" AS ENUM ('BO1', 'BO3', 'BO5');

CREATE TYPE "SeedingMethod" AS ENUM (
  'RANDOM',
  'MANUAL',
  'SNAKE',
  'AUCTION_ORDER',
  'PREVIOUS_TOURNAMENT',
  'CURRENT_RANKING',
  'DRAG_DROP'
);

-- CreateTable
CREATE TABLE "TournamentStage" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "stageType" "StageType" NOT NULL,
    "matchFormat" "StageMatchFormat" NOT NULL DEFAULT 'BO1',
    "seedingMethod" "SeedingMethod" NOT NULL DEFAULT 'MANUAL',
    "status" "StageStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB,
    "tieBreakRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentStageGroup" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentStageGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StageGroupSlot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "teamId" TEXT,
    "sourceStageId" TEXT,
    "sourceGroupId" TEXT,
    "sourcePosition" INTEGER,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageGroupSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StageQualificationRule" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "groupId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "selector" JSONB NOT NULL,
    "destination" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageQualificationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StageSeedingEntry" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageSeedingEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable Bracket: stage-scoped + nullable legacy tournamentId
ALTER TABLE "Bracket" ALTER COLUMN "tournamentId" DROP NOT NULL;
ALTER TABLE "Bracket" ADD COLUMN "stageId" TEXT;

-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN "stageGroupId" TEXT;

-- AlterTable MatchParticipant
ALTER TABLE "MatchParticipant" ADD COLUMN "tournamentTeamId" TEXT;

-- Indexes / uniques
CREATE UNIQUE INDEX "TournamentStage_tournamentId_order_key" ON "TournamentStage"("tournamentId", "order");
CREATE INDEX "TournamentStage_tournamentId_idx" ON "TournamentStage"("tournamentId");

CREATE UNIQUE INDEX "TournamentStageGroup_stageId_order_key" ON "TournamentStageGroup"("stageId", "order");
CREATE INDEX "TournamentStageGroup_stageId_idx" ON "TournamentStageGroup"("stageId");

CREATE UNIQUE INDEX "StageGroupSlot_groupId_slotIndex_key" ON "StageGroupSlot"("groupId", "slotIndex");
CREATE INDEX "StageGroupSlot_teamId_idx" ON "StageGroupSlot"("teamId");
CREATE INDEX "StageGroupSlot_sourceStageId_idx" ON "StageGroupSlot"("sourceStageId");

CREATE INDEX "StageQualificationRule_stageId_idx" ON "StageQualificationRule"("stageId");
CREATE INDEX "StageQualificationRule_groupId_idx" ON "StageQualificationRule"("groupId");

CREATE UNIQUE INDEX "StageSeedingEntry_stageId_teamId_key" ON "StageSeedingEntry"("stageId", "teamId");
CREATE UNIQUE INDEX "StageSeedingEntry_stageId_seed_key" ON "StageSeedingEntry"("stageId", "seed");
CREATE INDEX "StageSeedingEntry_stageId_idx" ON "StageSeedingEntry"("stageId");

CREATE UNIQUE INDEX "Bracket_stageId_key" ON "Bracket"("stageId");
CREATE INDEX "Match_stageGroupId_idx" ON "Match"("stageGroupId");
CREATE INDEX "MatchParticipant_tournamentTeamId_idx" ON "MatchParticipant"("tournamentTeamId");

-- FKs
ALTER TABLE "TournamentStage" ADD CONSTRAINT "TournamentStage_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentStageGroup" ADD CONSTRAINT "TournamentStageGroup_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StageGroupSlot" ADD CONSTRAINT "StageGroupSlot_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "TournamentStageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageGroupSlot" ADD CONSTRAINT "StageGroupSlot_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StageGroupSlot" ADD CONSTRAINT "StageGroupSlot_sourceStageId_fkey"
  FOREIGN KEY ("sourceStageId") REFERENCES "TournamentStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StageGroupSlot" ADD CONSTRAINT "StageGroupSlot_sourceGroupId_fkey"
  FOREIGN KEY ("sourceGroupId") REFERENCES "TournamentStageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StageQualificationRule" ADD CONSTRAINT "StageQualificationRule_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageQualificationRule" ADD CONSTRAINT "StageQualificationRule_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "TournamentStageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StageSeedingEntry" ADD CONSTRAINT "StageSeedingEntry_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StageSeedingEntry" ADD CONSTRAINT "StageSeedingEntry_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_stageId_fkey"
  FOREIGN KEY ("stageId") REFERENCES "TournamentStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Match" ADD CONSTRAINT "Match_stageGroupId_fkey"
  FOREIGN KEY ("stageGroupId") REFERENCES "TournamentStageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_tournamentTeamId_fkey"
  FOREIGN KEY ("tournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
