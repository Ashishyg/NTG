"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

function formatWhen(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default function AdminLeaderboardSyncPanel() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<SyncTotals | null>(null);
  const [pending, setPending] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/leaderboard/sync");
    if (!res.ok) return;
    const data = await res.json();
    setStats(data.stats);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function runFullSync() {
    setPhase("running");
    setError(null);
    setTotals(null);
    setPending(0);

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
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Sync batch failed.");
        }

        startedAt = data.runStartedAt;
        setRunStartedAt(data.runStartedAt);
        accumulated = data.totals;
        setTotals(data.totals);
        setPending(data.batch.pending);
        setStats(data.stats);
        complete = data.complete;

        if (!complete) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      setPhase("complete");
      setPending(0);
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
            Ranks sync when members link Riot on profile or register for a cup. Automatic refresh runs{" "}
            {stats?.cronScheduleIst ?? "daily at 12:00 AM IST"} in batches of 26 (Henrik rate limit).
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
            <span>Syncing batch {totals?.batches ?? 0}…</span>
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
            {totals.synced} updated · {totals.skipped} skipped (no comp rank) · {totals.failed} failed ·{" "}
            {totals.batches} batches
            {runStartedAt ? ` · started ${formatWhen(runStartedAt)}` : ""}
          </p>
        </div>
      ) : null}

      {phase === "error" && error ? (
        <p className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={runFullSync}
          disabled={phase === "running"}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "running" ? "Refreshing…" : "Refresh all ranks now"}
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
    </section>
  );
}
