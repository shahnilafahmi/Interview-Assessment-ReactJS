import { useCallback, useRef, useState } from 'react'
import Dashboard from './components/Dashboard'
import Notice from './components/Notice'
import SetupPanel from './components/SetupPanel'
import { useOperators } from './hooks/useOperators'

const STORAGE_KEY = 'ra.operatorId'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export default function App() {
  const { operators, loading, error, reload } = useOperators()
  const [view, setView] = useState('dashboard')
  const [chosenId, setChosenId] = useState(readStored)
  const [notice, setNotice] = useState(null)
  const timer = useRef(null)

  const notify = useCallback((type, message) => {
    clearTimeout(timer.current)
    setNotice({ type, message })
    if (type === 'success') timer.current = setTimeout(() => setNotice(null), 5000)
  }, [])

  // Derived: fall back to the first operator when nothing valid is stored.
  const activeId = operators.some((o) => String(o.id) === String(chosenId))
    ? String(chosenId)
    : operators[0]
      ? String(operators[0].id)
      : null

  const chooseOperator = (id) => {
    setChosenId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* storage unavailable (private mode) — selection just won't persist */
    }
  }

  const showSetup = view === 'setup' || (!loading && !error && operators.length === 0)

  return (
    <div className="app">
      <header className="topbar">
        <h1>Resource Allocation</h1>
        <div className="topbar-controls">
          {operators.length > 0 && (
            <>
              <label className="sr-only" htmlFor="operator">
                Operator
              </label>
              <select
                id="operator"
                className="input operator-select"
                value={activeId ?? ''}
                onChange={(e) => chooseOperator(e.target.value)}
              >
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setView(showSetup && operators.length > 0 ? 'dashboard' : 'setup')}
          >
            {showSetup && operators.length > 0 ? 'Dashboard' : 'Setup'}
          </button>
        </div>
      </header>

      <div className="notice-slot">
        <Notice notice={notice} onDismiss={() => setNotice(null)} />
      </div>

      <main className="content">
        {loading && (
          <p className="center big" aria-busy="true">
            <span className="spinner spinner-dark" aria-hidden="true" /> Loading…
          </p>
        )}

        {!loading && error && (
          <div className="card">
            <h2>Cannot reach the server</h2>
            <p>{error.message}</p>
            <p className="muted">Make sure the backend is running on http://localhost:3000.</p>
            <button type="button" className="btn btn-primary" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && showSetup && (
          <>
            {operators.length === 0 && (
              <p className="intro">
                Welcome. Create a tier, a status level and an operator to get started.
              </p>
            )}
            <SetupPanel operators={operators} onChanged={reload} notify={notify} />
          </>
        )}

        {!loading && !error && !showSetup && activeId && (
          <Dashboard
            key={activeId}
            operatorId={activeId}
            operators={operators}
            notify={notify}
          />
        )}
      </main>
    </div>
  )
}
