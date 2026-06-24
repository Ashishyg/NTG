"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";
import { formatValorantActLabel } from "@/lib/valorant-act";

type SyncStats = {
  linkedPlayers: number;
  rankedOnLeaderboard: number;
  lastSyncedAt: string | null;
  cronScheduleIst: string;
};

type SyncTotals = {
  synced: number;
  failed: number;
  skipped: number;
  batches: number;
};

type SyncPhase = "idle" | "running" | "complete" | "error";

type AuditRow = {
  id: string;
  displayName: string | null;
  riotId: string | null;
  source: string;
  runId: string | null;
  previousRankTier: string | null;
  previousMmr: number | null;
  newRankTier: string | null;
  newMmr: number | null;
  changed: boolean;
  error: string | null;
  createdAt: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function sourceLabel(source: string): string {
  switch (source) {
    case "CRON":
      return "Daily cron";
    case "MANUAL":
      return "Manual refresh";
    case "PROFILE":
      return "Profile sync";
    case "RIOT_LINK":
      return "Riot link";
    case "REGISTRATION":
      return "Registration";
    case "ADMIN_MEMBER":
      return "Admin refresh";
    default:
      return source;
  }
}

export default function AdminLeaderboardSyncPanel() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [currentAct, setCurrentAct] = useState<string | null>(null);
  const [currentActLabel, setCurrentActLabel] = useState<string | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<SyncTotals | null>(null);
  const [pending, setPending] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);
  const [runCurrentAct, setRunCurrentAct] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditChangedOnly, setAuditChangedOnly] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/leaderboard/sync");
    const parsed = await parseApiJson(res);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    if (!res.ok) return;

    const data = parsed.data;
    setStats(data.stats as SyncStats);
    setCurrentAct((data.currentAct as string | null) ?? null);
    setCurrentActLabel((data.currentActLabel as string | null) ?? null);
    setEnvConfigured(Boolean(data.envConfigured));
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        changedOnly: auditChangedOnly ? "true" : "false",
      });
      const res = await fetch(`/api/admin/leaderboard/audit?${params}`);
      const parsed = await parseApiJson(res);
      if (!parsed.ok || !res.ok) return;
      setAuditRows((parsed.data.rows as AuditRow[]) ?? []);
    } finally {
      setAuditLoading(false);
    }
  }, [auditChangedOnly]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  async function runFullSync() {
    if (!envConfigured || !currentAct) {
      setPhase("error");
      setError(
        "VALORANT_CURRENT_ACT is not set on the server. Add it in Vercel env (e.g. e11a3) and redeploy.",
      );
      return;
    }

    setPhase("running");
    setError(null);
    setTotals(null);
    setPending(0);
    setRunCurrentAct(currentAct);

    let startedAt: string | undefined;
    let accumulated: SyncTotals | undefined;
    let complete = false;

    try {
      while (!complete) {
        const res = await fetch("/api/admin/leaderboard/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runStartedAt: startedAt,
            totals: accumulated,
          }),
        });
        const parsed = await parseApiJson(res);
        if (!parsed.ok) {
          throw new Error(parsed.message);
        }
        const data = parsed.data;
        if (!res.ok) {
          throw new Error(String(data.error ?? "Sync failed."));
        }

        startedAt = String(data.runStartedAt);
        setRunStartedAt(startedAt);
        accumulated = data.totals as SyncTotals;
        setTotals(accumulated);
        const batch = data.batch as { pending: number };
        setPending(batch.pending);
        setStats(data.stats as SyncStats);
        complete = Boolean(data.complete);

        if (!complete) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      setPhase("complete");
      setPending(0);
      await loadAudit();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Sync failed.");
    }
  }

  const progressTotal = stats?.linkedPlayers ?? 0;
  const progressDone = totals
    ? totals.synced + totals.failed + totals.skipped
    : 0;
  const progressPct =
    progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0c1424]/40 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/90">
            Valorant leaderboard
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-white">Rank sync</h2>
          <p className="mt-1 max-w-lg text-sm text-white/45">
            Ranks sync when members link Riot on profile or register for a cup. The automatic daily
            refresh ({stats?.cronScheduleIst ?? "2:50 AM IST"}) updates rank, MMR, and player cards
            for every linked player — same as manual refresh below. Episode and act come from{" "}
            <code className="text-white/60">VALORANT_CURRENT_ACT</code> on Vercel.
          </p>
        </div>
        <Link
          href="/esports/leaderboard"
          className="shrink-0 text-xs font-semibold text-cyan-400/80 hover:text-cyan-300"
        >
          View public leaderboard →
        </Link>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <dt className="text-[10px] uppercase tracking-wider text-white/40">Riot linked</dt>
          <dd className="mt-1 text-2xl font-bold text-white">{stats?.linkedPlayers ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <dt className="text-[10px] uppercase tracking-wider text-white/40">On leaderboard</dt>
          <dd className="mt-1 text-2xl font-bold text-emerald-300">{stats?.rankedOnLeaderboard ?? "—"}</dd>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <dt className="text-[10px] uppercase tracking-wider text-white/40">Last sync</dt>
          <dd className="mt-1 text-sm font-medium text-white/80">{formatWhen(stats?.lastSyncedAt ?? null)}</dd>
        </div>
      </dl>

      {phase === "running" ? (
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs text-white/50">
            <span>Refreshing users…</span>
            <span>
              {progressDone} / {progressTotal} processed
              {pending > 0 ? ` · ${pending} remaining` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase === "complete" && totals ? (
        <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p className="font-semibold">Leaderboard refresh complete</p>
          <p className="mt-1 text-emerald-200/80">
            {totals.synced} user{totals.synced === 1 ? "" : "s"} refreshed successfully
            {totals.skipped > 0 ? ` · ${totals.skipped} skipped (no comp rank)` : ""}
            {totals.failed > 0 ? ` · ${totals.failed} could not be updated` : ""}
            {runCurrentAct ? ` · ${formatValorantActLabel(runCurrentAct) ?? runCurrentAct}` : ""}
            {runStartedAt ? ` · started ${formatWhen(runStartedAt)}` : ""}
          </p>
        </div>
      ) : null}

      {phase === "error" && error ? (
        <p className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Current Valorant act
        </p>
        <p className="mt-1 text-xs text-white/45">
          Used for ranked vs unranked on the town leaderboard. Cron and manual refresh both read{" "}
          <code className="text-white/55">VALORANT_CURRENT_ACT</code> from Vercel env.
        </p>

        {envConfigured && currentAct ? (
          <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
            <p className="text-sm font-semibold text-cyan-100">
              {currentActLabel ?? formatValorantActLabel(currentAct) ?? currentAct}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Env key: <span className="font-mono text-white/60">{currentAct}</span>
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
            VALORANT_CURRENT_ACT is not set. Add it in Vercel project settings (e.g. e11a3) and
            redeploy before cron or manual refresh can run.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runFullSync}
          disabled={phase === "running" || !envConfigured}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "running" ? "Refreshing all…" : "Refresh all ranks & cards"}
        </button>
        <button
          type="button"
          onClick={loadStats}
          disabled={phase === "running"}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white disabled:opacity-50"
        >
          Reload stats
        </button>
      </div>

      <div className="mt-8 border-t border-white/[0.06] pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Rank change audit</h3>
            <p className="mt-0.5 text-xs text-white/40">
              Who changed rank, from → to, and whether it was daily cron or manual refresh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={auditChangedOnly}
                onChange={(e) => setAuditChangedOnly(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0"
              />
              Rank changes only
            </label>
            <button
              type="button"
              onClick={loadAudit}
              disabled={auditLoading}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50"
            >
              {auditLoading ? "Loading…" : "Reload audit"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]">
          <div className="max-h-[min(28rem,60vh)] overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#0c1424] text-[10px] uppercase tracking-wider text-white/40 shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">When (IST)</th>
                <th className="px-3 py-2.5 font-semibold">Player</th>
                <th className="px-3 py-2.5 font-semibold">Source</th>
                <th className="px-3 py-2.5 font-semibold">Previous</th>
                <th className="px-3 py-2.5 font-semibold">New</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-white/75">
              {auditRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-white/35">
                    {auditLoading ? "Loading audit log…" : "No audit entries yet."}
                  </td>
                </tr>
              ) : (
                auditRows.map((row) => (
                  <tr key={row.id} className={row.error ? "bg-red-500/5" : undefined}>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatWhen(row.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white/90">{row.displayName ?? "—"}</div>
                      <div className="text-[10px] text-white/35">{row.riotId ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          row.source === "CRON"
                            ? "text-violet-300"
                            : row.source === "MANUAL"
                              ? "text-cyan-300"
                              : "text-white/55"
                        }
                      >
                        {sourceLabel(row.source)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.error ? (
                        <span className="text-red-300">{row.error}</span>
                      ) : (
                        <>
                          {row.previousRankTier ?? "—"}
                          {row.previousMmr != null ? (
                            <span className="text-white/35"> · {row.previousMmr}</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.error ? (
                        "—"
                      ) : (
                        <>
                          <span className={row.changed ? "font-semibold text-emerald-300" : ""}>
                            {row.newRankTier ?? "—"}
                          </span>
                          {row.newMmr != null ? (
                            <span className="text-white/35"> · {row.newMmr}</span>
                          ) : null}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </section>
  );
}
