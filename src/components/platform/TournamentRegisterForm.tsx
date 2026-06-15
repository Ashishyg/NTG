"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  slug: string;
  isLoggedIn: boolean;
  alreadyRegistered: boolean;
  registrationOpen: boolean;
  previewName?: string | null;
  previewRiotId?: string | null;
};

export default function TournamentRegisterForm({
  slug,
  isLoggedIn,
  alreadyRegistered,
  registrationOpen,
  previewName,
  previewRiotId,
}: Props) {
  const router = useRouter();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!registrationOpen) return null;

  if (!isLoggedIn) {
    return (
      <div className="shine-border rounded-[1.35rem]">
        <div className="shine-border-inner rounded-[1.35rem] bg-[#0a1020]/80 p-6 backdrop-blur-sm">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
            Registration
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Sign in to lock your spot.
          </p>
          <Link
            href={`/login?callbackUrl=/esports/tournaments/${slug}`}
            className="cta mt-5 inline-flex w-full items-center justify-center rounded-full py-3 text-xs font-semibold uppercase tracking-[0.18em]"
          >
            Sign in to register
          </Link>
        </div>
      </div>
    );
  }

  if (alreadyRegistered || success) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--color-brand)]/25 bg-[var(--color-brand)]/[0.06] p-6 text-center">
        <p className="font-display text-lg font-medium text-white">You&apos;re in</p>
        <p className="mt-1 text-sm text-white/45">See you on match day.</p>
      </div>
    );
  }

  async function handleRegister() {
    if (submitting.current || loading) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        submitting.current = false;
        setLoading(false);
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="shine-border rounded-[1.35rem] lg:sticky lg:top-28">
      <div className="shine-border-inner space-y-4 rounded-[1.35rem] bg-[#0a1020]/85 p-6 backdrop-blur-sm">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--color-brand)]/85">
            Register
          </p>
          <p className="mt-2 text-sm text-white/45">One tap — we use your profile.</p>
        </div>
        {(previewName || previewRiotId) && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            {previewName ? <p>{previewName}</p> : null}
            {previewRiotId ? <p className="text-white/45">{previewRiotId}</p> : null}
          </div>
        )}
        {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
        <button
          type="button"
          onClick={handleRegister}
          disabled={loading}
          className="cta w-full rounded-full py-3.5 text-xs font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
        >
          {loading ? "Registering…" : "Register for cup"}
        </button>
      </div>
    </div>
  );
}
