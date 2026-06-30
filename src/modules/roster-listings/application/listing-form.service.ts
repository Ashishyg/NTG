import { prisma } from "@core/database/client";
import type { ListingFieldType } from "@prisma/client";
import { sanitizeTextInput } from "@/lib/input-sanitize";
import {
  defaultJobFormTemplate,
  defaultTryoutFormTemplate,
  formatResponsesAsMessage,
  isGridField,
  isListingInputField,
  mapListingFormField,
  serializeFieldOptions,
  type ListingFormFieldView,
  type ListingFormResponses,
} from "../domain/listing-form";

export type ListingFormFieldInput = {
  id?: string;
  sortOrder: number;
  fieldType: ListingFieldType;
  label: string;
  helpText?: string | null;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;
  gridRows?: string[];
  gridColumns?: string[];
};

export async function listListingFormFields(slug: string): Promise<ListingFormFieldView[] | null> {
  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      formFields: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing) return null;
  return listing.formFields.map(mapListingFormField);
}

function isEmptyResponse(value: ListingFormResponses[string] | undefined): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export async function replaceListingFormFields(
  slug: string,
  fields: ListingFormFieldInput[],
): Promise<{ ok: true; fields: ListingFormFieldView[] } | { ok: false; error: string }> {
  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing) return { ok: false, error: "Listing not found." };

  const normalized = fields.map((f, index) => ({
    sortOrder: f.sortOrder ?? index,
    fieldType: f.fieldType,
    label: f.label.trim(),
    helpText: f.helpText?.trim() || null,
    required: Boolean(f.required) && isListingInputField(f.fieldType),
    options: serializeFieldOptions(f),
  }));

  for (const field of normalized) {
    if (!field.label) return { ok: false, error: "Every field needs a label." };
    const mapped = mapListingFormField({
      id: "x",
      sortOrder: field.sortOrder,
      fieldType: field.fieldType,
      label: field.label,
      helpText: field.helpText,
      required: field.required,
      options: field.options,
    });
    if (
      ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "DROPDOWN"].includes(field.fieldType) &&
      mapped.options.length < 2
    ) {
      return { ok: false, error: `"${field.label}" needs at least 2 options.` };
    }
    if (field.fieldType === "LINEAR_SCALE" && mapped.scaleMax <= mapped.scaleMin) {
      return { ok: false, error: `"${field.label}" needs a valid scale range.` };
    }
    if (
      isGridField(field.fieldType) &&
      (mapped.gridRows.length < 1 || mapped.gridColumns.length < 2)
    ) {
      return { ok: false, error: `"${field.label}" needs at least 1 row and 2 columns.` };
    }
  }

  const saved = await prisma.$transaction(async (tx) => {
    await tx.listingFormField.deleteMany({ where: { listingId: listing.id } });
    if (normalized.length === 0) return [];

    await tx.listingFormField.createMany({
      data: normalized.map((f) => ({
        listingId: listing.id,
        sortOrder: f.sortOrder,
        fieldType: f.fieldType,
        label: f.label,
        helpText: f.helpText,
        required: f.required,
        options: f.options ?? undefined,
      })),
    });

    return tx.listingFormField.findMany({
      where: { listingId: listing.id },
      orderBy: { sortOrder: "asc" },
    });
  });

  return { ok: true, fields: saved.map(mapListingFormField) };
}

export function getDefaultFormTemplate(
  type: "JOB" | "ROSTER_TRYOUT",
): Omit<ListingFormFieldView, "id">[] {
  return type === "JOB" ? defaultJobFormTemplate() : defaultTryoutFormTemplate();
}

const SHORT_TEXT_MAX = 500;
const LONG_TEXT_MAX = 6000;

