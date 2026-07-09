"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ListingFormFieldView, ListingFormResponses } from "@core/contracts/roster-listings";
import { isListingInputField } from "@/modules/roster-listings/domain/listing-form";
import ListingFormFields from "@/components/platform/listings/ListingFormFields";

type Props = {
  title: string;
  description: string | null;
  formFields: ListingFormFieldView[];
  isLoggedIn: boolean;
  memberDisplayName?: string | null;
};

function isEmptyResponse(value: ListingFormResponses[string] | undefined): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function hasRequiredInput(
  fields: ListingFormFieldView[],
  responses: ListingFormResponses,
): boolean {
  const required = fields.filter((f) => f.required && isListingInputField(f.fieldType));
  if (required.length === 0) return true;
  return required.every((f) => !isEmptyResponse(responses[f.id]));
}

export default function QaApplyForm({
  title,
  description,
  formFields,
  isLoggedIn,
  memberDisplayName,
}: Props) {
  const [responses, setResponses] = useState<ListingFormResponses>({});
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayFields = useMemo(
    () => formFields.filter((f) => f.fieldType !== "SECTION_HEADING"),
    [formFields],
  );

  const canSubmit = hasRequiredInput(displayFields, responses);

  function updateField(
    fieldId: string,
    value: string | string[] | Record<string, string | string[]>,
  ) {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    if (!isAnonymous && !isLoggedIn && !guestName.trim()) {
      setError("Enter your name or check Stay anonymous.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/qa/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAnonymous,
        guestName: isLoggedIn ? undefined : guestName.trim() || undefined,
        responses,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Could not submit your response.");
      return;
    }

    setSuccess(true);
    setResponses({});
    setGuestName("");
    setIsAnonymous(false);
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-8 text-center">
        <h2 className="font-display text-xl font-bold text-white">Response sent</h2>
        <p className="mt-2 text-sm text-white/60">
          Thanks — we received your submission while Q&A is open.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-6 rounded-full border border-white/10 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p>
        ) : null}
      </div>

      <ListingFormFields
        fields={displayFields}
        values={responses}
        onChange={updateField}
        disabled={loading}
      />

      <div className="flex flex-col gap-4">
        <label className="flex shrink-0 items-center gap-2.5 text-sm text-white/75">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-white/20"
          />
          <span>Stay anonymous</span>
        </label>

        {isLoggedIn ? (
          !isAnonymous ? (
            <p className="text-sm text-white/50">
              Submitting as{" "}
              <Link
                href="/profile"
                className="font-medium text-[var(--color-brand)] hover:underline"
              >
                {memberDisplayName?.trim() || "your profile name"}
              </Link>
              .
            </p>
          ) : null
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Your name</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={isAnonymous}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              placeholder={isAnonymous ? "Anonymous submission" : "How should we address you?"}
              maxLength={120}
            />
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-300/90">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="cta rounded-full px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Sending…" : "Submit Response"}
      </button>
    </form>
  );
}
