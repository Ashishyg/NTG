"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  onLinked?: () => void;
};

export default function GameIdentityForm({ onLinked }: Props) {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!riotId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/riot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId: riotId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to link Riot ID.");
        return;
      }
      setRiotId("");
      onLinked?.();
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="Riot ID (Name#Tag)"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/40 focus:outline-none"
      />
      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || !riotId.trim()}
        className="rounded-full border border-[var(--color-brand)]/30 bg-[var(--color-brand)]/10 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/15 disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Link Riot ID"}
      </button>
    </form>
  );
}
