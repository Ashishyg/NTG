"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";
import type { TimeLimitedQaAdminView } from "@core/contracts/time-limited-qa";

type Props = {
  initialEnabled: boolean;
};

export default function AdminTimeLimitedQaPanel({ initialEnabled }: Props) {
  const [view, setView] = useState<TimeLimitedQaAdminView | null>(null);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/time-limited-qa");
    const parsed = await parseApiJson(res);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (!res.ok) {
      setError(String(parsed.data.error ?? "Could not load Q&A settings."));
      return;
    }
    const data = parsed.data as TimeLimitedQaAdminView;
    setView(data);
    setEnabled(Boolean(data.enabled));
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleEnabled(next: boolean) {
    setLoading(true);
    setError(null);
    setEnabled(next);
    const res = await fetch("/api/admin/time-limited-qa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next, active: next }),
    });
    const parsed = await parseApiJson(res);
    setLoading(false);
    if (!parsed.ok) {
      setEnabled(!next);
      setError(parsed.message);
      return;
    }
    if (!res.ok) {
      setEnabled(!next);
      setError(String(parsed.data.error ?? "Could not update toggle."));
      return;
    }
    const data = parsed.data as TimeLimitedQaAdminView;
    setView(data);
    setEnabled(Boolean(data.enabled));
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.04] pb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">Time Limited Q&A</h2>
          <p className="mt-1 text-xs text-white/40">
            Turn the public Q&A form on or off and manage questions at{" "}
            <span className="text-white/55">/qa</span>.
          </p>
        </div>
        <Link
          href="/admin/time-limited"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/15"
        >
          Manage form & responses
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/85">
            Public section {enabled ? "ON" : "OFF"}
          </p>
          <p className="text-xs text-white/40">
            {view?.responseCount ?? 0} response{(view?.responseCount ?? 0) === 1 ? "" : "s"} collected
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => toggleEnabled(!enabled)}
          className={`relative h-8 w-14 rounded-full border transition-colors ${
            enabled
              ? "border-emerald-400/40 bg-emerald-500/20"
              : "border-white/10 bg-white/[0.04]"
          } disabled:opacity-50`}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn Q&A off" : "Turn Q&A on"}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              enabled ? "left-[calc(100%-1.625rem)]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300/90">{error}</p> : null}
    </section>
  );
}
