import { useEffect, useState } from 'react';

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head no-print">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </div>
  );
}

export function Alert({ kind = 'error', children, onClose }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [children]);

  if (!children || dismissed) return null;
  if (kind !== 'error') return <div className={`alert alert-${kind}`}>{children}</div>;

  const close = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="alert-modal" role="alert" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="alert-close" aria-label="Close" onClick={close}>
          ×
        </button>
        <div className={`alert alert-${kind}`}>{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function Spinner({ text = 'Loading…' }) {
  return <div className="loading">{text}</div>;
}

export function Empty({ children = 'Nothing here yet.' }) {
  return <div className="empty">{children}</div>;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
