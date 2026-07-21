-- AlterEnum
CREATE TYPE "MatchScheduleStatus" AS ENUM ('UNSET', 'PENDING_CONFIRM', 'CONFIRMED', 'NEEDS_RESCHEDULE');

-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "scheduleStatus" "MatchScheduleStatus" NOT NULL DEFAULT 'UNSET';
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "scheduleProposedByTeamId" TEXT;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "confirmedBySlot0" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "confirmedBySlot1" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "resultDeadlineAt" TIMESTAMP(3);

-- AlterTable MatchResult
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "scoreA" INTEGER;
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "scoreB" INTEGER;
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "screenshotUrl" TEXT;
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "submittedByUserId" TEXT;

-- Indexes and FKs
CREATE INDEX IF NOT EXISTS "Match_scheduleProposedByTeamId_idx" ON "Match"("scheduleProposedByTeamId");
CREATE INDEX IF NOT EXISTS "MatchResult_submittedByUserId_idx" ON "MatchResult"("submittedByUserId");

ALTER TABLE "Match" ADD CONSTRAINT "Match_scheduleProposedByTeamId_fkey" FOREIGN KEY ("scheduleProposedByTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
