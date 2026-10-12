export function fmtUnits(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtSigned(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtUnits(Math.abs(n))}`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString()
}

// "in 3 days", "in 2 hours", "in 12 minutes", "expired"
export function timeUntil(iso, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return 'expired'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${Math.max(mins, 1)} min`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `in ${hours} h`
  return `in ${Math.round(hours / 24)} days`
}

// Date -> value for <input type="datetime-local"> (local time)
export function toLocalInput(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 16)
}

export function humanize(code) {
  if (!code) return ''
  const s = String(code).toLowerCase().replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const ACTION_LABELS = {
  ALLOCATION_CREATED: 'Allocation added',
  ALLOCATION_VOIDED: 'Allocation voided',
  ADJUSTMENT_APPLIED: 'Supervisor correction',
  ALLOCATION_EXPIRED: 'Units expired',
  EXPIRATION: 'Units expired',
  NOTE: 'Note',
}

export const TYPE_LABELS = {
  NORMAL: 'Allocation',
  EXPIRATION: 'Expired',
  SUPERVISOR_ADJUSTMENT: 'Supervisor correction',
  ADJUSTMENT: 'Supervisor correction',
}

export function newKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // RFC4122 v4 fallback for non-secure contexts (e.g. http://<lan-ip> on a phone)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
