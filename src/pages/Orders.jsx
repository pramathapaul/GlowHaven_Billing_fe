import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatDay } from '../api.js';
import { PageHead, Alert, Spinner, Empty, StatusBadge } from '../components/ui.jsx';

const FILTERS = ['', 'draft', 'confirmed', 'billed', 'cancelled'];

export default function Orders() {
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = status ? `?status=${status}` : '';
    api
      .get(`/api/orders${qs}`)
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, [status]);

  return (
    <>
      <PageHead title="Orders" subtitle="Draft → confirmed → billed / cancelled, with live stock deduction">
        <Link className="btn btn-primary" to="/orders/new">
          + New order
        </Link>
      </PageHead>

      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <div className="chip-row">
            {FILTERS.map((f) => (
              <button
                key={f || 'all'}
                className={`chip${status === f ? ' active' : ''}`}
                onClick={() => setStatus(f)}
              >
                {f || 'all'}
              </button>
            ))}
          </div>
        </div>

        {!orders ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <Empty>
            No orders{status ? ` with status "${status}"` : ''}. <Link to="/orders/new">Create one</Link>.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{formatDay(o.created_at)}</td>
                    <td>
                      <Link to={`/orders/${o.id}`} className="cell-title">
                        #{o.id.slice(-8)}
                      </Link>
                    </td>
                    <td>
                      {o.customer ? (
                        <Link to={`/customers/${o.customer.id}`}>{o.customer.name}</Link>
                      ) : (
                        <span className="cell-sub">—</span>
                      )}
                      {o.customer?.phone ? <div className="cell-sub">{o.customer.phone}</div> : null}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="num">{o.items_count}</td>
                    <td className="num">{formatMoney(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
