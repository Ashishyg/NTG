import { z } from "zod";
import { sanitizeTextInput } from "@/lib/input-sanitize";

const sanitizedString = z.string().transform(sanitizeTextInput);

const registrationTermsField = {
  acceptedTerms: z.literal(true, {
    message: "You must accept the terms to apply.",
  }),
};

const listingFieldTypeEnum = z.enum([
  "SECTION_HEADING",
  "DESCRIPTION",
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "DROPDOWN",
  "LINEAR_SCALE",
  "MULTIPLE_CHOICE_GRID",
  "CHECKBOX_GRID",
  "DATE",
  "TIME",
  "FILE_UPLOAD",
]);

const responseValueSchema = z.union([
  sanitizedString.pipe(z.string().max(6000)),
  z.array(sanitizedString.pipe(z.string().max(200))).max(20),
  z.record(
    z.string(),
    z.union([
      sanitizedString.pipe(z.string().max(200)),
      z.array(sanitizedString.pipe(z.string().max(200))).max(20),
    ]),
  ),
]);

export const listingFormFieldInputSchema = z
  .object({
    id: z.string().min(10).max(64).optional(),
    sortOrder: z.number().int().min(0).max(999),
    fieldType: listingFieldTypeEnum,
    label: sanitizedString.pipe(z.string().min(1).max(200)),
    helpText: sanitizedString.pipe(z.string().max(2000)).optional().nullable(),
    required: z.boolean().optional(),
    options: z.array(sanitizedString.pipe(z.string().min(1).max(120))).max(30).optional(),
    scaleMin: z.number().int().min(0).max(10).optional(),
    scaleMax: z.number().int().min(1).max(10).optional(),
    scaleMinLabel: sanitizedString.pipe(z.string().max(80)).optional().nullable(),
    scaleMaxLabel: sanitizedString.pipe(z.string().max(80)).optional().nullable(),
    gridRows: z.array(sanitizedString.pipe(z.string().min(1).max(120))).max(20).optional(),
    gridColumns: z.array(sanitizedString.pipe(z.string().min(1).max(120))).max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(data.fieldType) &&
      (!data.options || data.options.length < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Choice fields need at least 2 options.",
        path: ["options"],
      });
    }
    if (data.fieldType === "LINEAR_SCALE" && (data.scaleMax ?? 5) <= (data.scaleMin ?? 1)) {
      ctx.addIssue({
        code: "custom",
        message: "Linear scale max must be greater than min.",
        path: ["scaleMax"],
      });
    }
    if (
      ["MULTIPLE_CHOICE_GRID", "CHECKBOX_GRID"].includes(data.fieldType) &&
      ((data.gridRows?.length ?? 0) < 1 || (data.gridColumns?.length ?? 0) < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Grid fields need at least 1 row and 2 columns.",
        path: ["gridRows"],
      });
    }
  });

export const replaceListingFormFieldsSchema = z.object({
  fields: z.array(listingFormFieldInputSchema).max(100),
});

export const listingApplySchema = z.object({
  responses: z.record(z.string(), responseValueSchema).optional(),
  message: sanitizedString.pipe(z.string().max(6000)).optional(),
  ...registrationTermsField,
});

export const createListingSchema = z.object({
  slug: sanitizedString.pipe(z.string().max(80)).optional(),
  type: z.enum(["JOB", "ROSTER_TRYOUT"]),
  title: sanitizedString.pipe(z.string().min(3).max(120)),
  description: sanitizedString.pipe(z.string().max(8000)).optional(),
  gameKey: sanitizedString.pipe(z.string().max(48)).optional(),
  gameLabel: sanitizedString.pipe(z.string().max(80)).optional(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const updateListingSchema = createListingSchema.partial();

export const updateRosterTeamSchema = z.object({
  gameLabel: sanitizedString.pipe(z.string().min(2).max(80)).optional(),
  status: z.enum(["ACTIVE", "RECRUITING"]).optional(),
  benefitsMarkdown: sanitizedString.pipe(z.string().max(12000)).optional(),
  tryoutsOpenAt: z.string().datetime({ offset: true }).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const addRosterPlayerSchema = z
  .object({
    userId: z.string().min(10).max(64).optional(),
    username: sanitizedString.pipe(z.string().min(2).max(48)).optional(),
    roleLabel: sanitizedString.pipe(z.string().max(32)).optional(),
    bio: sanitizedString.pipe(z.string().max(500)).optional(),
    sortOrder: z.number().int().min(0).max(99).optional(),
    replace: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.userId || data.username), {
    message: "Select a member to add.",
    path: ["userId"],
  });

export const createRosterTeamSchema = z.object({
  gameKey: sanitizedString.pipe(z.string().min(2).max(48)),
  gameLabel: sanitizedString.pipe(z.string().min(2).max(80)),
  status: z.enum(["ACTIVE", "RECRUITING"]).optional(),
  benefitsMarkdown: sanitizedString.pipe(z.string().max(12000)).optional(),
});
