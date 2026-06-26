-- CreateEnum
CREATE TYPE "UserActivityAction" AS ENUM (
  'SIGNUP',
  'LEAVE',
  'PROFILE_UPDATE',
  'RIOT_LINK',
  'RIOT_UNLINK',
  'STEAM_LINK',
  'STEAM_UNLINK',
  'TOURNAMENT_REGISTER',
  'TOURNAMENT_UNREGISTER'
);

-- CreateTable
CREATE TABLE "UserActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "action" "UserActivityAction" NOT NULL,
    "target" TEXT,
    "details" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_action_createdAt_idx" ON "UserActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "UserActivityLog_createdAt_idx" ON "UserActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
