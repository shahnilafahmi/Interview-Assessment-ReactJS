import { useCallback, useEffect, useState } from 'react'

// Loads `pageSize * pages` rows from offset 0 on every refresh, so rows already
// revealed with "Load more" stay in sync with the server (e.g. after a
// retroactive adjustment changes running totals).
// `load(limit, offset, signal)` must be referentially stable (useCallback).
export function usePagedList(load, refreshKey, pageSize = 15) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const ctrl = new AbortController()
    const limit = pageSize * pages
    load(limit, 0, ctrl.signal)
      .then((rows) => {
        setItems(rows)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [load, refreshKey, pages, pageSize])

  const loadMore = useCallback(() => {
    setLoading(true)
    setPages((p) => p + 1)
  }, [])

  return {
    items,
    loading,
    error,
    loadMore,
    hasMore: items.length >= pageSize * pages,
  }
}
