import React from "react"
import type { NewsItem } from "../hooks/useNews"

export function NewsList({
  symbol,
  items,
  loading,
  error,
  nextCursor,
  onLoadMore,
}: {
  symbol: string
  items: NewsItem[]
  loading: boolean
  error: string | null
  nextCursor: string | null
  onLoadMore?: () => void
}) {
  const avg =
    items.length ? items.reduce((s, x) => s + (x.sentiment ?? 0), 0) / items.length : 0
  const avgClass =
    avg > 0.05 ? "text-emerald-400" : avg < -0.05 ? "text-rose-400" : "text-gray-300"

  return (
    <div className="mb-6">
      <div className="rounded-2xl border border-[#1B2431] bg-[#0E141C]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1B2431] rounded-t-2xl bg-[#131A23]">
          <span className="font-medium">News — {symbol || "—"}</span>
          {items.length > 0 && (
            <span className="text-xs text-gray-400">
              Avg sentiment <strong className={avgClass}>{(avg * 100).toFixed(0)}%</strong>
            </span>
          )}
        </div>

        <div className="p-4">
          {error && (
            <div className="text-xs text-rose-400 mb-2">Error: {error}</div>
          )}

          {loading && items.length === 0 ? (
            <NewsSkeleton />
          ) : items.length === 0 ? (
            <div className="text-xs text-gray-400">No recent articles found.</div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((n) => (
                <li
                  key={n.id ?? n.url}
                  className="flex gap-3 p-2 rounded-lg bg-[#0A111A] border border-[#1B2431]"
                >
                  {n.image_url ? (
                    <img
                      src={n.image_url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-[#121923] rounded-md flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium hover:underline line-clamp-2"
                      title={n.title}
                    >
                      {n.title}
                    </a>
                    <div className="mt-1 text-[11px] text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis">
                      <span>{n.source ?? "—"}</span>
                      <span>
                        {" "}
                        •{" "}
                        {n.published_at
                          ? new Date(n.published_at).toLocaleString()
                          : "—"}
                      </span>
                      {typeof n.sentiment === "number" && (
                        <span
                          className={
                            n.sentiment > 0.05
                              ? "ml-2 text-emerald-400"
                              : n.sentiment < -0.05
                              ? "ml-2 text-rose-400"
                              : "ml-2 text-gray-400"
                          }
                        >
                          {(n.sentiment * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-3">
            {onLoadMore && nextCursor && (
              <button
                onClick={onLoadMore}
                className="px-3 py-1.5 rounded bg-[#131A23] border border-[#1B2431] text-sm"
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            )}
            {loading && items.length > 0 && <SpinnerDot />}
          </div>
        </div>
      </div>
    </div>
  )
}

function NewsSkeleton() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex gap-3 p-2 rounded-lg bg-[#0A111A] border border-[#1B2431]">
          <div className="w-16 h-16 rounded-md bg-[#121923] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[#121923] rounded animate-pulse w-5/6" />
            <div className="h-3 bg-[#121923] rounded animate-pulse w-3/4" />
            <div className="h-3 bg-[#121923] rounded animate-pulse w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  )
}

function SpinnerDot() {
  return (
    <span className="inline-flex gap-1 items-center text-xs text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
    </span>
  )
}
