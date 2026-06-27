import type { GamepassCategory, HostOfferingType } from "@prisma/client";

export type GamepassPlanView = {
  id: string;
  slug: string;
  category: GamepassCategory;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceDay: number | null;
  priceNight: number | null;
  priceSingle: number | null;
  priceController: number | null;
  validityText: string | null;
  timeWindowText: string | null;
  badge: string | null;
  featuredOnHome: boolean;
  inquiryOnly: boolean;
  sortOrder: number;
  active: boolean;
  whatsappMessage: string | null;
};

export type HostOfferingView = {
  id: string;
  type: HostOfferingType;
  title: string;
  summary: string;
  body: string | null;
  highlights: string[];
  active: boolean;
};

export type SponsorLogoView = {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  sortOrder: number;
  active: boolean;
};

export type LoungeCommerceHomeData = {
  playstationFeatured: GamepassPlanView[];
  playstationMore: GamepassPlanView[];
  pcPlans: GamepassPlanView[];
  hostOfferings: HostOfferingView[];
  sponsorLogos: SponsorLogoView[];
};

export type UpsertGamepassPlanInput = {
  id?: string;
  slug: string;
  category: GamepassCategory;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  priceDay?: number | null;
  priceNight?: number | null;
  priceSingle?: number | null;
  priceController?: number | null;
  validityText?: string | null;
  timeWindowText?: string | null;
  badge?: string | null;
  featuredOnHome?: boolean;
  inquiryOnly?: boolean;
  sortOrder?: number;
  active?: boolean;
  whatsappMessage?: string | null;
};

export type UpsertHostOfferingInput = {
  type: HostOfferingType;
  title: string;
  summary: string;
  body?: string | null;
  highlights?: string[];
  active?: boolean;
};

export type UpsertSponsorLogoInput = {
  id?: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string | null;
  sortOrder?: number;
  active?: boolean;
};

const MAX_FEATURED_PER_CATEGORY = 4;

export { MAX_FEATURED_PER_CATEGORY };
