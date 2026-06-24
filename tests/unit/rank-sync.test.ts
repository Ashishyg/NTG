import { describe, expect, it } from "vitest";
import {
  RANK_SYNC_ADMIN_BATCH_SIZE,
  RANK_SYNC_MAX_BATCH_SIZE,
} from "@tournaments-leagues/application/rank-sync.service";

describe("rank-sync batch config", () => {
  it("keeps batches small enough for Vercel Hobby 10s function limit", () => {
    expect(RANK_SYNC_MAX_BATCH_SIZE).toBe(1);
  });

  it("admin batch size does not exceed max batch size", () => {
    expect(RANK_SYNC_ADMIN_BATCH_SIZE).toBeLessThanOrEqual(RANK_SYNC_MAX_BATCH_SIZE);
  });
});
