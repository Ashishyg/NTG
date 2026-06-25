import { NextResponse } from "next/server";
import { z } from "zod";

import { clearLoginFailures } from "@/lib/login-lockout";
import { sendEmailOtp } from "@/modules/auth-membership/application/email-otp.service";
import {
  AUTH_PASSWORD_RESET_REQUEST_MESSAGE,
  AUTH_RESET_CODE_EXPIRED,
  AUTH_RESET_CODE_INVALID,
  AUTH_RESET_FAILED,
  AUTH_RESET_TOO_MANY_ATTEMPTS,
} from "@/modules/auth-membership/domain/auth-messages";
import { loginSchema } from "@/modules/auth-membership/domain/schemas";
import { authValidationErrorResponse, logAuthValidationFailure } from "@/lib/auth-validation";
import { hashPassword, verifyPassword } from "@/lib/password-hash";
import { AUTH_RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { prisma } from "@core/database/client";

const resetSchema = z.object({
  action: z.literal("reset"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, AUTH_RATE_LIMITS.login);
  if (limited) return limited;

  try {
    const body = await request.json();
    const action = body?.action as string | undefined;

    if (action === "request") {
      const parsed = loginSchema.pick({ email: true }).safeParse(body);
      if (!parsed.success) {
        return authValidationErrorResponse("forgot-password:request", parsed.error);
      }

      const normalizedEmail = parsed.data.email;
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (user) {
        const otp = await sendEmailOtp(normalizedEmail, user.id);
        if (!otp.ok && !otp.cooldown) {
          logAuthValidationFailure("forgot-password:request", `otp-send-failed email=${normalizedEmail}`);
        }

        return NextResponse.json({
          ok: true,
          message: AUTH_PASSWORD_RESET_REQUEST_MESSAGE,
          ...(otp.ok && otp.devOtp ? { devOtp: otp.devOtp, devOtpHint: otp.devOtpHint } : {}),
        });
      }

      return NextResponse.json({
        ok: true,
        message: AUTH_PASSWORD_RESET_REQUEST_MESSAGE,
      });
    }

    if (action === "reset") {
      const parsed = resetSchema.safeParse(body);
      if (!parsed.success) {
        return authValidationErrorResponse("forgot-password:reset", parsed.error);
      }

      const { email: normalizedEmail, code, newPassword } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        logAuthValidationFailure("forgot-password:reset", "unknown-email");
        return NextResponse.json({ error: AUTH_RESET_FAILED }, { status: 400 });
      }

      const otp = await prisma.emailOtp.findFirst({
        where: { email: normalizedEmail, userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        return NextResponse.json({ error: AUTH_RESET_FAILED }, { status: 400 });
      }

      if (otp.expiresAt < new Date()) {
        return NextResponse.json({ error: AUTH_RESET_CODE_EXPIRED }, { status: 400 });
      }

      if (otp.attempts >= 5) {
        return NextResponse.json({ error: AUTH_RESET_TOO_MANY_ATTEMPTS }, { status: 400 });
      }

      const valid = await verifyPassword(code, otp.codeHash);
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });

      if (!valid) {
        return NextResponse.json({ error: AUTH_RESET_CODE_INVALID }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await clearLoginFailures(normalizedEmail);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  } catch (error) {
    console.error("[forgot-password-api] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
