import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatMoney, formatDay, billSource } from '../api.js';
import { PageHead, Alert, Spinner, StatusBadge, Empty, ConfirmDialog } from '../components/ui.jsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get(`/api/customers/${id}`)
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doDelete() {
    setBusy(true);
    try {
      await api.del(`/api/customers/${id}`);
      navigate('/customers');
    } catch (e) {
      setError(e.message);
      setConfirm(false);
      setBusy(false);
    }
  }

  if (error && !data) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!data) return <Spinner />;

  const { customer, orders, bills } = data;
  const totalBilled = bills.reduce((sum, b) => sum + b.total, 0);

  return (
    <>
      <PageHead title={customer.name} subtitle={customer.phone}>
        <Link className="btn" to="/customers">
          ← Back
        </Link>
        <Link className="btn" to={`/customers/${id}/edit`}>
          Edit
        </Link>
        <button className="btn btn-danger" onClick={() => setConfirm(true)}>
          Delete
        </button>
      </PageHead>

      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-label">Orders</div>
          <div className="stat-value">{orders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bills</div>
          <div className="stat-value">{bills.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total billed</div>
          <div className="stat-value">{formatMoney(totalBilled)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Email</div>
          <div className="stat-value" style={{ fontSize: 15 }}>{customer.email || '—'}</div>
        </div>
      </div>

      <div className="card">
        <h2>Contact</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">Phone</div>
            <div className="value">{customer.phone}</div>
          </div>
          <div className="detail-item">
            <div className="label">Email</div>
            <div className="value" style={{ fontSize: 15 }}>{customer.email || '—'}</div>
          </div>
          <div className="detail-item" style={{ gridColumn: 'span 2' }}>
            <div className="label">Address</div>
            <div className="value" style={{ fontSize: 15 }}>{customer.address || '—'}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Order history</h2>
        {orders.length === 0 ? (
          <Empty>
            No orders yet. <Link to="/orders/new">Create one</Link>.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
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
                      <Link to={`/orders/${o.id}`}>#{o.id.slice(-8)}</Link>
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

      <div className="card">
        <h2>Bill history</h2>
        {bills.length === 0 ? (
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
                  <th>Source</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDay(b.created_at)}</td>
                    <td>
                      <Link to={`/bills/${b.id}`}>#{b.id.slice(-8)}</Link>
                    </td>
                    <td>
                      {b.order_id ? (
                        <Link to={`/orders/${b.order_id}`}>order {billSource(b).text}</Link>
                      ) : (
                        <span className="badge badge-outline">
                          {b.site_order_id ? `site order ${billSource(b).text}` : `order ${billSource(b).text}`}
                        </span>
                      )}
                    </td>
                    <td className="num">{b.items_count}</td>
                    <td className="num">{formatMoney(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Delete customer?"
        message={`"${customer.name}" can only be deleted when they have no active orders or bills. Cancelled orders are fine.`}
        onConfirm={doDelete}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </>
  );
}
