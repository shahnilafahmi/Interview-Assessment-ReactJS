import { useCallback, useState } from 'react'
import {
  createAdjustment,
  createAllocation,
  errorText,
  getTimeline,
  listActivityLogs,
  voidAllocation,
} from '../api/client'
import { useDashboard } from '../hooks/useDashboard'
import { usePagedList } from '../hooks/usePagedList'
import ActivityLog from './ActivityLog'
import AllocationForm from './AllocationForm'
import BalanceCard from './BalanceCard'
import SupervisorPanel from './SupervisorPanel'
import Timeline from './Timeline'

const TABS = [
  { id: 'history', label: 'History' },
  { id: 'activity', label: 'Activity' },
  { id: 'supervisor', label: 'Supervisor' },
]

// Render with key={operatorId} so all state resets when the operator changes.
export default function Dashboard({ operatorId, operators, notify }) {
  const { snapshot, error, loading, live, refresh } = useDashboard(operatorId)
  const version = snapshot?.balance?.version

  const loadTimeline = useCallback(
    (limit, offset, signal) => getTimeline(operatorId, { limit, offset }, signal),
    [operatorId],
  )
  const loadActivity = useCallback(
    (limit, offset, signal) => listActivityLogs({ operatorId, limit, offset }, signal),
    [operatorId],
  )
  // Both lists re-query whenever the authoritative balance version changes
  // (own actions, other users, expirations, supervisor corrections).
  const timeline = usePagedList(loadTimeline, version)
  const activity = usePagedList(loadActivity, version)

  const [tab, setTab] = useState('history')
  const [pending, setPending] = useState([])
  const [voidingId, setVoidingId] = useState(null)

  const handleAllocate = async (payload) => {
    const key = payload.idempotencyKey
    setPending((p) => [{ key, unitsDelta: payload.unitsDelta }, ...p])
    try {
      await createAllocation({ ...payload, operatorId, createdBy: operatorId })
      notify('success', 'Allocation saved.')
      refresh()
      return { ok: true }
    } catch (e) {
      const message = errorText(e)
      notify('error', message)
      return { ok: false, message }
    } finally {
      setPending((p) => p.filter((x) => x.key !== key))
    }
  }

  const handleVoid = async (allocationId) => {
    setVoidingId(allocationId)
    try {
      await voidAllocation(allocationId, operatorId)
      notify('success', 'Allocation voided and balance recalculated.')
      refresh()
    } catch (e) {
      notify('error', errorText(e))
    } finally {
      setVoidingId(null)
    }
  }

  const handleAdjust = async (payload) => {
    try {
      await createAdjustment(payload)
      notify('success', 'Correction applied. Balance and status were recalculated.')
      refresh()
      return { ok: true }
    } catch (e) {
      const message = errorText(e)
      notify('error', message)
      return { ok: false, message }
    }
  }

  if (loading && !snapshot) {
    return (
      <p className="center big" aria-busy="true">
        <span className="spinner spinner-dark" aria-hidden="true" /> Loading dashboard…
      </p>
    )
  }

  if (!snapshot) {
    return (
      <div className="card">
        <h2>Could not load the dashboard</h2>
        <p>{error ? error.message : 'Unknown error.'}</p>
        <button type="button" className="btn btn-primary" onClick={refresh}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="layout">
      <div className="stack side">
        <BalanceCard snapshot={snapshot} live={live} busy={pending.length > 0} />
        <AllocationForm
          balanceUnits={snapshot.balance?.currentUnits ?? 0}
          onSubmit={handleAllocate}
        />
      </div>

      <div className="stack main">
        <div className="tabs" role="tablist" aria-label="Details">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={tab === t.id ? 'tab is-on' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="panel"
        >
          {tab === 'history' && (
            <Timeline
              pending={pending}
              list={timeline}
              onVoid={handleVoid}
              voidingId={voidingId}
            />
          )}
          {tab === 'activity' && <ActivityLog list={activity} />}
          {tab === 'supervisor' && (
            <SupervisorPanel
              operatorId={operatorId}
              operators={operators}
              timelineRows={timeline.items}
              onSubmit={handleAdjust}
            />
          )}
        </section>
      </div>
    </div>
  )
}
