import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatDay } from '../api.js';
import { PageHead, Alert, Spinner, Empty, ConfirmDialog } from '../components/ui.jsx';

export default function Bills() {
  const [bills, setBills] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/api/bills')
      .then((d) => setBills(d.bills))
      .catch((e) => setError(e.message));
  }, []);

  async function confirmDelete() {
    setBusy(true);
    try {
      const d = await api.del(`/api/bills/${toDelete.id}`);
      setFlash(d.message);
      setBills((prev) => (prev ? prev.filter((b) => b.id !== toDelete.id) : prev));
    } catch (e) {
      setError(e.message);
    } finally {
      setToDelete(null);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Bills" subtitle="Every bill is printable and exportable">
        <Link className="btn btn-primary" to="/billing">
          + New bill
        </Link>
      </PageHead>

      <Alert kind="success">{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="card">
        {!bills ? (
          <Spinner />
        ) : bills.length === 0 ? (
          <Empty>
            No bills yet. <Link to="/billing">Create one</Link>.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill</th>
                  <th>Customer</th>
                  <th>Source</th>
                  <th className="num">Subtotal</th>
                  <th className="num">Delivery</th>
                  <th className="num">Discount</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDay(b.created_at)}</td>
                    <td>
                      <Link to={`/bills/${b.id}`} className="cell-title">
                        #{b.id.slice(-8)}
                      </Link>
                    </td>
                    <td>{b.customer?.name || '—'}</td>
                    <td>
                      {b.order_id ? (
                        <Link to={`/orders/${b.order_id}`}>order #{b.order_id.slice(-8)}</Link>
                      ) : (
                        <span className="badge badge-outline">standalone</span>
                      )}
                    </td>
                    <td className="num">{formatMoney(b.subtotal)}</td>
                    <td className="num">{formatMoney(b.delivery_charge || 0)}</td>
                    <td className="num">{formatMoney(b.discount)}</td>
                    <td className="num">
                      <strong>{formatMoney(b.total)}</strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-sm" to={`/bills/${b.id}`}>
                        View
                      </Link>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => setToDelete(b)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete bill?"
        message={
          toDelete?.order_id
            ? `Bill #${toDelete.id.slice(-8)} will be permanently deleted. Its order goes back to "confirmed" so it can be re-billed. Stock is not affected.`
            : `Bill #${toDelete?.id.slice(-8)} will be permanently deleted and the stock it used will be returned to inventory.`
        }
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={busy}
      />
    </>
  );
}
