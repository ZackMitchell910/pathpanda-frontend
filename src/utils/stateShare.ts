export type SharedState = {
  symbol: string;
  horizon: number | "";
  paths: number;
  chartId?: string;
  mode?: string;
};

export function encodeState(s: SharedState): string {
  const json = JSON.stringify(s);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function decodeState(q: string): SharedState | null {
  try {
    const pad = q.length % 4 ? q + "=".repeat(4 - (q.length % 4)) : q;
    const b64 = pad.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as SharedState;
  } catch {
    return null;
  }
}
