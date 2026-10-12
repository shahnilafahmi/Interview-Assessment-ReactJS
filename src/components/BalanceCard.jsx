import { fmtDate, fmtTime, fmtUnits, timeUntil } from '../lib/format'

export default function BalanceCard({ snapshot, live, busy }) {
  const { operator, balance, nextExpiry } = snapshot
  const level = balance?.statusLevel
  const hasMax = level?.maxUnits !== undefined && level?.maxUnits !== null
  const range =
    level?.minUnits !== undefined
      ? `${fmtUnits(level.minUnits)} – ${hasMax ? fmtUnits(level.maxUnits) : 'no upper limit'} units`
      : null

  return (
    <section className="card balance-card" aria-labelledby="balance-title">
      <div className="card-head">
        <h2 id="balance-title">{operator?.fullName ?? 'Operator'}</h2>
        {operator?.tier?.tierName && <span className="chip">Tier: {operator.tier.tierName}</span>}
      </div>

      <p className="balance-label">Units available</p>
      <p className={`balance-number${busy ? ' is-busy' : ''}`} aria-live="polite">
        {balance ? fmtUnits(balance.currentUnits) : '—'}
      </p>

      <div className="status-row">
        <span className={`status-badge${level ? '' : ' status-none'}`}>
          <span aria-hidden="true">★</span> {level?.name ?? 'No status level'}
        </span>
        {range && <span className="muted">{range}</span>}
      </div>

      {nextExpiry && (
        <p className="expiry">
          <strong>{fmtUnits(nextExpiry.units)} units</strong> expire{' '}
          {timeUntil(nextExpiry.expiresAt)} <span className="muted">({fmtDate(nextExpiry.expiresAt)})</span>
        </p>
      )}

      <p className="muted small">
        {live ? '● Live' : '○ Reconnecting — figures may be out of date'}
        {balance?.updatedAt && ` · Updated ${fmtTime(balance.updatedAt)}`}
      </p>
    </section>
  )
}
