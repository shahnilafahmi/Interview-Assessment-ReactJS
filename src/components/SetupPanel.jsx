import { useEffect, useState } from 'react'
import {
  createOperator,
  createStatusLevel,
  createTier,
  errorText,
  listStatusLevels,
  listTiers,
} from '../api/client'

function useLoaded(fetcher, tick) {
  const [rows, setRows] = useState([])
  useEffect(() => {
    let alive = true
    fetcher()
      .then((r) => alive && setRows(r))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [fetcher, tick])
  return rows
}

const fetchTiers = () => listTiers({ limit: 200 })

// First-run helper: tiers, status levels and operators must exist before
// anyone can log allocations.
export default function SetupPanel({ operators, onChanged, notify }) {
  const [tick, setTick] = useState(0)
  const tiers = useLoaded(fetchTiers, tick)
  const levels = useLoaded(listStatusLevels, tick)
  const bump = () => {
    setTick((t) => t + 1)
    onChanged()
  }

  const run = async (fn, okMsg) => {
    try {
      await fn()
      notify('success', okMsg)
      bump()
      return true
    } catch (e) {
      notify('error', errorText(e))
      return false
    }
  }

  const [tier, setTier] = useState({ tierName: '', expirationWindow: '30 days' })
  const [level, setLevel] = useState({ statusName: '', minUnits: '', maxUnits: '' })
  const [op, setOp] = useState({ fullName: '', email: '', tierId: '' })

  return (
    <div className="stack">
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault()
          if (await run(() => createTier(tier), `Tier "${tier.tierName}" created.`))
            setTier({ ...tier, tierName: '' })
        }}
      >
        <h2>1 · Operator tier</h2>
        <p className="muted">Tiers decide how long allocations last before they expire.</p>
        <label className="field" htmlFor="t-name">Tier name</label>
        <input id="t-name" className="input" required value={tier.tierName}
          onChange={(e) => setTier({ ...tier, tierName: e.target.value })} />
        <label className="field" htmlFor="t-win">Expiration window</label>
        <input id="t-win" className="input" required placeholder="30 days, 12 hours, 01:30:00"
          value={tier.expirationWindow}
          onChange={(e) => setTier({ ...tier, expirationWindow: e.target.value })} />
        <button className="btn btn-primary btn-block" type="submit">Create tier</button>
        {tiers.length > 0 && (
          <p className="muted small">
            Existing: {tiers.map((t) => `${t.tierName} (${t.expirationWindow})`).join(', ')}
          </p>
        )}
      </form>

      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault()
          const body = {
            statusName: level.statusName,
            minUnits: level.minUnits,
            maxUnits: level.maxUnits === '' ? null : level.maxUnits,
          }
          if (await run(() => createStatusLevel(body), `Status "${level.statusName}" created.`))
            setLevel({ statusName: '', minUnits: '', maxUnits: '' })
        }}
      >
        <h2>2 · Status level</h2>
        <p className="muted">The operator's status follows their running unit total.</p>
        <label className="field" htmlFor="s-name">Status name</label>
        <input id="s-name" className="input" required value={level.statusName}
          onChange={(e) => setLevel({ ...level, statusName: e.target.value })} />
        <label className="field" htmlFor="s-min">From (units)</label>
        <input id="s-min" className="input" type="number" inputMode="decimal" step="0.01" min="0" required
          value={level.minUnits} onChange={(e) => setLevel({ ...level, minUnits: e.target.value })} />
        <label className="field" htmlFor="s-max">Up to (units, empty = no limit)</label>
        <input id="s-max" className="input" type="number" inputMode="decimal" step="0.01" min="0"
          value={level.maxUnits} onChange={(e) => setLevel({ ...level, maxUnits: e.target.value })} />
        <button className="btn btn-primary btn-block" type="submit">Create status level</button>
        {levels.length > 0 && (
          <p className="muted small">
            Existing:{' '}
            {levels
              .map((l) => `${l.statusName} (${l.minUnits}–${l.maxUnits ?? '∞'})`)
              .join(', ')}
          </p>
        )}
      </form>

      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault()
          const body = {
            fullName: op.fullName,
            tierId: op.tierId,
            ...(op.email ? { email: op.email } : {}),
          }
          if (await run(() => createOperator(body), `Operator "${op.fullName}" created.`))
            setOp({ fullName: '', email: '', tierId: op.tierId })
        }}
      >
        <h2>3 · Operator</h2>
        <label className="field" htmlFor="o-name">Full name</label>
        <input id="o-name" className="input" required value={op.fullName}
          onChange={(e) => setOp({ ...op, fullName: e.target.value })} />
        <label className="field" htmlFor="o-mail">Email (optional)</label>
        <input id="o-mail" className="input" type="email" value={op.email}
          onChange={(e) => setOp({ ...op, email: e.target.value })} />
        <label className="field" htmlFor="o-tier">Tier</label>
        <select id="o-tier" className="input" required value={op.tierId}
          onChange={(e) => setOp({ ...op, tierId: e.target.value })}>
          <option value="">Select…</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>{t.tierName}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-block" type="submit">Create operator</button>
        {operators.length > 0 && (
          <p className="muted small">Existing: {operators.map((o) => o.fullName).join(', ')}</p>
        )}
      </form>
    </div>
  )
}
