"use client";

import { useMemo, useState } from "react";
import type { ListingFormFieldView } from "@core/contracts/roster-listings";
import type { TimeLimitedQaResponseView } from "@core/contracts/time-limited-qa";
import AdminQaFormBuilder from "@/components/admin/AdminQaFormBuilder";

type Props = {
  initialFields: ListingFormFieldView[];
  initialResponses: TimeLimitedQaResponseView[];
  title: string;
  description: string | null;
};

type Tab = "form" | "responses";

function formatResponseValue(
  value: string | string[] | Record<string, string | string[]>,
): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return Object.entries(value)
    .map(([row, cell]) => `${row}: ${Array.isArray(cell) ? cell.join(", ") : cell}`)
    .join("\n");
}

function formatResponseAnswers(
  fields: ListingFormFieldView[],
  responses: TimeLimitedQaResponseView["responses"],
): string {
  if (!responses) return "—";

  const inputFields = fields.filter(
    (f) => f.fieldType !== "SECTION_HEADING" && f.fieldType !== "DESCRIPTION",
  );

  const parts: string[] = [];
  for (const field of inputFields) {
    const value = responses[field.id];
    if (value == null || value === "") continue;
    parts.push(formatResponseValue(value));
  }

  if (parts.length === 0) {
    for (const value of Object.values(responses)) {
      if (value == null || value === "") continue;
      parts.push(formatResponseValue(value));
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : "—";
}

export default function AdminTimeLimitedPanel({
  initialFields,
  initialResponses,
  title,
  description,
}: Props) {
  const [tab, setTab] = useState<Tab>("form");
  const [responses, setResponses] = useState(initialResponses);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => responses.find((r) => r.id === selectedId) ?? null,
    [responses, selectedId],
  );

  async function refreshResponses() {
    const res = await fetch("/api/admin/time-limited-qa/responses");
    const data = await res.json();
    if (res.ok) setResponses(data.responses ?? []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Time Limited Q&A</h1>
        <p className="mt-1 text-sm text-white/45">
          Super admin only. Build the form and review submissions.
        </p>
      </div>

      <div className="flex gap-2">
        {(["form", "responses"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              tab === key
                ? "bg-[var(--color-brand)]/15 text-[var(--color-brand)] ring-1 ring-[var(--color-brand)]/30"
                : "bg-white/[0.04] text-white/50 hover:text-white/75"
            }`}
          >
            {key === "form" ? "Form builder" : "Responses"}
          </button>
        ))}
      </div>

      {tab === "form" ? (
        <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Title</p>
              <p className="mt-1 text-sm text-white/85">{title}</p>
            </div>
            {description ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Description</p>
                <p className="mt-1 text-sm text-white/60">{description}</p>
              </div>
            ) : null}
          </div>
          <AdminQaFormBuilder initialFields={initialFields} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                {responses.length} response{responses.length === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void refreshResponses()}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white"
                >
                  Refresh
                </button>
                <a
                  href="/api/admin/time-limited-qa/responses?format=csv"
                  className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                >
                  Export CSV
                </a>
              </div>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {responses.length === 0 ? (
                <li className="py-8 text-center text-sm text-white/40">No responses yet.</li>
              ) : (
                responses.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.03] ${
                        selectedId === row.id ? "bg-white/[0.04]" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-white/85">
                          {row.isAnonymous && !row.submitterName
                            ? "Anonymous"
                            : row.submitterName ?? "Anonymous"}
                        </p>
                        <p className="text-[11px] text-white/40">
                          {new Date(row.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                      {row.userId ? (
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Member</span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-white/30">Guest</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-4 min-h-[20rem]">
            {selected ? (
              <div className="flex min-h-[18rem] flex-col space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Name</p>
                  <p className="mt-1 text-sm text-white/80">
                    {selected.isAnonymous && !selected.submitterName
                      ? "Anonymous"
                      : selected.submitterName ?? "Anonymous"}
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Response</p>
                  <p className="mt-2 min-h-[12rem] flex-1 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                    {formatResponseAnswers(initialFields, selected.responses)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-white/40">Select a response to view details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
