import React from "react";

export interface NewsItem {
  id?: string;
  url: string;
  title: string;
  source?: string;
  published_at?: string;
  sentiment?: number;
  image_url?: string;
}

type Props = {
  symbol: string;
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null | undefined;
  onLoadMore: () => void;
};

export const NewsList: React.FC<Props> = ({
  symbol,
  items,
  loading,
  error,
  nextCursor,
  onLoadMore,
}) => {
  return (
    <div className="space-y-3">
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {items.length === 0 && !loading && (
        <div className="text-xs text-gray-400">No news for {symbol} yet.</div>
      )}

      <ul className="space-y-3">
        {items.map((n) => (
          <li
            key={n.id ?? n.url}
            className="p-3 rounded bg-[#0F1620] border border-[#212C3B]"
          >
            <a
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              {n.title}
            </a>
            <div className="text-xs text-gray-400 mt-1">
              {n.source ? `${n.source} • ` : ""}
              {n.published_at || ""}
              {typeof n.sentiment === "number" && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-[#131A23] border border-[#1B2431]">
                  Sent: {n.sentiment.toFixed(2)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="pt-2">
        <button
          className="px-3 py-1 rounded bg-[#131A23] border border-[#1B2431] text-sm disabled:opacity-50"
          onClick={onLoadMore}
          disabled={loading || !nextCursor}
          aria-label="Load more news"
        >
          {loading ? "Loading…" : nextCursor ? "Load More" : "No more"}
        </button>
      </div>
    </div>
  );
};
