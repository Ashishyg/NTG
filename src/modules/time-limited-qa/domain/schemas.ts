import { z } from "zod";
import { sanitizeTextInput } from "@/lib/input-sanitize";
import { listingFormFieldInputSchema } from "@roster-listings/domain/schemas";

const sanitizedString = z.string().transform(sanitizeTextInput);

const responseValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.union([z.string(), z.array(z.string())])),
]);

export const replaceQaFormFieldsSchema = z.object({
  fields: z.array(listingFormFieldInputSchema).max(100),
});

export const updateQaCampaignSchema = z.object({
  enabled: z.boolean().optional(),
  title: sanitizedString.pipe(z.string().min(1).max(120)).optional(),
  description: sanitizedString.pipe(z.string().max(8000)).nullable().optional(),
  active: z.boolean().optional(),
});

export const qaSubmitSchema = z.object({
  isAnonymous: z.boolean().default(false),
  guestName: sanitizedString.pipe(z.string().max(120)).optional(),
  responses: z.record(z.string(), responseValueSchema).optional(),
});
