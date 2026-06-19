-- CreateEnum
CREATE TYPE "LeaderboardSyncSource" AS ENUM ('CRON', 'MANUAL', 'PROFILE', 'RIOT_LINK', 'REGISTRATION', 'ADMIN_MEMBER');

-- CreateTable
CREATE TABLE "LeaderboardRankAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riotGameName" TEXT,
    "riotTagLine" TEXT,
    "source" "LeaderboardSyncSource" NOT NULL,
    "runId" TEXT,
    "adminId" TEXT,
    "previousRankTier" TEXT,
    "previousRankTierId" INTEGER,
    "previousMmr" INTEGER,
    "newRankTier" TEXT,
    "newRankTierId" INTEGER,
    "newMmr" INTEGER,
    "changed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardRankAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaderboardRankAuditLog_userId_createdAt_idx" ON "LeaderboardRankAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardRankAuditLog_source_createdAt_idx" ON "LeaderboardRankAuditLog"("source", "createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardRankAuditLog_runId_idx" ON "LeaderboardRankAuditLog"("runId");

-- CreateIndex
CREATE INDEX "LeaderboardRankAuditLog_createdAt_idx" ON "LeaderboardRankAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "LeaderboardRankAuditLog" ADD CONSTRAINT "LeaderboardRankAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
