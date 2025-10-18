// src/hooks/useNews.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveApiBase } from "@/utils/apiConfig";
import type { SimetrixClient } from "@/api/simetrixClient";

type NewsItem = {
  id: string;
  title: string;
  url: string;
  published_at: string;
  source: string;
  sentiment: number;
  image_url?: string;
};

type UseNewsArgs = {
  symbol: string;
  includeNews: boolean;
  apiKey?: string;
  apiBase?: string;
  getHeaders?: () => Record<string, string> | null | undefined;
  limit?: number;
  days?: number;
  onLog?: (m: string) => void;
  retry?: number;
  client?: SimetrixClient;
};

const FALLBACK_API_BASE = "https://api.simetrix.io/";
const DEFAULT_API_BASE = resolveApiBase(FALLBACK_API_BASE);

export function useNews({
  symbol,
  includeNews,
  apiKey,
  apiBase,
  getHeaders,
  limit = 6,
  days = 7,
  onLog,
  retry = 0,
  client,
}: UseNewsArgs) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(0);
  const sym = (symbol || "").trim().toUpperCase();

  const resolvedBase = useMemo(() => {
    const candidate = (apiBase || "").trim();
    const base = candidate.length ? candidate : DEFAULT_API_BASE;
    return base.replace(/\/+$/, "");
  }, [apiBase]);
  const api = useCallback(
    (p: string) => `${resolvedBase}${p.startsWith("/") ? "" : "/"}${p}`,
    [resolvedBase]
  );

  const canFetch = includeNews && !!sym;

  const fetchPage = useCallback(
    async (cursor?: string | null) => {
      if (!canFetch) return;
      setLoading(true);
      setError(null);
      try {
        const u = new URL(api(`/api/news/${encodeURIComponent(sym)}`));
        u.searchParams.set("limit", String(limit));
        u.searchParams.set("days", String(days));
        if (cursor) u.searchParams.set("cursor", cursor);

        let headers: Record<string, string> = { Accept: "application/json" };
        try {
          const custom = typeof getHeaders === "function" ? getHeaders() : null;
          if (custom && typeof custom === "object") {
            headers = { ...headers, ...custom };
          }
        } catch (headerErr: any) {
          onLog?.(`News headers error: ${headerErr?.message || headerErr}`);
        }

        const hasContentType = Object.keys(headers).some(
          (key) => key.toLowerCase() === "content-type"
        );
        if (!hasContentType) {
          headers = { ...headers, "Content-Type": "application/json" };
        }

        const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
        const hasApiKey = trimmedKey.length > 0;
        if (hasApiKey) {
          headers = {
            ...headers,
            "X-API-Key": trimmedKey,
          };
        }

        const request = client
          ? (path: string) =>
              client.request(path, {
                 headers,
                 credentials: hasApiKey ? "omit" : undefined,
               })
           : (path: string) =>
               fetch(path, {
                 headers,
                 credentials: hasApiKey ? "omit" : "include",
               });
        const r = await request(u.toString());
        const txt = await r.text().catch(() => "");
        if (!r.ok) {
          const msg = txt || `HTTP ${r.status}`;
          throw new Error(msg);
        }
        const js = txt ? JSON.parse(txt) : {};
        const newItems: NewsItem[] = Array.isArray(js?.items) ? js.items : [];
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const it of newItems) if (!seen.has(it.id)) merged.push(it);
          return merged;
        });
        setNextCursor(js?.nextCursor ?? null);
        onLog?.(`Fetched ${newItems.length} news items${cursor ? " (more)" : ""}`);
      } catch (e: any) {
        const msg = e?.message || String(e);
        setError(msg);
        onLog?.(`News error: ${msg}`);
        if (tried.current < (retry ?? 0)) {
          tried.current += 1;
          setTimeout(() => fetchPage(cursor), 800);
        }
      } finally {
        setLoading(false);
      }
    },
    [api, apiKey, canFetch, client, days, getHeaders, limit, onLog, retry, sym]
  );

  // initial load when inputs change
  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    tried.current = 0;
    if (canFetch) fetchPage(null);
  }, [canFetch, sym, limit, days, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !nextCursor) return;
    fetchPage(nextCursor);
  }, [fetchPage, loading, nextCursor]);

  return { items, nextCursor, loading, error, loadMore };
}
