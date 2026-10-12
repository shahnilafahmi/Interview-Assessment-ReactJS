import { ACTION_LABELS, fmtDate, fmtSigned, fmtUnits, humanize } from '../lib/format'

// System entries carry their numbers in `metadata` rather than `description`.
function detail(log) {
  const m = log.metadata ?? {}
  const parts = []
  if (m.unitsDelta !== undefined) parts.push(`${fmtSigned(m.unitsDelta)} units`)
  if (m.adjustmentDelta !== undefined) parts.push(`${fmtSigned(m.adjustmentDelta)} units`)
  if (m.expiredUnits !== undefined) parts.push(`${fmtUnits(m.expiredUnits)} units expired`)
  if (m.previousUnits !== undefined && m.currentUnits !== undefined)
    parts.push(`balance ${fmtUnits(m.previousUnits)} → ${fmtUnits(m.currentUnits)}`)
  else if (m.balanceAfter !== undefined) parts.push(`balance ${fmtUnits(m.balanceAfter)}`)
  return parts.join(' · ')
}

export default function ActivityLog({ list }) {
  const { items, loading, error, hasMore, loadMore } = list
  return (
    <div>
      {error && (
        <p className="form-error" role="alert">
          Could not load activity: {error.message}
        </p>
      )}
      <ul className="rows">
        {items.map((log) => (
          <li key={log.id} className="row">
            <p className="row-title">{ACTION_LABELS[log.actionType] ?? humanize(log.actionType)}</p>
            {detail(log) && <p>{detail(log)}</p>}
            {log.description && <p>{log.description}</p>}
            <p className="muted small">
              {fmtDate(log.createdAt ?? log.occurredAt)}
              {log.actorId ? ` · by operator #${log.actorId}` : ' · automatic'}
            </p>
          </li>
        ))}
      </ul>
      {!loading && !error && items.length === 0 && <p className="empty">No activity yet.</p>}
      {loading && <p className="muted center">Loading…</p>}
      {hasMore && !loading && (
        <button type="button" className="btn btn-outline btn-block" onClick={loadMore}>
          Load more
        </button>
      )}
    </div>
  )
}
