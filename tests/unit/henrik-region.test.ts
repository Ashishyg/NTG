import { describe, expect, it } from "vitest";
import {
  HENRIK_MMR_REGIONS,
  mmrRegionsToTry,
  normalizeHenrikRegion,
} from "@/lib/henrik-region";

describe("henrik region normalization", () => {
  it("defaults empty or invalid regions to ap", () => {
    expect(normalizeHenrikRegion()).toBe("ap");
    expect(normalizeHenrikRegion("")).toBe("ap");
    expect(normalizeHenrikRegion("   ")).toBe("ap");
    expect(normalizeHenrikRegion("invalid")).toBe("ap");
  });

  it("keeps valid Henrik regions", () => {
    expect(normalizeHenrikRegion("AP")).toBe("ap");
    expect(normalizeHenrikRegion("na")).toBe("na");
  });

  it("maps asia aliases to ap", () => {
    expect(normalizeHenrikRegion("asia")).toBe("ap");
    expect(normalizeHenrikRegion("asia-pacific")).toBe("ap");
  });

  it("tries primary region then ap then others", () => {
    const regions = mmrRegionsToTry("na");
    expect(regions[0]).toBe("na");
    expect(regions[1]).toBe("ap");
    expect(regions).toHaveLength(HENRIK_MMR_REGIONS.length);
  });
});
