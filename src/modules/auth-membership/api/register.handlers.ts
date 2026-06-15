import { NextResponse, after } from "next/server";
import {
  signupStep1Schema,
  otpVerifySchema,
  riotLinkSchema,
} from "../domain/schemas";
import {
  registerStep1,
  resendOtpForSignup,
  verifyOtpStep2,
  completeRiotStep3,
  getLoginBlockReason,
  getSignupStatus,
} from "../application/register.service";
import { getSignupUserId } from "../infrastructure/signup-session";
import { linkRiotAccount } from "../application/riot-link.service";
import { syncUserRank } from "@tournaments-leagues/index";
import { getSession } from "@core/auth/session";
import { prisma } from "@core/database/client";

function deferRankSync(userId: string): void {
  after(() => {
    syncUserRank(userId).catch(() => {});
  });
}

export async function handleRegister(req: Request) {
  return handleRegisterStep1(req);
}

export async function handleRegisterStep1(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupStep1Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const result = await registerStep1(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        ok: true,
        userId: result.userId,
        ...(result.resumeStep ? { resumeStep: result.resumeStep } : {}),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}

export async function handleSendOtp() {
  try {
    const userId = await getSignupUserId();
    if (!userId) {
      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });
    }

    const result = await resendOtpForSignup(userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send code." }, { status: 500 });
  }
}

export async function handleSignupStatus() {
  try {
    const userId = await getSignupUserId();
    if (!userId) {
      return NextResponse.json({ step: null });
    }

    const status = await getSignupStatus(userId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ step: null });
  }
}

export async function handleVerifyOtp(req: Request) {
  try {
    const userId = await getSignupUserId();
    if (!userId) {
      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid code." },
        { status: 400 },
      );
    }

    const result = await verifyOtpStep2(userId, parsed.data.code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}

export async function handleLinkRiotSignup(req: Request) {
  try {
    const userId = await getSignupUserId();
    if (!userId) {
      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = riotLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid Riot ID." },
        { status: 400 },
      );
    }

    const result = await completeRiotStep3(userId, parsed.data.riotId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    deferRankSync(userId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to link Riot ID." }, { status: 500 });
  }
}

export async function handleLinkRiotProfile(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = riotLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid Riot ID." },
        { status: 400 },
      );
    }

    const result = await linkRiotAccount(session.user.id, parsed.data.riotId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { signupCompleted: true },
    });

    deferRankSync(session.user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to link Riot ID." }, { status: 500 });
  }
}

export async function handleLoginCheck(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }
    const block = await getLoginBlockReason(email, password);
    return NextResponse.json({
      blocked: !!block.reason,
      reason: block.reason,
      resumeStep: block.resumeStep,
    });
  } catch {
    return NextResponse.json({ error: "Check failed." }, { status: 500 });
  }
}
