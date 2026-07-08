-- One team tryout listing per game (Valorant, CS2, etc.)
CREATE UNIQUE INDEX "Listing_roster_tryout_gameKey_unique"
ON "Listing" ("gameKey")
WHERE type = 'ROSTER_TRYOUT' AND "gameKey" IS NOT NULL;
