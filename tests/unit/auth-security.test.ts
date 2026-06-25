import { describe, expect, it } from "vitest";

import { sanitizeTextInput } from "@/lib/input-sanitize";
import { formatSafeValidationError } from "@/lib/auth-validation";
import { needsPasswordRehash } from "@/lib/password-hash";
import { loginSchema } from "@auth-membership/domain/schemas";

describe("sanitizeTextInput", () => {
  it("strips HTML tags and script content", () => {
    expect(sanitizeTextInput('<script>alert("x")</script>Player')).toBe("Player");
    expect(sanitizeTextInput("<b>Name</b>")).toBe("Name");
  });

  it("removes angle brackets and quotes", () => {
    expect(sanitizeTextInput('bad"name')).toBe("badname");
  });
});

describe("loginSchema", () => {
  it("accepts valid login credentials", () => {
    const result = loginSchema.safeParse({
      email: "player@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords with a helpful message", () => {
    const result = loginSchema.safeParse({
      email: "player@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatSafeValidationError(result.error)).toContain("8 characters");
    }
  });
});

describe("needsPasswordRehash", () => {
  it("flags weak bcrypt rounds", () => {
    expect(needsPasswordRehash("$2a$10$abcdefghijklmnopqrstuv")).toBe(true);
  });

  it("accepts bcrypt 12-round hashes", () => {
    expect(needsPasswordRehash("$2a$12$abcdefghijklmnopqrstuv")).toBe(false);
  });

  it("flags non-bcrypt hashes", () => {
    expect(needsPasswordRehash("plaintext")).toBe(true);
  });
});
