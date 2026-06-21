import { describe, expect, it } from "vitest";
import {
  RANK_SYNC_ADMIN_BATCH_SIZE,
  RANK_SYNC_MAX_BATCH_SIZE,
} from "@tournaments-leagues/application/rank-sync.service";

describe("rank-sync batch config", () => {
  it("caps nightly cron batches at 10 players", () => {
    expect(RANK_SYNC_MAX_BATCH_SIZE).toBe(10);
  });

  it("uses the same batch size for admin all-region refresh", () => {
    expect(RANK_SYNC_ADMIN_BATCH_SIZE).toBe(RANK_SYNC_MAX_BATCH_SIZE);
  });
});
