import { useState } from 'react'
import { fmtDate, fmtSigned, fmtUnits, TYPE_LABELS, humanize } from '../lib/format'

function Row({ row, onVoid, voiding }) {
  const [confirming, setConfirming] = useState(false)
  const delta = Number(row.unitsDelta)
  const label = TYPE_LABELS[row.allocationType] ?? humanize(row.allocationType)
  const canVoid = row.allocationType === 'NORMAL'

  return (
    <li className="row">
      <div className="row-main">
        <div>
          <p className="row-title">{label}</p>
          <p className="muted small">{fmtDate(row.effectiveAt)}</p>
          {row.expiresAt && <p className="muted small">Expires {fmtDate(row.expiresAt)}</p>}
        </div>
        <div className="row-nums">
          <p className={`delta ${delta < 0 ? 'neg' : 'pos'}`}>{fmtSigned(row.unitsDelta)}</p>
          <p className="small">
            Total <strong>{fmtUnits(row.runningUnits)}</strong>
          </p>
          {row.statusLevel?.name && <p className="chip chip-sm">{row.statusLevel.name}</p>}
        </div>
      </div>

      {canVoid &&
        (confirming ? (
          <div className="confirm">
            <span>Void this allocation?</span>
            <button type="button" className="btn btn-outline" onClick={() => setConfirming(false)}>
              Keep
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={voiding}
              onClick={async () => {
                await onVoid(row.allocationId)
                setConfirming(false)
              }}
            >
              {voiding ? 'Voiding…' : 'Yes, void'}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-link" onClick={() => setConfirming(true)}>
            Void…
          </button>
        ))}
    </li>
  )
}

export default function Timeline({ pending, list, onVoid, voidingId }) {
  const { items, loading, error, hasMore, loadMore } = list
  return (
    <div>
      {error && (
        <p className="form-error" role="alert">
          Could not load history: {error.message}
        </p>
      )}
      <ul className="rows">
        {pending.map((p) => (
          <li key={p.key} className="row row-pending" aria-busy="true">
            <div className="row-main">
              <div>
                <p className="row-title">
                  <span className="spinner spinner-dark" aria-hidden="true" /> Saving…
                </p>
                <p className="muted small">Waiting for the server to confirm</p>
              </div>
              <div className="row-nums">
                <p className={`delta ${Number(p.unitsDelta) < 0 ? 'neg' : 'pos'}`}>
                  {fmtSigned(p.unitsDelta)}
                </p>
              </div>
            </div>
          </li>
        ))}
        {items.map((row) => (
          <Row
            key={`${row.allocationId}-${row.allocationType}-${row.effectiveAt}`}
            row={row}
            onVoid={onVoid}
            voiding={voidingId === row.allocationId}
          />
        ))}
      </ul>
      {!loading && !error && items.length === 0 && pending.length === 0 && (
        <p className="empty">No allocations yet. Add the first one above.</p>
      )}
      {loading && <p className="muted center">Loading…</p>}
      {hasMore && !loading && (
        <button type="button" className="btn btn-outline btn-block" onClick={loadMore}>
          Load more
        </button>
      )}
    </div>
  )
}
