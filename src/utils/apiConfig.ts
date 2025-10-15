// Centralised helpers for resolving API configuration values with
// backwards-compatible fallbacks to the legacy PathPanda keys.
declare const DEFAULT_SIMETRIX_BASE: string | undefined;
declare const DEFAULT_SIMETRIX_KEY: string | undefined;
declare const DEFAULT_PT_BASE: string | undefined;
declare const DEFAULT_PT_KEY: string | undefined;

const globalAny = globalThis as Record<string, unknown>;

function pickFirstString(values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return "";
}

export function resolveApiBase(fallback = "https://api.simetrix.io"): string {
  const base = pickFirstString([
    typeof window !== "undefined" ? (window as any).__SMX_API_BASE__ : undefined,
    typeof window !== "undefined" ? (window as any).__PP_API_BASE__ : undefined,
    typeof window !== "undefined" &&
    (import.meta as any)?.env?.DEV &&
    typeof window.location !== "undefined" &&
    /^https?:/i.test(window.location.origin ?? "") &&
    /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1)$/.test(window.location.hostname ?? "")
      ? window.location.origin
      : undefined,
    typeof DEFAULT_SIMETRIX_BASE !== "undefined" ? DEFAULT_SIMETRIX_BASE : undefined,
    typeof DEFAULT_PT_BASE !== "undefined" ? DEFAULT_PT_BASE : undefined,
    globalAny.DEFAULT_SIMETRIX_BASE,
    globalAny.DEFAULT_PT_BASE,
    (import.meta as any)?.env?.VITE_SIMETRIX_API_BASE,
    (import.meta as any)?.env?.VITE_PT_API_BASE,
    (import.meta as any)?.env?.VITE_PREDICTIVE_API,
    (import.meta as any)?.env?.VITE_API_BASE,
    typeof process !== "undefined" ? (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL : undefined,
    fallback,
  ]);

  return base.replace(/\/+$/, "");
}

export function resolveApiKey(): string {
  return pickFirstString([
    typeof window !== "undefined" ? (window as any).__SMX_KEY__ : undefined,
    typeof window !== "undefined" ? (window as any).__PP_KEY__ : undefined,
    typeof DEFAULT_SIMETRIX_KEY !== "undefined" ? DEFAULT_SIMETRIX_KEY : undefined,
    typeof DEFAULT_PT_KEY !== "undefined" ? DEFAULT_PT_KEY : undefined,
    globalAny.DEFAULT_SIMETRIX_KEY,
    globalAny.DEFAULT_PT_KEY,
    (import.meta as any)?.env?.VITE_SIMETRIX_API_KEY,
    (import.meta as any)?.env?.VITE_PT_API_KEY,
    (import.meta as any)?.env?.VITE_API_KEY,
    typeof window !== "undefined" ? window.localStorage?.getItem("smx_api_key") : undefined,
    typeof window !== "undefined" ? window.localStorage?.getItem("pp_api_key") : undefined,
  ]);
}
