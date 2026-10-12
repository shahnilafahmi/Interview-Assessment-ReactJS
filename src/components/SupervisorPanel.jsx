import { useState } from 'react'
import { fmtDate, fmtSigned, toLocalInput } from '../lib/format'

// Retroactive correction of an existing allocation. The server rewrites the
// ledger at `effectiveAt` and recalculates every downstream balance/status.
export default function SupervisorPanel({ operatorId, operators, timelineRows, onSubmit }) {
  const allocations = timelineRows.filter((r) => r.allocationType === 'NORMAL')
  const supervisors = operators.filter((o) => String(o.id) !== String(operatorId))

  const [allocationId, setAllocationId] = useState('')
  const [supervisorId, setSupervisorId] = useState('')
  const [delta, setDelta] = useState('')
  const [effectiveAt, setEffectiveAt] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const chosen = allocations.find((a) => String(a.allocationId) === String(allocationId))

  const pickAllocation = (id) => {
    setAllocationId(id)
    const a = allocations.find((x) => String(x.allocationId) === String(id))
    if (a) setEffectiveAt(toLocalInput(new Date(a.effectiveAt)))
  }

  const n = Number(delta)
  const problem = !allocationId
    ? 'Choose the allocation to correct.'
    : !supervisorId
      ? 'Choose the supervisor.'
      : delta === '' || !Number.isFinite(n) || n === 0
        ? 'Enter a correction other than 0 (use − to reduce).'
        : !effectiveAt
          ? 'Choose the effective date.'
          : !reason.trim()
            ? 'Give a short reason.'
            : null

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (problem) {
      setMessage(problem)
      return
    }
    setBusy(true)
    setMessage(null)
    const result = await onSubmit({
      operatorId,
      allocationId,
      supervisorId,
      adjustmentDelta: n.toFixed(2),
      effectiveAt: new Date(effectiveAt).toISOString(),
      reason: reason.trim(),
    })
    setBusy(false)
    if (result.ok) {
      setAllocationId('')
      setDelta('')
      setEffectiveAt('')
      setReason('')
    } else {
      setMessage(result.message)
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>Supervisor correction</h2>
      <p className="muted">
        Corrects a past allocation. Totals and status for later entries are recalculated
        automatically.
      </p>

      <label className="field" htmlFor="adj-alloc">
        Allocation to correct
      </label>
      <select
        id="adj-alloc"
        className="input"
        value={allocationId}
        onChange={(e) => pickAllocation(e.target.value)}
        disabled={busy}
      >
        <option value="">Select…</option>
        {allocations.map((a) => (
          <option key={a.allocationId} value={a.allocationId}>
            {fmtSigned(a.unitsDelta)} · {fmtDate(a.effectiveAt)}
          </option>
        ))}
      </select>
      {allocations.length === 0 && <p className="muted small">No allocations to correct yet.</p>}

      <label className="field" htmlFor="adj-sup">
        Supervisor
      </label>
      <select
        id="adj-sup"
        className="input"
        value={supervisorId}
        onChange={(e) => setSupervisorId(e.target.value)}
        disabled={busy}
      >
        <option value="">Select…</option>
        {supervisors.map((o) => (
          <option key={o.id} value={o.id}>
            {o.fullName}
          </option>
        ))}
      </select>

      <label className="field" htmlFor="adj-delta">
        Correction (units, signed)
      </label>
      <input
        id="adj-delta"
        className="input input-big"
        type="number"
        inputMode="decimal"
        step="0.01"
        placeholder="e.g. -5.00"
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        disabled={busy}
      />
      {chosen && (
        <p className="muted small">
          Original entry {fmtSigned(chosen.unitsDelta)} on {fmtDate(chosen.effectiveAt)}
        </p>
      )}

      <label className="field" htmlFor="adj-when">
        Effective at
      </label>
      <input
        id="adj-when"
        className="input"
        type="datetime-local"
        value={effectiveAt}
        onChange={(e) => setEffectiveAt(e.target.value)}
        disabled={busy}
      />

      <label className="field" htmlFor="adj-reason">
        Reason
      </label>
      <textarea
        id="adj-reason"
        className="input"
        rows={3}
        maxLength={2000}
        placeholder="e.g. Entered twice by mistake"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={busy}
      />

      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Recalculating…
          </>
        ) : (
          'Apply correction'
        )}
      </button>
    </form>
  )
}
