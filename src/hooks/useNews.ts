import { useEffect, useState } from "react"

export type NewsItem = {
  id?: string
  title: string
  url: string
  published_at: string
  source?: string
  sentiment?: number
  image_url?: string
}
export type NewsResponse = { items: NewsItem[]; next_cursor?: string | null }

type Options = {
  symbol: string
  includeNews: boolean
  limit?: number
  days?: number
  getApiKey: () => string | null
  log?: (msg: string) => void
}

export function useNews({
  symbol,
  includeNews,
  limit = 6,
  days = 7,
  getApiKey,
  log = () => {},
}: Options) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    if (!includeNews) {
      setItems([])
      setNextCursor(null)
      setLoading(false)
      setError(null)
      return () => { cancelled = true; ctrl.abort() }
    }

    // reset on symbol/include toggle
    setItems([])
    setNextCursor(null)
    setError(null)
    setLoading(true)

    ;(async () => {
      const key = getApiKey()
      if (!key) {
        setLoading(false)
        setError("Missing API key")
        log("Error: Please enter a valid API key")
        return
      }
      try {
        const url = `/api/news/${encodeURIComponent(symbol)}?limit=${limit}&days=${days}`
        const res = await fetch(url, { headers: { "X-API-Key": key }, signal: ctrl.signal })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        const shape: NewsResponse = Array.isArray(json) ? { items: json, next_cursor: null } : json
        if (cancelled) return
        setItems(shape.items ?? [])
        setNextCursor(shape.next_cursor ?? null)
        const avg = (shape.items?.length ?? 0)
          ? shape.items.reduce((s, x) => s + (x.sentiment ?? 0), 0) / shape.items.length
          : 0
        log(`News loaded: ${shape.items?.length ?? 0} — est. sentiment ${(avg * 100).toFixed(1)}%`)
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "News fetch failed")
          log(`News fetch error: ${e?.message || e}`)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true; ctrl.abort() }
  }, [symbol, includeNews, limit, days, getApiKey, log])

  const loadMore = async () => {
    if (!nextCursor) return
    const key = getApiKey()
    if (!key) { setError("Missing API key"); return }
    try {
      setLoading(true)
      const url = `/api/news/${encodeURIComponent(symbol)}?limit=${limit}&days=${days}&cursor=${encodeURIComponent(nextCursor)}`
      const res = await fetch(url, { headers: { "X-API-Key": key } })
      if (!res.ok) throw new Error(String(res.status))
      const data: NewsResponse = await res.json()
      setItems(prev => {
        const seen = new Set(prev.map(x => x.id ?? x.url))
        const fresh = (data.items ?? []).filter(x => !seen.has(x.id ?? x.url))
        return [...prev, ...fresh]
      })
      setNextCursor(data.next_cursor ?? null)
    } catch (e: any) {
      setError(e?.message || "News fetch failed")
      log(`News fetch error: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  return { items, nextCursor, loading, error, loadMore }
}
