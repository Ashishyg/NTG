"use client";

import { useCallback, useEffect, useState } from "react";

type MyGameView = {
  matchId: string;
  stageId: string;
  stageName: string;
  stageOrder: number;
  stageFinishesAt: string | null;
  resultWindowHours: number;
  roundNumber: number;
  positionInRound: number;
  bracketSide: string | null;
  status: string;
  scheduledAt: string | null;
  scheduleStatus: string;
  confirmedBySlot0: boolean;
  confirmedBySlot1: boolean;
  resultDeadlineAt: string | null;
  mySlot: 0 | 1;
  myTeamId: string;
  myTeamName: string;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  iConfirmed: boolean;
  opponentConfirmed: boolean;
  canConfirm: boolean;
  canPropose: boolean;
  canSubmitResult: boolean;
  resultOverdue: boolean;
  result: {
    winnerSlot: number;
    scoreA: number | null;
    scoreB: number | null;
    scoreSummary: string | null;
    screenshotUrl: string | null;
  } | null;
};

type Props = {
  slug: string;
  isLoggedIn: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TournamentYourGames({ slug, isLoggedIn }: Props) {
  const [games, setGames] = useState<MyGameView[]>([]);
  const [hasTeam, setHasTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [proposeAt, setProposeAt] = useState<Record<string, string>>({});
  const [resultForm, setResultForm] = useState<
    Record<
      string,
      { winnerSlot: 0 | 1; scoreA: string; scoreB: string; screenshotUrl: string }
    >
  >({});

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${slug}/my-games`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setGames(data.games ?? []);
      setHasTeam(Boolean(data.hasTeam));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  }, [slug, isLoggedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(matchId: string) {
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/schedule/confirm`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Confirm failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  }

  async function propose(matchId: string) {
    const when = proposeAt[matchId];
    if (!when) {
      setError("Pick a date and time to propose.");
      return;
    }
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/schedule/propose`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: new Date(when).toISOString(),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Propose failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Propose failed");
    } finally {
      setBusyId(null);
    }
  }

  async function uploadScreenshot(matchId: string, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch(`/api/tournaments/${slug}/matches/upload-screenshot`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    setResultForm((prev) => ({
      ...prev,
      [matchId]: {
        winnerSlot: prev[matchId]?.winnerSlot ?? 0,
        scoreA: prev[matchId]?.scoreA ?? "",
        scoreB: prev[matchId]?.scoreB ?? "",
        screenshotUrl: data.url as string,
      },
    }));
  }

  async function submitResult(matchId: string, game: MyGameView) {
    const form = resultForm[matchId];
    if (!form?.screenshotUrl) {
      setError("Upload a screenshot first.");
      return;
    }
    const scoreA = Number(form.scoreA);
    const scoreB = Number(form.scoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      setError("Enter both scores.");
      return;
    }
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/tournaments/${slug}/matches/${matchId}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            winnerSlot: form.winnerSlot,
            scoreA,
            scoreB,
            screenshotUrl: form.screenshotUrl,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm text-white/50">Log in to see and manage your team&apos;s games.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-white/50">Loading your games…</p>;
  }

  if (!hasTeam) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm text-white/50">
          You&apos;re not on a team in this cup yet — Your Games will appear once you&apos;re rostered.
        </p>
      </div>
    );
  }

  const stageDeadlines = [
    ...new Map(
      games
        .filter((g) => g.stageFinishesAt)
        .map((g) => [g.stageId, { name: g.stageName, at: g.stageFinishesAt! }]),
    ).values(),
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {stageDeadlines.length > 0 ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90">
          <p className="mb-1 font-bold uppercase tracking-wider text-amber-300/80">
            Stage deadlines
          </p>
          <ul className="space-y-0.5">
            {stageDeadlines.map((s) => (
              <li key={s.name}>
                {s.name}: finish by {formatWhen(s.at)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-sm text-white/50">No matches for your team yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {games.map((g) => {
            const form = resultForm[g.matchId] ?? {
              winnerSlot: (g.mySlot === 0 ? 0 : 1) as 0 | 1,
              scoreA: "",
              scoreB: "",
              screenshotUrl: "",
            };
            return (
              <li
                key={g.matchId}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                      {g.stageName} · R{g.roundNumber}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-white">
                      {g.myTeamName}{" "}
                      <span className="text-white/30">vs</span> {g.opponentTeamName}
                    </p>
                    <p className="mt-2 text-xs text-white/50">
                      Kickoff: {formatWhen(g.scheduledAt)} ·{" "}
                      <span className="uppercase tracking-wider text-white/40">
                        {g.scheduleStatus}
                      </span>
                    </p>
                    {g.resultDeadlineAt ? (
                      <p className="mt-1 text-xs text-white/40">
                        Result due by {formatWhen(g.resultDeadlineAt)}
                        {g.resultOverdue ? (
                          <span className="ml-2 text-rose-300">Overdue</span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-white/35">
                      You {g.iConfirmed ? "confirmed" : "pending"} · Opponent{" "}
                      {g.opponentConfirmed ? "confirmed" : "pending"}
                    </p>
                  </div>
                  {g.result ? (
                    <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                      Final {g.result.scoreSummary ?? `${g.result.scoreA}-${g.result.scoreB}`}
                    </div>
                  ) : null}
                </div>

                {!g.result ? (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    {g.canConfirm ? (
                      <button
                        type="button"
                        disabled={busyId === g.matchId}
                        onClick={() => void confirm(g.matchId)}
                        className="rounded-lg bg-cyan-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                      >
                        Confirm time
                      </button>
                    ) : null}
                    {g.canPropose ? (
                      <>
                        <input
                          type="datetime-local"
                          className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white"
                          value={proposeAt[g.matchId] ?? ""}
                          onChange={(e) =>
                            setProposeAt((prev) => ({
                              ...prev,
                              [g.matchId]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          disabled={busyId === g.matchId}
                          onClick={() => void propose(g.matchId)}
                          className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/80 disabled:opacity-40"
                        >
                          Propose new time
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {g.canSubmitResult ? (
                  <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Submit result
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setResultForm((prev) => ({
                            ...prev,
                            [g.matchId]: { ...form, winnerSlot: 0 },
                          }))
                        }
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          form.winnerSlot === 0
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 text-white/60"
                        }`}
                      >
                        Winner: slot A ({g.mySlot === 0 ? g.myTeamName : g.opponentTeamName})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setResultForm((prev) => ({
                            ...prev,
                            [g.matchId]: { ...form, winnerSlot: 1 },
                          }))
                        }
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          form.winnerSlot === 1
                            ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                            : "border-white/10 text-white/60"
                        }`}
                      >
                        Winner: slot B ({g.mySlot === 1 ? g.myTeamName : g.opponentTeamName})
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <label className="text-white/50">
                        Score A
                        <input
                          type="number"
                          min={0}
                          className="ml-2 w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                          value={form.scoreA}
                          onChange={(e) =>
                            setResultForm((prev) => ({
                              ...prev,
                              [g.matchId]: { ...form, scoreA: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <span className="text-white/30">–</span>
                      <label className="text-white/50">
                        Score B
                        <input
                          type="number"
                          min={0}
                          className="ml-2 w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-white"
                          value={form.scoreB}
                          onChange={(e) =>
                            setResultForm((prev) => ({
                              ...prev,
                              [g.matchId]: { ...form, scoreB: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70">
                        {form.screenshotUrl ? "Screenshot ✓" : "Upload screenshot"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadScreenshot(g.matchId, f).catch((err) =>
                              setError(
                                err instanceof Error ? err.message : "Upload failed",
                              ),
                            );
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={busyId === g.matchId}
                        onClick={() => void submitResult(g.matchId, g)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-40"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
