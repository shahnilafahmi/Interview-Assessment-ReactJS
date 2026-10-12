// Thin wrapper over the Resource Allocation REST API.
// In dev, Vite proxies /api -> http://localhost:3000. Override with VITE_API_BASE.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function messageFrom(body, status) {
  if (body && typeof body === 'object') {
    const msg =
      body.error?.message ??
      (typeof body.error === 'string' ? body.error : null) ??
      body.message
    const details = body.details ?? body.errors ?? body.error?.details
    let extra = ''
    if (Array.isArray(details)) {
      extra = details
        .map((d) => (typeof d === 'string' ? d : d.message))
        .filter(Boolean)
        .join('; ')
    } else if (details && typeof details === 'object') {
      // Zod-style: { formErrors: [], fieldErrors: { field: ['msg'] } }
      const fields = Object.entries(details.fieldErrors ?? {}).map(
        ([field, errs]) => `${field}: ${[].concat(errs).join(', ')}`,
      )
      extra = [...(details.formErrors ?? []), ...fields].join('; ')
    }
    if (msg && extra) return `${msg} — ${extra}`
    if (msg) return msg
  }
  const byStatus = {
    400: 'Please check the values you entered.',
    404: 'Not found.',
    409: 'That change conflicts with the current data.',
  }
  return byStatus[status] ?? `Request failed (${status}).`
}

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }

  let res
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot reach the server. Check your connection.', 0, null)
  }

  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status, data)
  return data
}

// List endpoints may return a bare array or an envelope; normalise to an array.
export function toArray(r) {
  if (Array.isArray(r)) return r
  if (r && typeof r === 'object') {
    return r.items ?? r.data ?? r.rows ?? r.results ?? r.timeline ?? []
  }
  return []
}

export const errorText = (err) => (err instanceof Error ? err.message : String(err))

// ---- Endpoints ---------------------------------------------------------
export const health = (signal) => api('/health', { signal })

export const listTiers = (query, signal) => api('/operator-tiers', { query, signal }).then(toArray)
export const createTier = (body) => api('/operator-tiers', { method: 'POST', body })

export const listOperators = (query, signal) => api('/operators', { query, signal }).then(toArray)
export const createOperator = (body) => api('/operators', { method: 'POST', body })

export const listStatusLevels = (signal) => api('/status-levels', { signal }).then(toArray)
export const createStatusLevel = (body) => api('/status-levels', { method: 'POST', body })

export const getDashboard = (operatorId, signal) => api(`/dashboard/${operatorId}`, { signal })
export const getTimeline = (operatorId, query, signal) =>
  api(`/dashboard/${operatorId}/timeline`, { query, signal }).then(toArray)
export const streamUrl = (operatorId) => `${API_BASE}/dashboard/${operatorId}/stream`

export const createAllocation = (body) => api('/resource-allocations', { method: 'POST', body })
export const voidAllocation = (id, actorId) =>
  api(`/resource-allocations/${id}/void`, { method: 'POST', body: actorId ? { actorId } : undefined })

export const createAdjustment = (body) => api('/supervisor-adjustments', { method: 'POST', body })

export const listActivityLogs = (query, signal) =>
  api('/activity-logs', { query, signal }).then(toArray)
