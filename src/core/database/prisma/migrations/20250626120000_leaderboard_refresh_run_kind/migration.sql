-- CreateEnum
CREATE TYPE "LeaderboardRefreshRunKind" AS ENUM ('DAILY', 'HOURLY');

-- AlterTable
ALTER TABLE "LeaderboardRefreshRun" ADD COLUMN "kind" "LeaderboardRefreshRunKind" NOT NULL DEFAULT 'HOURLY';

-- CreateIndex
CREATE INDEX "LeaderboardRefreshRun_kind_status_startedAt_idx" ON "LeaderboardRefreshRun"("kind", "status", "startedAt");
