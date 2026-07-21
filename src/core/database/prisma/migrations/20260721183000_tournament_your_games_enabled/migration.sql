-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "yourGamesEnabled" BOOLEAN NOT NULL DEFAULT true;
