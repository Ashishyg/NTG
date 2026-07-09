import { prisma } from "@core/database/client";
import type { ListingFieldType } from "@prisma/client";
import {
  isGridField,
  isListingInputField,
  mapListingFormField,
  serializeFieldOptions,
  type ListingFormFieldView,
} from "@roster-listings/domain/listing-form";
import {
  DEFAULT_QA_SLUG,
  QA_ENABLED_SETTING_KEY,
  type TimeLimitedQaAdminView,
  type TimeLimitedQaPublicView,
} from "@core/contracts/time-limited-qa";

export type QaFormFieldInput = {
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

export async function isTimeLimitedQaEnabled(): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: QA_ENABLED_SETTING_KEY },
  });
  return row?.value === "true";
}

/** True when the public Q&A nav link and /qa page should be visible. */
export async function isTimeLimitedQaPubliclyVisible(): Promise<boolean> {
  if (!(await isTimeLimitedQaEnabled())) return false;
  const campaign = await prisma.timeLimitedQaCampaign.findUnique({
    where: { slug: DEFAULT_QA_SLUG },
    select: { active: true },
  });
  return campaign?.active ?? false;
}

export async function setTimeLimitedQaEnabled(enabled: boolean, updatedById: string): Promise<void> {
  await prisma.platformSetting.upsert({
    where: { key: QA_ENABLED_SETTING_KEY },
    create: {
      key: QA_ENABLED_SETTING_KEY,
      value: enabled ? "true" : "false",
      updatedById,
    },
    update: {
      value: enabled ? "true" : "false",
      updatedById,
    },
  });
}

export async function getOrCreateQaCampaign() {
  const existing = await prisma.timeLimitedQaCampaign.findUnique({
    where: { slug: DEFAULT_QA_SLUG },
    include: {
      formFields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (existing) return existing;

  return prisma.timeLimitedQaCampaign.create({
    data: {
      slug: DEFAULT_QA_SLUG,
      title: "Q&A",
      description: "Ask us anything while this form is open.",
    },
    include: {
      formFields: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });
}

function mapCampaignFields(
  fields: Awaited<ReturnType<typeof getOrCreateQaCampaign>>["formFields"],
): ListingFormFieldView[] {
  return fields.map(mapListingFormField);
}

export async function getPublicQaView(): Promise<TimeLimitedQaPublicView | null> {
  const enabled = await isTimeLimitedQaEnabled();
  if (!enabled) return null;

  const campaign = await getOrCreateQaCampaign();
  if (!campaign.active) return null;

  return {
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    formFields: mapCampaignFields(campaign.formFields),
  };
}

export async function getAdminQaView(): Promise<TimeLimitedQaAdminView> {
  const [enabled, campaign] = await Promise.all([
    isTimeLimitedQaEnabled(),
    getOrCreateQaCampaign(),
  ]);

  return {
    enabled,
    active: campaign.active,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    formFields: mapCampaignFields(campaign.formFields),
    responseCount: campaign._count.responses,
  };
}

export async function updateQaCampaign(input: {
  enabled?: boolean;
  title?: string;
  description?: string | null;
  active?: boolean;
  updatedById: string;
}): Promise<TimeLimitedQaAdminView> {
  if (input.enabled !== undefined) {
    await setTimeLimitedQaEnabled(input.enabled, input.updatedById);
  }

  const campaign = await getOrCreateQaCampaign();
  if (
    input.title !== undefined ||
    input.description !== undefined ||
    input.active !== undefined
  ) {
    await prisma.timeLimitedQaCampaign.update({
      where: { id: campaign.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
  }

  return getAdminQaView();
}

export async function listQaFormFields(): Promise<ListingFormFieldView[]> {
  const campaign = await getOrCreateQaCampaign();
  return mapCampaignFields(campaign.formFields);
}

export async function replaceQaFormFields(
  fields: QaFormFieldInput[],
): Promise<{ ok: true; fields: ListingFormFieldView[] } | { ok: false; error: string }> {
  const campaign = await getOrCreateQaCampaign();

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
    await tx.timeLimitedQaFormField.deleteMany({ where: { campaignId: campaign.id } });
    if (normalized.length === 0) return [];

    await tx.timeLimitedQaFormField.createMany({
      data: normalized.map((f) => ({
        campaignId: campaign.id,
        sortOrder: f.sortOrder,
        fieldType: f.fieldType,
        label: f.label,
        helpText: f.helpText,
        required: f.required,
        options: f.options ?? undefined,
      })),
    });

    return tx.timeLimitedQaFormField.findMany({
      where: { campaignId: campaign.id },
      orderBy: { sortOrder: "asc" },
    });
  });

  return { ok: true, fields: saved.map(mapListingFormField) };
}

export function defaultQaFormTemplate(): Omit<ListingFormFieldView, "id">[] {
  return [
    {
      sortOrder: 0,
      fieldType: "LONG_TEXT",
      label: "Your response",
      helpText: "Be as specific as you can.",
      required: true,
      options: [],
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: null,
      scaleMaxLabel: null,
      gridRows: [],
      gridColumns: [],
    },
  ];
}
