import { useCallback, useEffect, useRef, useState } from 'react'
import { getDashboard, streamUrl } from '../api/client'

// Snapshot (REST) + live balance updates (SSE).
// The server is authoritative: stream events carry a `version`, older ones are ignored.
// Mount with key={operatorId} so state resets when the operator changes.
export function useDashboard(operatorId) {
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [tick, setTick] = useState(0)
  const knownVersion = useRef(-1)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const ctrl = new AbortController()
    getDashboard(operatorId, ctrl.signal)
      .then((s) => {
        const v = Number(s?.balance?.version)
        if (Number.isFinite(v) && v >= knownVersion.current) knownVersion.current = v
        setSnapshot(s)
        setError(null)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e)
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [operatorId, tick])

  useEffect(() => {
    const es = new EventSource(streamUrl(operatorId))
    es.onopen = () => setLive(true)
    es.onerror = () => setLive(false) // EventSource reconnects on its own
    es.addEventListener('balance', (e) => {
      let ev
      try {
        ev = JSON.parse(e.data)
      } catch {
        return
      }
      const v = Number(ev.version)
      if (!Number.isFinite(v) || v <= knownVersion.current) return
      knownVersion.current = v
      setLive(true)
      // Apply the new total/status immediately, then refetch the full snapshot
      // for next-expiry and recent activity.
      setSnapshot((prev) => {
        if (!prev?.balance) return prev
        const sameLevel = String(prev.balance.statusLevel?.id) === String(ev.statusLevelId)
        return {
          ...prev,
          balance: {
            ...prev.balance,
            currentUnits: ev.currentUnits,
            version: String(ev.version),
            updatedAt: ev.updatedAt,
            statusLevel: ev.statusLevelId
              ? sameLevel
                ? { ...prev.balance.statusLevel, name: ev.statusName }
                : { id: ev.statusLevelId, name: ev.statusName }
              : null,
          },
        }
      })
      setTick((t) => t + 1)
    })
    return () => es.close()
  }, [operatorId])

  return { snapshot, error, loading, live, refresh }
}
