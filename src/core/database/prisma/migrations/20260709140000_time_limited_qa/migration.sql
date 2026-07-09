-- CreateTable
CREATE TABLE "TimeLimitedQaCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'qa',
    "title" TEXT NOT NULL DEFAULT 'Q&A',
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeLimitedQaCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLimitedQaFormField" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "fieldType" "ListingFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeLimitedQaFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLimitedQaResponse" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "submitterName" TEXT,
    "responses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeLimitedQaResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeLimitedQaCampaign_slug_key" ON "TimeLimitedQaCampaign"("slug");

-- CreateIndex
CREATE INDEX "TimeLimitedQaFormField_campaignId_sortOrder_idx" ON "TimeLimitedQaFormField"("campaignId", "sortOrder");

-- CreateIndex
CREATE INDEX "TimeLimitedQaResponse_campaignId_createdAt_idx" ON "TimeLimitedQaResponse"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "TimeLimitedQaFormField" ADD CONSTRAINT "TimeLimitedQaFormField_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TimeLimitedQaCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLimitedQaResponse" ADD CONSTRAINT "TimeLimitedQaResponse_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TimeLimitedQaCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLimitedQaResponse" ADD CONSTRAINT "TimeLimitedQaResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default campaign
INSERT INTO "TimeLimitedQaCampaign" ("id", "slug", "title", "description", "active", "updatedAt")
SELECT 'qa-default', 'qa', 'Q&A', 'Ask us anything while this form is open.', true, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "TimeLimitedQaCampaign" WHERE "slug" = 'qa');
