// Centralised helpers for resolving API configuration values with
// backwards-compatible fallbacks to the legacy PathPanda keys.
declare const DEFAULT_SIMETRIX_BASE: string | undefined;
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

export function resolveApiBase(fallback?: string): string {
  const env: any = (import.meta as any)?.env ?? {};
  const isDev = !!env?.DEV;
  const defaultFallback = isDev
    ? (typeof window !== "undefined" && typeof window.location !== "undefined"
        ? window.location.origin ?? "http://127.0.0.1:8000"
        : "http://127.0.0.1:8000")
    : "https://api.simetrix.io";
  const baseFallback = fallback ?? defaultFallback;

  const searchBase =
    typeof window !== "undefined" && typeof window.location !== "undefined"
      ? (() => {
          try {
            const params = new URLSearchParams(window.location.search ?? "");
            return params.get("smx_api_base") ?? params.get("apiBase") ?? params.get("api_base") ?? undefined;
          } catch {
            return undefined;
          }
        })()
      : undefined;

  const localStorageBase =
    typeof window !== "undefined" ? (window.localStorage?.getItem("smx_api_base") ?? undefined) : undefined;

  const base = pickFirstString([
    typeof searchBase === "string" ? searchBase : undefined,
    typeof localStorageBase === "string" ? localStorageBase : undefined,
    typeof window !== "undefined" ? (window as any).__SMX_API_BASE__ : undefined,
    typeof window !== "undefined" ? (window as any).__PP_API_BASE__ : undefined,
    env?.VITE_SIMETRIX_API_BASE,
    env?.VITE_PT_API_BASE,
    env?.VITE_PREDICTIVE_API,
    env?.VITE_API_BASE,
    typeof DEFAULT_SIMETRIX_BASE !== "undefined" ? DEFAULT_SIMETRIX_BASE : undefined,
    typeof DEFAULT_PT_BASE !== "undefined" ? DEFAULT_PT_BASE : undefined,
    globalAny.DEFAULT_SIMETRIX_BASE,
    globalAny.DEFAULT_PT_BASE,
    typeof window !== "undefined" && isDev &&
    typeof window.location !== "undefined" &&
    /^https?:/i.test(window.location.origin ?? "") &&
    /^(localhost|127\.[0-9.]+|0\.0\.0\.0|::1)$/i.test(window.location.hostname ?? "")
      ? window.location.origin
      : undefined,
    typeof process !== "undefined" ? (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL : undefined,
    baseFallback,
  ]);

  return base.replace(/\/+$/, "");
}

export function resolveApiKey(): string | undefined {
  if (typeof window !== "undefined") {
    const stored =
      window.localStorage?.getItem("pt_api_key") ??
      window.localStorage?.getItem("smx_api_key") ??
      window.localStorage?.getItem("pp_api_key");
    if (stored && stored.trim()) return stored.trim();
  }

  const env: any = (import.meta as any)?.env ?? {};
  const candidates = [env?.VITE_PT_API_KEY, env?.VITE_SIMETRIX_API_KEY, env?.VITE_API_KEY];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  const globals = [
    typeof DEFAULT_PT_KEY !== "undefined" ? DEFAULT_PT_KEY : undefined,
    globalAny.DEFAULT_PT_KEY,
  ];
  for (const candidate of globals) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) return trimmed;
    }
  }

  return undefined;
}

