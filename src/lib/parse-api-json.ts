/** Parse fetch response as JSON; surface plain-text/HTML error bodies from proxies. */
export async function parseApiJson(res: Response): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string }
> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      message: res.ok ? "Empty response from server." : `Request failed (${res.status}).`,
    };
  }

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 160);
    return {
      ok: false,
      message: snippet || `Request failed (${res.status}).`,
    };
  }
}
