import { useRef, useState } from 'react'
import { fmtUnits, newKey, toLocalInput } from '../lib/format'

const PRESETS = [5, 10, 25, 50, 100]

// Large, low-typing form. The idempotency key is reused for a retry of the same
// values and regenerated whenever the user edits anything, so a double tap or a
// flaky-network retry can never create two ledger entries.
export default function AllocationForm({ balanceUnits, onSubmit }) {
  const [mode, setMode] = useState('add') // 'add' | 'use'
  const [amount, setAmount] = useState('')
  const [backdate, setBackdate] = useState(false)
  const [effectiveAt, setEffectiveAt] = useState(() => toLocalInput())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const keyRef = useRef(newKey())

  const touch = () => {
    keyRef.current = newKey()
    setMessage(null)
  }

  const n = Number(amount)
  const validNumber = amount !== '' && Number.isFinite(n) && n > 0
  const tooManyDecimals = amount.includes('.') && amount.split('.')[1].length > 2
  const insufficient =
    mode === 'use' && !backdate && validNumber && Number(balanceUnits) < n
  const problem = !validNumber
    ? 'Enter how many units.'
    : tooManyDecimals
      ? 'Use at most 2 decimal places.'
      : insufficient
        ? `Not enough units — only ${fmtUnits(balanceUnits)} available.`
        : null

  const setAmountValue = (v) => {
    touch()
    setAmount(String(v))
  }
  const step = (d) => {
    const next = Math.max(0, Math.round(((validNumber ? n : 0) + d) * 100) / 100)
    setAmountValue(next === 0 ? '' : next)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy || problem) {
      if (problem) setMessage(problem)
      return
    }
    setBusy(true)
    setMessage(null)
    const payload = {
      unitsDelta: ((mode === 'use' ? -1 : 1) * n).toFixed(2),
      idempotencyKey: keyRef.current,
    }
    if (backdate && effectiveAt) payload.effectiveAt = new Date(effectiveAt).toISOString()
    const result = await onSubmit(payload)
    setBusy(false)
    if (result.ok) {
      setAmount('')
      setBackdate(false)
      setEffectiveAt(toLocalInput())
      keyRef.current = newKey()
    } else {
      setMessage(result.message)
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-labelledby="alloc-title">
      <h2 id="alloc-title">New allocation</h2>

      <div className="segmented" role="group" aria-label="Allocation type">
        <button
          type="button"
          className={mode === 'add' ? 'seg is-on' : 'seg'}
          aria-pressed={mode === 'add'}
          onClick={() => {
            touch()
            setMode('add')
          }}
        >
          ＋ Add units
        </button>
        <button
          type="button"
          className={mode === 'use' ? 'seg is-on' : 'seg'}
          aria-pressed={mode === 'use'}
          onClick={() => {
            touch()
            setMode('use')
          }}
        >
          － Use units
        </button>
      </div>

      <label className="field" htmlFor="amount">
        Units
      </label>
      <div className="stepper">
        <button type="button" className="btn btn-outline step" onClick={() => step(-1)} aria-label="Decrease by 1">
          −
        </button>
        <input
          id="amount"
          className="input input-big"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmountValue(e.target.value)}
          disabled={busy}
        />
        <button type="button" className="btn btn-outline step" onClick={() => step(1)} aria-label="Increase by 1">
          ＋
        </button>
      </div>

      <div className="presets" role="group" aria-label="Quick amounts">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-chip${Number(amount) === p ? ' is-on' : ''}`}
            onClick={() => setAmountValue(p)}
            disabled={busy}
          >
            {p}
          </button>
        ))}
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={backdate}
          onChange={(e) => {
            touch()
            setBackdate(e.target.checked)
          }}
          disabled={busy}
        />
        <span>Entered late? Set an earlier date and time</span>
      </label>
      {backdate && (
        <input
          className="input"
          type="datetime-local"
          aria-label="Effective date and time"
          value={effectiveAt}
          max={toLocalInput()}
          onChange={(e) => {
            touch()
            setEffectiveAt(e.target.value)
          }}
          disabled={busy}
        />
      )}

      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        className={`btn btn-primary btn-block${mode === 'use' ? ' btn-use' : ''}`}
        disabled={busy || (!!problem && amount !== '')}
        aria-busy={busy}
      >
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Saving…
          </>
        ) : validNumber ? (
          `${mode === 'use' ? 'Use' : 'Add'} ${fmtUnits(n)} units`
        ) : (
          'Save allocation'
        )}
      </button>
    </form>
  )
}
