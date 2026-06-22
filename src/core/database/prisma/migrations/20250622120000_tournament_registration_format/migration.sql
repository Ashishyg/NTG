-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('AUCTION', 'STANDARD');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "registrationFormat" "TournamentFormat";
