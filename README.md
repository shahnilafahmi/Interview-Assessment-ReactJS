# Resource Allocation – Operator Dashboard (React)

Responsive web module for field operators to log resource allocations, watch their live
running balance and status level, and review an activity log. Built for phones used in
bright sunlight (large targets, high contrast, minimal typing) and works on tablet/desktop.

The UI is a client of the Resource Allocation REST API. **The server is authoritative:** the
UI never computes balances or status itself, it only displays what the API / live stream returns.

## Run it

Prerequisites: Node 20+, and the backend API running on `http://localhost:3000`.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run lint
```

In development Vite proxies `/api` to `http://localhost:3000` (see `vite.config.js`), so there
are no CORS issues. For a production build, set `VITE_API_BASE` (e.g. `https://host/api`) or serve
the app and API from the same origin.

## What it does

| Feature | Where | API |
|---|---|---|
| Live running balance, status level, next expiry | `BalanceCard`, `useDashboard` | `GET /dashboard/:id`, SSE `/dashboard/:id/stream` |
| Submit allocations (add / use units, optional backdate) | `AllocationForm` | `POST /resource-allocations` |
| History with running totals; void an allocation | `Timeline` | `GET /dashboard/:id/timeline`, `POST /resource-allocations/:id/void` |
| Activity log (incl. automatic expirations) | `ActivityLog` | `GET /activity-logs` |
| Supervisor retroactive correction | `SupervisorPanel` | `POST /supervisor-adjustments` |
| First-run setup (tiers, status levels, operators) | `SetupPanel` | `/operator-tiers`, `/status-levels`, `/operators` |

## Design decisions

- **Never show wrong totals.** Balance comes only from the server. Live `balance` events carry a
  `version`; older/out-of-order events are ignored. After any change the history and activity
  lists re-query, so a retroactive correction immediately reflows later rows and statuses.
- **Feels instant.** Submitting shows a "Saving…" row immediately and dims the total until the
  server confirms; the total itself is not guessed.
- **Safe retries.** Each form attempt carries an idempotency key. Double taps or a retry after a
  flaky connection return the original entry instead of creating a duplicate; editing the form
  generates a new key.
- **Errors are explicit.** Server messages (insufficient units, validation, conflicts, network
  loss) appear in a sticky banner and inline at the form; load failures offer "Try again".
- **Sunlight / warehouse use.** Black-on-white 3px borders, 56px touch targets, 18px base text,
  number pad via `inputMode="decimal"`, preset amounts, status shown with text and icon (not
  colour alone), and reduced-motion friendly spinners.

## Structure

```
src/
  api/client.js          fetch wrapper, ApiError, one function per endpoint
  hooks/                 useDashboard (snapshot + SSE), usePagedList, useOperators
  components/            Dashboard (container) + presentational components
  lib/format.js          number/date formatting, idempotency key
  App.jsx                operator selection, Dashboard/Setup views, global notices
```

Plain React 19 + Vite, no state or UI library.

## Known limitations

- No authentication: the selected operator is used as `createdBy`/`actorId`, and supervisors are
  chosen from the other operators (matches the current backend).
- Live updates use `EventSource`; if the stream drops, the UI shows "Reconnecting" and recovers
  automatically.
- Operator tiers and operators cannot be deleted (backend limitation); deactivate instead.
