"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminSection } from "@/components/admin/AdminSection";
import AdminListingFormBuilder from "@/components/admin/AdminListingFormBuilder";
import AdminListingApplicationView from "@/components/admin/AdminListingApplicationView";
import type { AdminListingApplicationRow } from "@roster-listings/index";
import type { ListingFormFieldView } from "@core/contracts/roster-listings";

type Props = {
  slug: string;
  title: string;
  listingType: "JOB" | "ROSTER_TRYOUT";
  gameKey: string | null;
  initialFormFields: ListingFormFieldView[];
  initialApplications: AdminListingApplicationRow[];
};

export default function AdminListingDetailPanel({
  slug,
  title,
  listingType,
  gameKey,
  initialFormFields,
  initialApplications,
}: Props) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [tab, setTab] = useState<"form" | "applications">("form");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-white/[0.08] pb-1">
        <button
          type="button"
          onClick={() => {
            setTab("form");
            setSelectedId(null);
          }}
          className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
            tab === "form" ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
          }`}
        >
          Application form
        </button>
        <button
          type="button"
          onClick={() => setTab("applications")}
          className={`rounded-t-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
            tab === "applications"
              ? "bg-white/[0.06] text-white"
              : "text-white/40 hover:text-white/70"
          }`}
        >
          Applications ({applications.length})
        </button>
      </div>

      {tab === "form" ? (
        <AdminSection title="Form builder" showsOn="Public application page">
          <p className="mb-4 text-sm text-white/45">
            Build the application form applicants see — sections, questions, choices, and required fields.
          </p>
          <AdminListingFormBuilder
            slug={slug}
            listingType={listingType}
            initialFields={initialFormFields}
          />
        </AdminSection>
      ) : selected ? (
        <AdminListingApplicationView
          application={selected}
          formFields={initialFormFields}
          listingType={listingType}
          listingTitle={title}
          gameKey={gameKey}
          onClose={() => setSelectedId(null)}
          onDeleted={() => {
            setApplications((prev) => prev.filter((a) => a.id !== selected.id));
            setSelectedId(null);
            router.refresh();
          }}
        />
      ) : (
        <AdminSection title={title} showsOn="Listing applications">
          <a
            href={`/api/admin/listings/${slug}/applications?format=csv`}
            className="mb-4 inline-flex rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
          >
            Export CSV
          </a>

          {applications.length === 0 ? (
            <p className="text-sm text-white/35">No applications yet.</p>
          ) : (
            <ul className="space-y-1 max-w-sm">
              {applications.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm text-white/80 transition-colors hover:border-white/12 hover:bg-white/[0.04] hover:text-white"
                  >
                    {a.displayName ?? "Unknown"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      )}
    </div>
  );
}
