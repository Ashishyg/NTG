import { describe, expect, it } from "vitest";
import { resolveQaSubmitter } from "@time-limited-qa/index";
import { isSuperAdminEmail } from "@/lib/superadmin";

describe("resolveQaSubmitter", () => {
  it("stores anonymous member with userId but no name", () => {
    const result = resolveQaSubmitter({
      isAnonymous: true,
      userId: "user-1",
      memberDisplayName: "Vibhu",
    });
    expect(result).toEqual({
      ok: true,
      isAnonymous: true,
      submitterName: null,
      userId: "user-1",
    });
  });

  it("uses member display name when not anonymous", () => {
    const result = resolveQaSubmitter({
      isAnonymous: false,
      userId: "user-1",
      memberDisplayName: "Vibhu",
    });
    expect(result).toEqual({
      ok: true,
      isAnonymous: false,
      submitterName: "Vibhu",
      userId: "user-1",
    });
  });

  it("requires guest name when not anonymous and not logged in", () => {
    const result = resolveQaSubmitter({
      isAnonymous: false,
      guestName: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Enter your name");
    }
  });

  it("accepts guest name when not anonymous", () => {
    const result = resolveQaSubmitter({
      isAnonymous: false,
      guestName: "Alex",
    });
    expect(result).toEqual({
      ok: true,
      isAnonymous: false,
      submitterName: "Alex",
      userId: null,
    });
  });

  it("accepts anonymous guest without name", () => {
    const result = resolveQaSubmitter({
      isAnonymous: true,
      guestName: "",
    });
    expect(result).toEqual({
      ok: true,
      isAnonymous: true,
      submitterName: null,
      userId: null,
    });
  });
});

describe("superadmin response access", () => {
  it("isSuperAdminEmail only matches configured superadmin", () => {
    const prev = process.env.SUPERADMIN_EMAIL;
    process.env.SUPERADMIN_EMAIL = "super@example.com";

    expect(isSuperAdminEmail("admin@example.com")).toBe(false);
    expect(isSuperAdminEmail("super@example.com")).toBe(true);

    process.env.SUPERADMIN_EMAIL = prev;
  });
});
