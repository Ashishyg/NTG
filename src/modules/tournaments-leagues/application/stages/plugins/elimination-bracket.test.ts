import { describe, expect, it } from "vitest";
import { doubleEliminationPlugin } from "./double-elimination";
import { singleEliminationPlugin } from "./single-elimination";
import type { StageGenerateContext } from "@tournaments-leagues/domain/stages/types";

function ctx(teamCount: number): StageGenerateContext {
  const seededTeamIds = Array.from({ length: teamCount }, (_, i) => `t${i + 1}`);
  const teamNames = new Map(seededTeamIds.map((id, i) => [id, `Team ${i + 1}`]));
  return {
    stageId: "s1",
    stageType: "DOUBLE_ELIMINATION",
    matchFormat: "BO3",
    config: null,
    seededTeamIds,
    teamNames,
    groups: [],
  };
}

describe("elimination brackets scale with team count", () => {
  it("single elim: 4 teams → 2 rounds, 3 matches", () => {
    const matches = singleEliminationPlugin.generateMatches({
      ...ctx(4),
      stageType: "SINGLE_ELIMINATION",
    });
    expect(matches.filter((m) => m.roundNumber === 1)).toHaveLength(2);
    expect(matches.filter((m) => m.roundNumber === 2)).toHaveLength(1);
    expect(matches).toHaveLength(3);
  });

  it("single elim: 5 teams pads to 8 → 7 matches", () => {
    const matches = singleEliminationPlugin.generateMatches({
      ...ctx(5),
      stageType: "SINGLE_ELIMINATION",
    });
    expect(matches.filter((m) => m.roundNumber === 1)).toHaveLength(4);
    expect(matches).toHaveLength(7);
  });

  it("double elim: 4 teams → WB 3 + LB 2 + GF 1", () => {
    const matches = doubleEliminationPlugin.generateMatches(ctx(4));
    const wb = matches.filter((m) => m.bracketSide === "winners");
    const lb = matches.filter((m) => m.bracketSide === "losers");
    const gf = matches.filter((m) => m.bracketSide === "grand_final");
    expect(wb).toHaveLength(3);
    expect(lb.filter((m) => m.roundNumber === 1)).toHaveLength(1);
    expect(lb.filter((m) => m.roundNumber === 2)).toHaveLength(1);
    expect(lb).toHaveLength(2);
    expect(gf).toHaveLength(1);
  });

  it("double elim: 8 teams → LB rounds [2,2,1,1]", () => {
    const matches = doubleEliminationPlugin.generateMatches(ctx(8));
    const lb = matches.filter((m) => m.bracketSide === "losers");
    expect(lb.filter((m) => m.roundNumber === 1)).toHaveLength(2);
    expect(lb.filter((m) => m.roundNumber === 2)).toHaveLength(2);
    expect(lb.filter((m) => m.roundNumber === 3)).toHaveLength(1);
    expect(lb.filter((m) => m.roundNumber === 4)).toHaveLength(1);
    expect(lb).toHaveLength(6);
    expect(matches.filter((m) => m.bracketSide === "winners")).toHaveLength(7);
    expect(matches.filter((m) => m.bracketSide === "grand_final")).toHaveLength(1);
  });

  it("double elim: WB R1 losers wire into LB R1", () => {
    const matches = doubleEliminationPlugin.generateMatches(ctx(4));
    const wbR1 = matches.filter(
      (m) => m.bracketSide === "winners" && m.roundNumber === 1,
    );
    expect(wbR1.every((m) => m.nextLoserKey === "de-l-r1-p1")).toBe(true);
  });
});
