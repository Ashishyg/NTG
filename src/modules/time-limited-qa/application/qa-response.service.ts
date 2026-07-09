import { prisma } from "@core/database/client";
import { sanitizeTextInput } from "@/lib/input-sanitize";
import type { ListingFormResponses } from "@core/contracts/roster-listings";
import type { TimeLimitedQaResponseView } from "@core/contracts/time-limited-qa";
import { validateListingResponses } from "@roster-listings/application/listing-form.service";
import {
  getOrCreateQaCampaign,
  getPublicQaView,
  listQaFormFields,
} from "./qa-campaign.service";
import { formatResponsesAsMessage } from "@roster-listings/domain/listing-form";

export type ResolveQaSubmitterInput = {
  isAnonymous: boolean;
  guestName?: string | null;
  memberDisplayName?: string | null;
  userId?: string | null;
};

export type ResolveQaSubmitterResult =
  | {
      ok: true;
      isAnonymous: boolean;
      submitterName: string | null;
      userId: string | null;
    }
  | { ok: false; error: string };

/** Resolves public-facing submitter identity for Q&A responses. */
export function resolveQaSubmitter(input: ResolveQaSubmitterInput): ResolveQaSubmitterResult {
  if (input.isAnonymous) {
    return {
      ok: true,
      isAnonymous: true,
      submitterName: null,
      userId: input.userId ?? null,
    };
  }

  if (input.userId) {
    const name = input.memberDisplayName?.trim();
    if (!name) {
      return { ok: false, error: "Add a display name on your profile or submit anonymously." };
    }
    return {
      ok: true,
      isAnonymous: false,
      submitterName: name,
      userId: input.userId,
    };
  }

  const guestName = sanitizeTextInput(input.guestName ?? "").trim();
  if (!guestName) {
    return {
      ok: false,
      error: "Enter your name or check Stay anonymous.",
    };
  }

  return {
    ok: true,
    isAnonymous: false,
    submitterName: guestName,
    userId: null,
  };
}

export async function submitQaResponse(input: {
  userId?: string | null;
  isAnonymous: boolean;
  guestName?: string | null;
  responses?: ListingFormResponses;
}): Promise<{ ok: true; responseId: string } | { ok: false; error: string }> {
  const publicView = await getPublicQaView();
  if (!publicView) {
    return { ok: false, error: "Q&A is not open right now." };
  }

  let memberDisplayName: string | null = null;
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        playerProfile: { select: { displayName: true } },
        name: true,
      },
    });
    memberDisplayName =
      user?.playerProfile?.displayName?.trim() || user?.name?.trim() || null;
  }

  const identity = resolveQaSubmitter({
    isAnonymous: input.isAnonymous,
    guestName: input.guestName,
    memberDisplayName,
    userId: input.userId ?? null,
  });
  if (!identity.ok) return identity;

  const validated = validateListingResponses(publicView.formFields, input.responses);
  if (!validated.ok) return validated;

  const campaign = await getOrCreateQaCampaign();
  const row = await prisma.timeLimitedQaResponse.create({
    data: {
      campaignId: campaign.id,
      userId: identity.userId,
      isAnonymous: identity.isAnonymous,
      submitterName: identity.submitterName,
      responses: validated.responses,
    },
    select: { id: true },
  });

  return { ok: true, responseId: row.id };
}

function mapResponseRow(row: {
  id: string;
  createdAt: Date;
  isAnonymous: boolean;
  submitterName: string | null;
  userId: string | null;
  responses: unknown;
  user: { email: string | null } | null;
}): TimeLimitedQaResponseView {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    isAnonymous: row.isAnonymous,
    submitterName: row.isAnonymous ? null : row.submitterName,
    submitterEmail: row.user?.email ?? null,
    userId: row.userId,
    responses: (row.responses as ListingFormResponses | null) ?? null,
  };
}

export async function listQaResponses(): Promise<TimeLimitedQaResponseView[]> {
  const campaign = await getOrCreateQaCampaign();
  const rows = await prisma.timeLimitedQaResponse.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
    },
  });
  return rows.map(mapResponseRow);
}

export async function buildQaResponsesCsv(): Promise<string> {
  const [fields, responses] = await Promise.all([listQaFormFields(), listQaResponses()]);
  const inputFields = fields.filter((f) => f.fieldType !== "SECTION_HEADING" && f.fieldType !== "DESCRIPTION");

  const headers = [
    "Submitted At",
    "Display Name",
    "Anonymous",
    ...inputFields.map((f) => f.label),
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const lines = responses.map((row) => {
    const display =
      row.isAnonymous && !row.submitterName
        ? "Anonymous"
        : row.submitterName ?? "Anonymous";
    const cells = [
      new Date(row.createdAt).toISOString(),
      display,
      row.isAnonymous ? "Yes" : "No",
      ...inputFields.map((field) => {
        const value = row.responses?.[field.id];
        if (value == null) return "";
        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value.join("; ");
        return formatResponsesAsMessage([field], { [field.id]: value }) ?? "";
      }),
    ];
    return cells.map((c) => escape(String(c))).join(",");
  });

  return [headers.map(escape).join(","), ...lines].join("\n");
}
