-- CreateEnum
CREATE TYPE "ListingFieldType" AS ENUM (
  'SECTION_HEADING',
  'DESCRIPTION',
  'SHORT_TEXT',
  'LONG_TEXT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'DROPDOWN'
);

-- CreateTable
CREATE TABLE "ListingFormField" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fieldType" "ListingFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingFormField_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ListingApplication" ADD COLUMN "responses" JSONB;

-- CreateIndex
CREATE INDEX "ListingFormField_listingId_sortOrder_idx" ON "ListingFormField"("listingId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ListingFormField" ADD CONSTRAINT "ListingFormField_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default tryout form for existing CS2 listing
INSERT INTO "ListingFormField" ("id", "listingId", "sortOrder", "fieldType", "label", "helpText", "required", "options", "createdAt", "updatedAt")
SELECT
  'lff_cs2_section',
  l."id",
  0,
  'SECTION_HEADING',
  'Your application',
  NULL,
  false,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Listing" l
WHERE l."slug" = 'ntg-cs2-team-applications-open'
ON CONFLICT DO NOTHING;

INSERT INTO "ListingFormField" ("id", "listingId", "sortOrder", "fieldType", "label", "helpText", "required", "options", "createdAt", "updatedAt")
SELECT
  'lff_cs2_why',
  l."id",
  1,
  'LONG_TEXT',
  'Why do you want to join NTG?',
  'Tell us about your motivation and what you bring to the team.',
  true,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Listing" l
WHERE l."slug" = 'ntg-cs2-team-applications-open'
ON CONFLICT DO NOTHING;

INSERT INTO "ListingFormField" ("id", "listingId", "sortOrder", "fieldType", "label", "helpText", "required", "options", "createdAt", "updatedAt")
SELECT
  'lff_cs2_exp',
  l."id",
  2,
  'LONG_TEXT',
  'Experience & availability',
  'Past teams, hours per week, preferred roles, etc.',
  false,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Listing" l
WHERE l."slug" = 'ntg-cs2-team-applications-open'
ON CONFLICT DO NOTHING;
