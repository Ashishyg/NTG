-- CreateEnum (idempotent — enum may already exist from db push)
DO $$ BEGIN
  CREATE TYPE "TournamentFormat" AS ENUM ('AUCTION', 'STANDARD');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable (idempotent — column may already exist)
ALTER TABLE "Tournament" ADD COLUMN IF NOT EXISTS "registrationFormat" "TournamentFormat";
