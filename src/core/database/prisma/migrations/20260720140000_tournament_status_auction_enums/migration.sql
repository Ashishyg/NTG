-- TournamentStatus auction phases exist in Prisma schema but were never migrated.
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_OPEN';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_LIVE';
ALTER TYPE "TournamentStatus" ADD VALUE IF NOT EXISTS 'AUCTION_COMPLETED';
