import { z } from "zod";

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  throw new Error("Invalid phone number. Use a 10-digit Indian mobile number.");
}

export const signupStep1Schema = z.object({
  displayName: z.string().trim().min(2).max(32),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(10).max(16),
  password: z.string().min(8).max(128),
});

export const otpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const riotLinkSchema = z.object({
  riotId: z
    .string()
    .trim()
    .regex(/^[^#]{3,16}#[a-zA-Z0-9]{3,5}$/i, "Use format Name#Tag (e.g. Player#NA1)."),
});

export type SignupStep1Input = z.infer<typeof signupStep1Schema>;
