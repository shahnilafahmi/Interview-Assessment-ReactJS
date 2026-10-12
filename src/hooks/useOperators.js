import { useCallback, useEffect, useState } from 'react'
import { listOperators } from '../api/client'

export function useOperators() {
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const ctrl = new AbortController()
    listOperators({ isActive: 'true', limit: 200 }, ctrl.signal)
      .then((rows) => {
        setOperators(rows)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [tick])

  return { operators, loading, error, reload }
}
