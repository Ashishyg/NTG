-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN IF NOT EXISTS "games" JSONB;