export function validateListingResponses(
  fields: ListingFormFieldView[],
  raw: ListingFormResponses | undefined,
): { ok: true; responses: ListingFormResponses; message: string | null } | { ok: false; error: string } {
  const inputFields = fields.filter((f) => isListingInputField(f.fieldType));
  const responses: ListingFormResponses = {};

  for (const field of inputFields) {
    const rawValue = raw?.[field.id];

    if (isEmptyResponse(rawValue)) {
      if (field.required) {
        return { ok: false, error: `"${field.label}" is required.` };
      }
      continue;
    }

    if (field.fieldType === "MULTIPLE_CHOICE") {
      if (!Array.isArray(rawValue)) {
        return { ok: false, error: `"${field.label}" must be a list of choices.` };
      }
      const cleaned = rawValue
        .map((v) => (typeof v === "string" ? sanitizeTextInput(v).trim() : ""))
        .filter(Boolean);
      if (field.required && cleaned.length === 0) {
        return { ok: false, error: `"${field.label}" is required.` };
      }
      for (const choice of cleaned) {
        if (!field.options.includes(choice)) {
          return { ok: false, error: `Invalid option for "${field.label}".` };
        }
      }
      responses[field.id] = cleaned;
      continue;
    }

    if (isGridField(field.fieldType)) {
      if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
        return { ok: false, error: `"${field.label}" has an invalid grid response.` };
      }
      const grid: Record<string, string | string[]> = {};
      for (const row of field.gridRows) {
        const cell = rawValue[row];
        if (cell == null || cell === "") continue;
        if (field.fieldType === "MULTIPLE_CHOICE_GRID") {
          if (typeof cell !== "string" || !field.gridColumns.includes(cell)) {
            return { ok: false, error: `Invalid grid answer for "${field.label}".` };
          }
          grid[row] = cell;
        } else {
          if (!Array.isArray(cell)) {
            return { ok: false, error: `Invalid grid answer for "${field.label}".` };
          }
          const cleaned = cell.filter((c) => field.gridColumns.includes(c));
          if (cleaned.length > 0) grid[row] = cleaned;
        }
      }
      if (field.required && Object.keys(grid).length === 0) {
        return { ok: false, error: `"${field.label}" is required.` };
      }
      if (Object.keys(grid).length > 0) responses[field.id] = grid;
      continue;
    }

    if (Array.isArray(rawValue) || (typeof rawValue === "object" && rawValue !== null)) {
      return { ok: false, error: `"${field.label}" must be a single value.` };
    }

    const text = sanitizeTextInput(String(rawValue)).trim();
    if (!text) {
      if (field.required) {
        return { ok: false, error: `"${field.label}" is required.` };
      }
      continue;
    }

    if (field.fieldType === "SHORT_TEXT" && text.length > SHORT_TEXT_MAX) {
      return { ok: false, error: `"${field.label}" is too long.` };
    }
    if (field.fieldType === "LONG_TEXT" && text.length > LONG_TEXT_MAX) {
      return { ok: false, error: `"${field.label}" is too long.` };
    }
    if (
      ["SINGLE_CHOICE", "DROPDOWN"].includes(field.fieldType) &&
      !field.options.includes(text)
    ) {
      return { ok: false, error: `Invalid option for "${field.label}".` };
    }
    if (field.fieldType === "LINEAR_SCALE") {
      const num = Number(text);
      if (!Number.isInteger(num) || num < field.scaleMin || num > field.scaleMax) {
        return { ok: false, error: `Pick a value between ${field.scaleMin} and ${field.scaleMax}.` };
      }
    }
    if (field.fieldType === "DATE" && Number.isNaN(Date.parse(text))) {
      return { ok: false, error: `"${field.label}" must be a valid date.` };
    }
    if (field.fieldType === "TIME" && !/^\d{2}:\d{2}$/.test(text)) {
      return { ok: false, error: `"${field.label}" must be a valid time.` };
    }

    responses[field.id] = text;
  }

  const message = formatResponsesAsMessage(fields, responses) || null;
  return { ok: true, responses, message };
}

export { mapListingFormField };
