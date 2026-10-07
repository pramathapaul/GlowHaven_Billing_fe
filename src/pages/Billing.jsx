import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatDay, billSource } from '../api.js';
import { PageHead, Alert, Spinner, Empty, StatusBadge } from '../components/ui.jsx';

export default function Billing() {
  const [orders, setOrders] = useState(null);
  const [bills, setBills] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/api/orders'), api.get('/api/bills')])
      .then(([o, b]) => {
        setOrders(o.orders.filter((x) => x.status === 'draft' || x.status === 'confirmed'));
        setBills(b.bills.slice(0, 10));
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHead title="Billing" subtitle="Bill an existing order (with stock restore on uncheck) or create a standalone bill" />

      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="billing-choice" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>
            <span className="badge badge-confirmed">A</span> Bill from an order
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Load an order's line items with checkboxes. Uncheck an item to exclude it from the bill — its quantity
            goes straight back into stock.
          </p>
          {!orders ? (
            <Spinner text="Loading orders…" />
          ) : orders.length === 0 ? (
            <Empty>
              No open orders. <Link to="/orders/new">Create an order</Link> first.
            </Empty>
          ) : (
            <div className="order-pick-list">
              {orders.map((o) => (
                <Link key={o.id} to={`/billing/order/${o.id}`} className="order-pick" style={{ color: 'inherit' }}>
                  <div>
                    <div className="cell-title">
                      #{o.id.slice(-8)} · {o.customer?.name || '—'}
                    </div>
                    <div className="cell-sub">
                      {o.items_count} item{o.items_count === 1 ? '' : 's'} · {formatDay(o.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cell-title">{formatMoney(o.total)}</div>
                    <StatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>
            <span className="badge badge-draft">B</span> Standalone bill
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Pick products and quantities directly — no order involved. Stock is validated and deducted in one
            transaction when the bill is created.
          </p>
          <Link className="btn btn-primary" to="/billing/new">
            Create standalone bill →
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>Recent bills</h2>
        {!bills ? (
          <Spinner />
        ) : bills.length === 0 ? (
          <Empty>No bills yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bill</th>
                  <th>Customer</th>
                  <th>Source</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDay(b.created_at)}</td>
                    <td>
                      <Link to={`/bills/${b.id}`}>#{b.id.slice(-8)}</Link>
                    </td>
                    <td>{b.customer?.name || '—'}</td>
                    <td>
                      {b.order_id ? (
                        <Link to={`/orders/${b.order_id}`}>order {billSource(b).text}</Link>
                      ) : (
                        <span className="badge badge-outline">
                          {b.site_order_id ? `site order ${billSource(b).text}` : `order ${billSource(b).text}`}
                        </span>
                      )}
                    </td>
                    <td className="num">{formatMoney(b.total)}</td>
                    <td>
                      <Link className="btn btn-sm" to={`/bills/${b.id}`}>
                        View
                      </Link>
                    </td>
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
