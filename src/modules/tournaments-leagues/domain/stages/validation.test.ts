import { describe, expect, it } from "vitest";
import {
  resolveSelectorPositions,
  validateStageGraph,
} from "./validation";

describe("resolveSelectorPositions", () => {
  it("resolves top N", () => {
    expect(resolveSelectorPositions({ kind: "TOP_N", n: 2 }, 4)).toEqual([1, 2]);
  });

  it("resolves bottom N", () => {
    expect(resolveSelectorPositions({ kind: "BOTTOM_N", n: 2 }, 4)).toEqual([3, 4]);
  });

  it("resolves positions", () => {
    expect(
      resolveSelectorPositions({ kind: "POSITION", positions: [1, 3] }, 4),
    ).toEqual([1, 3]);
  });
});

describe("validateStageGraph", () => {
  it("rejects cycles", () => {
    const issues = validateStageGraph({
      stages: [
        {
          id: "a",
          name: "A",
          order: 1,
          stageType: "ROUND_ROBIN",
          groups: [{ id: "ga", name: "Pool A", order: 1 }],
          rules: [
            {
              selector: { kind: "TOP_N", n: 1 },
              destination: { kind: "STAGE_GROUP", stageId: "b", groupId: "gb" },
            },
          ],
        },
        {
          id: "b",
          name: "B",
          order: 2,
          stageType: "ROUND_ROBIN",
          groups: [{ id: "gb", name: "Pool B", order: 1 }],
          rules: [
            {
              selector: { kind: "TOP_N", n: 1 },
              destination: { kind: "STAGE_GROUP", stageId: "a", groupId: "ga" },
            },
          ],
        },
      ],
    });
    expect(issues.some((i) => i.message.includes("cycle"))).toBe(true);
  });

  it("allows simple SE → champion", () => {
    const issues = validateStageGraph({
      stages: [
        {
          id: "s1",
          name: "Finals",
          order: 1,
          stageType: "SINGLE_ELIMINATION",
          rules: [
            {
              selector: { kind: "TOP_N", n: 1 },
              destination: { kind: "CHAMPION" },
            },
          ],
        },
      ],
    });
    expect(issues).toEqual([]);
  });
});
