import { describe, expect, it } from "vitest";
import { isValidRiotIdFormat } from "@/lib/riot-id";

describe("isValidRiotIdFormat", () => {
  it("accepts standard alphanumeric tags", () => {
    expect(isValidRiotIdFormat("Player#NA1")).toBe(true);
    expect(isValidRiotIdFormat("ValkoN 炎#vibhu")).toBe(true);
  });

  it("accepts Japanese tag lines", () => {
    expect(isValidRiotIdFormat("Arsh#ツッツ")).toBe(true);
  });

  it("rejects missing hash or invalid lengths", () => {
    expect(isValidRiotIdFormat("ab#cd")).toBe(false);
    expect(isValidRiotIdFormat("Player")).toBe(false);
    expect(isValidRiotIdFormat("Player#AB")).toBe(false);
  });
});
