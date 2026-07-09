export const QA_ENABLED_SETTING_KEY = "time_limited_qa_enabled";
export const DEFAULT_QA_SLUG = "qa";

export type TimeLimitedQaPublicView = {
  slug: string;
  title: string;
  description: string | null;
  formFields: import("@core/contracts/roster-listings").ListingFormFieldView[];
};

export type TimeLimitedQaAdminView = TimeLimitedQaPublicView & {
  enabled: boolean;
  active: boolean;
  responseCount: number;
};

export type TimeLimitedQaResponseView = {
  id: string;
  createdAt: string;
  isAnonymous: boolean;
  submitterName: string | null;
  submitterEmail: string | null;
  userId: string | null;
  responses: import("@core/contracts/roster-listings").ListingFormResponses | null;
};
