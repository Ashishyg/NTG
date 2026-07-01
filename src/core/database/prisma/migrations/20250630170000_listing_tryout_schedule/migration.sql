-- Tryout window scheduling on listings (replaces roster tryoutsOpenAt)

ALTER TABLE "Listing" ADD COLUMN     "tryoutOpensAt" TIMESTAMP(3),
ADD COLUMN     "tryoutClosesAt" TIMESTAMP(3),
ADD COLUMN     "tryoutOpenDays" INTEGER,
ADD COLUMN     "autoManageTryout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tryoutRepeatDays" INTEGER;

ALTER TABLE "RosterTeam" DROP COLUMN IF EXISTS "tryoutsOpenAt";
