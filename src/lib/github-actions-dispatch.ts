const GITHUB_API = "https://api.github.com";
const WORKFLOW_FILE = "daily-leaderboard-refresh.yml";
const DEFAULT_REPO = "Vibhubalan/NTG";

export type DispatchDailyLeaderboardResult =
  | { ok: true; dispatched: true }
  | { ok: false; reason: string };

/**
 * Triggers the daily leaderboard GitHub Actions workflow via workflow_dispatch.
 * Vercel cron calls this — more reliable than GHA's native schedule trigger.
 */
export async function dispatchDailyLeaderboardWorkflow(): Promise<DispatchDailyLeaderboardResult> {
  const token = process.env.GITHUB_ACTIONS_DISPATCH_TOKEN?.trim();
  if (!token) {
    return { ok: false, reason: "GITHUB_ACTIONS_DISPATCH_TOKEN not configured." };
  }

  const repo = process.env.GITHUB_ACTIONS_REPO?.trim() || DEFAULT_REPO;
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    return { ok: false, reason: `Invalid GITHUB_ACTIONS_REPO: ${repo}` };
  }

  const ref = process.env.GITHUB_ACTIONS_REF?.trim() || "main";
  const url = `${GITHUB_API}/repos/${owner}/${name}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref }),
  });

  if (response.status === 204) {
    return { ok: true, dispatched: true };
  }

  const body = await response.text().catch(() => "");
  return {
    ok: false,
    reason: `GitHub dispatch failed (${response.status}): ${body.slice(0, 200)}`,
  };
}
