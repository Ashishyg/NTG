"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Step = 1 | 2 | 3;

export default function SignupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [riotId, setRiotId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const parsedStep = stepParam === "3" ? 3 : stepParam === "2" ? 2 : null;

    (async () => {
      try {
        const res = await fetch("/api/auth/register/status");
        const data = await res.json();
        if (data.step) {
          setStep(data.step);
          if (data.email) setEmail(data.email);
          if (data.displayName) setDisplayName(data.displayName);
        } else if (parsedStep) {
          setStep(parsedStep);
        }
      } catch {
        if (parsedStep) setStep(parsedStep);
      } finally {
        setRestoring(false);
      }
    })();
  }, [searchParams]);

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...otp];
      next[index] = digit;
      setOtp(next);
      if (digit && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/step-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }
      setStep(data.resumeStep === 3 ? 3 : 2);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const code = otp.join("");
    try {
      const res = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      setStep(3);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not resend.");
        return;
      }
      setError("");
    } catch {
      setError("Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/link-riot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riotId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not link Riot ID.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shine-border w-full">
      <div className="shine-border-inner glass-strong rounded-[1.5rem] p-7 sm:p-8">
        {restoring ? (
          <p className="py-8 text-center text-sm text-white/50">Loading…</p>
        ) : (
        <>
        <div className="mb-6">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/40">
            <span>Step {step} of 3</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-iris)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <p className="text-sm text-white/50">Create your player account.</p>
            <input
              type="text"
              required
              minLength={2}
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
            />
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
            />
            <input
              type="tel"
              required
              placeholder="Phone (+91)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
            />
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button type="submit" disabled={loading} className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] disabled:opacity-50">
              {loading ? "Please wait…" : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <p className="text-sm text-white/50">
              Enter the 6-digit code sent to {email}.
            </p>
            <div className="flex justify-between gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] text-center text-lg font-semibold text-white focus:border-[var(--color-brand)]/45 focus:outline-none"
                />
              ))}
            </div>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button type="submit" disabled={loading || otp.join("").length < 6} className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] disabled:opacity-50">
              {loading ? "Verifying…" : "Verify email"}
            </button>
            <button type="button" onClick={resendOtp} disabled={loading} className="w-full text-center text-xs text-white/40 hover:text-white/70">
              Resend code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <p className="text-sm text-white/50">
              Link your Valorant Riot ID (Name#Tag). We verify it with Riot&apos;s API.
            </p>
            <input
              type="text"
              required
              placeholder="Player#NA1"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand)]/45 focus:outline-none"
            />
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button type="submit" disabled={loading} className="cta w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-[0.18em] disabled:opacity-50">
              {loading ? "Linking…" : "Finish & sign in"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-brand)] hover:underline">
            Sign in
          </Link>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
