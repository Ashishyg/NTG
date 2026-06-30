"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ListingDetail,
  ListingEligibility,
  ListingFormFieldView,
  ListingFormResponses,
} from "@core/contracts/roster-listings";
import { isListingInputField } from "@/modules/roster-listings/domain/listing-form";
import RegistrationTermsAgreement from "@/components/platform/RegistrationTermsAgreement";
import ListingFormFields from "@/components/platform/listings/ListingFormFields";
import ListingProfileSnapshot from "@/components/platform/listings/ListingProfileSnapshot";

type Props = {
  listing: ListingDetail;
  isLoggedIn: boolean;
  eligibility: ListingEligibility | null;
};

function isEmptyResponse(value: ListingFormResponses[string] | undefined): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function hasRequiredInput(fields: ListingFormFieldView[], responses: ListingFormResponses): boolean {
  const required = fields.filter((f) => f.required && isListingInputField(f.fieldType));
  if (required.length === 0) return true;
  return required.every((f) => !isEmptyResponse(responses[f.id]));
}

export default function ListingApplyForm({ listing, isLoggedIn, eligibility }: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<ListingFormResponses>({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isJob = listing.type === "JOB";
  const canSubmit = hasRequiredInput(listing.formFields, responses);
  const profile = eligibility?.profile ?? null;

  function updateField(
    fieldId: string,
    value: string | string[] | Record<string, string | string[]>,
  ) {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  }

  if (listing.userApplied || success) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.06] p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)]/10">
          <svg className="h-6 w-6 text-[var(--color-brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-display text-lg font-medium text-white">Application submitted</p>
        <p className="mt-1 text-sm text-white/45">
          We will review your application and get back to you.
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/80 p-8">
        <p className="text-sm text-white/55">Log in or create an NTG account to apply.</p>
        <Link
          href={`/login?callbackUrl=/listings/${listing.slug}`}
          className="cta mt-4 inline-flex w-full items-center justify-center rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em]"
        >
          Continue
        </Link>
      </div>
    );
  }

  if (eligibility && !eligibility.canApply) {
    return (
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-8 space-y-4">
        <p className="text-sm text-white/55">Complete your profile before applying:</p>
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-200/80">
          {eligibility.missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <Link
          href="/profile"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/15 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 hover:bg-white/[0.04]"
        >
          Go to profile
        </Link>
      </div>
    );
  }

  async function submit() {
    if (loading || !acceptedTerms || !canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listing.slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          acceptedTerms: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Application failed.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
          Application
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white">
          {isJob ? "Apply for this role" : "Submit your tryout application"}
        </h2>
      </div>

      {profile ? (
        <ListingProfileSnapshot
          listingType={listing.type}
          gameKey={listing.gameKey}
          profile={profile}
        />
      ) : null}

      <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0a1020]/85 p-6 sm:p-8">
        <ListingFormFields
          fields={listing.formFields}
          values={responses}
          onChange={updateField}
          disabled={loading}
        />

        <div className="mt-10 space-y-5 border-t border-white/[0.08] pt-8">
          <RegistrationTermsAgreement
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
            disabled={loading}
          />

          <button
            type="button"
            onClick={submit}
            disabled={loading || !acceptedTerms || !canSubmit}
            className="cta w-full rounded-full py-3.5 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit application"}
          </button>

          {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
