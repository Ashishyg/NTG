-- CreateEnum
CREATE TYPE "GamepassCategory" AS ENUM ('PLAYSTATION', 'PC');

-- CreateEnum
CREATE TYPE "HostOfferingType" AS ENUM ('SPONSORSHIP', 'BIRTHDAY', 'PRIVATE_EVENT');

-- CreateTable
CREATE TABLE "GamepassPlan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "GamepassCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "priceDay" INTEGER,
    "priceNight" INTEGER,
    "priceSingle" INTEGER,
    "priceController" INTEGER,
    "validityText" TEXT,
    "timeWindowText" TEXT,
    "badge" TEXT,
    "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
    "inquiryOnly" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "whatsappMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GamepassPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostOffering" (
    "id" TEXT NOT NULL,
    "type" "HostOfferingType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "highlights" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SponsorLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GamepassPlan_slug_key" ON "GamepassPlan"("slug");

-- CreateIndex
CREATE INDEX "GamepassPlan_category_active_sortOrder_idx" ON "GamepassPlan"("category", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "GamepassPlan_featuredOnHome_category_idx" ON "GamepassPlan"("featuredOnHome", "category");

-- CreateIndex
CREATE UNIQUE INDEX "HostOffering_type_key" ON "HostOffering"("type");

-- CreateIndex
CREATE INDEX "SponsorLogo_active_sortOrder_idx" ON "SponsorLogo"("active", "sortOrder");
