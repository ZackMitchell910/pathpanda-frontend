// src/hooks/useNews.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  apiKey: string;           // PT_API_KEY for your backend
  limit?: number;           // default 6
  days?: number;            // default 7
  onLog?: (m: string) => void;
  retry?: number;           // default 0
};

const RAW_API_BASE =
  (typeof window !== "undefined" && (window as any).__PP_API_BASE__) ||
  (import.meta as any)?.env?.VITE_PREDICTIVE_API ||
  (import.meta as any)?.env?.VITE_API_BASE ||
  (typeof process !== "undefined" && (process as any)?.env?.NEXT_PUBLIC_BACKEND_URL) ||
  "https://pathpanda-api.onrender.com";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const api = (p: string) => `${API_BASE}${p}`;

export function useNews({
  symbol,
  includeNews,
  apiKey,
  limit = 6,
  days = 7,
  onLog,
  retry = 0,
}: UseNewsArgs) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(0);
  const sym = (symbol || "").trim().toUpperCase();

  const canFetch = includeNews && !!apiKey && !!sym;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      Accept: "application/json",
    }),
    [apiKey]
  );

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

        const r = await fetch(u.toString(), { headers });
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
    [canFetch, days, fetch, headers, limit, onLog, retry, sym]
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
