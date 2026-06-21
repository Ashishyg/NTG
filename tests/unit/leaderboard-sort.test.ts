import { describe, expect, it } from "vitest";
import { sortValorantBoardEntries } from "@/lib/leaderboard-sort";

describe("sortValorantBoardEntries", () => {
  it("sorts ranked players by MMR descending", () => {
    const sorted = sortValorantBoardEntries([
      { rank: 3, mmr: 1200, rankTierId: 15, displayName: "A" },
      { rank: 1, mmr: 2100, rankTierId: 24, displayName: "B" },
      { rank: 2, mmr: 1800, rankTierId: 21, displayName: "C" },
    ]);

    expect(sorted.map((e) => e.displayName)).toEqual(["B", "C", "A"]);
    expect(sorted.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("preserves stored rank order when all unranked", () => {
    const sorted = sortValorantBoardEntries([
      { rank: 2, mmr: null, rankTierId: 0, displayName: "Shanks" },
      { rank: 1, mmr: null, rankTierId: 0, displayName: "Vachan" },
      { rank: 3, mmr: null, rankTierId: 0, displayName: "Conor" },
    ]);

    expect(sorted.map((e) => e.displayName)).toEqual(["Vachan", "Shanks", "Conor"]);
    expect(sorted.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("puts ranked first then unranked by preserved rank", () => {
    const sorted = sortValorantBoardEntries([
      { rank: 1, mmr: null, rankTierId: 0, displayName: "WasFirst" },
      { rank: 2, mmr: 2100, rankTierId: 24, displayName: "Ranked" },
      { rank: 3, mmr: null, rankTierId: 0, displayName: "WasThird" },
    ]);

    expect(sorted.map((e) => e.displayName)).toEqual(["Ranked", "WasFirst", "WasThird"]);
    expect(sorted[0]?.rank).toBe(1);
    expect(sorted[1]?.rank).toBe(1);
    expect(sorted[2]?.rank).toBe(3);
  });
});
