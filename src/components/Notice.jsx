export default function Notice({ notice, onDismiss }) {
  if (!notice) return null
  const isError = notice.type === 'error'
  return (
    <div
      className={`notice ${isError ? 'notice-error' : 'notice-success'}`}
      role={isError ? 'alert' : 'status'}
    >
      <span className="notice-icon" aria-hidden="true">
        {isError ? '⚠' : '✓'}
      </span>
      <span className="notice-text">
        <strong>{isError ? 'Error: ' : 'Done: '}</strong>
        {notice.message}
      </span>
      <button type="button" className="btn btn-ghost notice-close" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}
