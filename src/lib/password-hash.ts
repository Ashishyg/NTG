import bcrypt from "bcryptjs";

export const BCRYPT_PASSWORD_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_PASSWORD_ROUNDS);
}

/** True when the stored hash is not bcrypt or uses fewer than 12 rounds. */
export function needsPasswordRehash(hash: string): boolean {
  if (!hash.startsWith("$2")) return true;
  const match = hash.match(/^\$2[aby]?\$(\d{2})\$/);
  if (!match) return true;
  const rounds = Number.parseInt(match[1]!, 10);
  return rounds < BCRYPT_PASSWORD_ROUNDS;
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
