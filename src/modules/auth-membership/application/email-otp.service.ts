import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@core/database/client";
import { serverEnv } from "@core/config/env.server";

const OTP_EXPIRY_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function sendViaResend(email: string, code: string): Promise<boolean> {
  const apiKey = serverEnv.resendApiKey;
  const from = serverEnv.emailFrom;
  if (!apiKey || !from) return false;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your NTG Lounge verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Verify your email</h2>
        <p style="color:#444;line-height:1.5">Use this code to finish signing up for NTG Lounge. It expires in ${OTP_EXPIRY_MIN} minutes.</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:0.2em;margin:24px 0">${code}</p>
        <p style="color:#888;font-size:13px">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  return !error;
}

export type SendOtpResult =
  | { ok: true }
  | { ok: false; error: string; cooldown?: boolean };

export async function sendEmailOtp(
  emailRaw: string,
  userId?: string,
): Promise<SendOtpResult> {
  const email = normalizeEmail(emailRaw);

  const recent = await prisma.emailOtp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      error: "Wait a minute before requesting another code.",
      cooldown: true,
    };
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

  await prisma.emailOtp.create({
    data: { email, codeHash, expiresAt, userId },
  });

  const sent = await sendViaResend(email, code);
  if (!sent) {
    return { ok: false, error: "Failed to send email. Try again later." };
  }

  return { ok: true };
}

export async function verifyEmailOtp(
  emailRaw: string,
  code: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);

  const otp = await prisma.emailOtp.findFirst({
    where: { email, userId },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "No code found. Request a new one." };
  }

  if (otp.expiresAt < new Date()) {
    return { ok: false, error: "Code expired. Request a new one." };
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { attempts: otp.attempts + 1 },
  });

  if (!valid) {
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  return { ok: true };
}
