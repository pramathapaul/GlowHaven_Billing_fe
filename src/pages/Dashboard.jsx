import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney, formatDay } from '../api.js';
import { PageHead, StatusBadge, Spinner, Empty, Alert } from '../components/ui.jsx';

function Stat({ label, value, sub, alert }) {
  return (
    <div className={`stat-card${alert ? ' alert' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/dashboard/stats')
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!data) return <Spinner />;

  const { stats, recentOrders, recentBills } = data;

  return (
    <>
      <PageHead title="Dashboard" subtitle="Stock, orders and billing at a glance" />
      <div className="cards-grid">
        <Stat label="Products" value={stats.products} sub={`stock value ${formatMoney(stats.stockValue)}`} />
        <Stat label="Low stock" value={stats.lowStock} sub={`≤ ${stats.lowStockThreshold} units`} alert={stats.lowStock > 0} />
        <Stat label="Customers" value={stats.customers} />
        <Stat label="Open orders" value={stats.openOrders} sub={`${stats.orders.draft} draft · ${stats.orders.confirmed} confirmed`} />
        <Stat label="Bills" value={stats.bills} />
        <Stat label="Revenue" value={formatMoney(stats.revenue)} sub="sum of all bills" />
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Recent orders</h2>
          {recentOrders.length === 0 ? (
            <Empty>
              No orders yet. <Link to="/orders/new">Create one</Link>.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link to={`/orders/${o.id}`}>{formatDay(o.created_at)}</Link>
                      </td>
                      <td>
                        <Link to={`/orders/${o.id}`}>{o.customer_name}</Link>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Recent bills</h2>
          {recentBills.length === 0 ? (
            <Empty>
              No bills yet. <Link to="/billing">Create one</Link>.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link to={`/bills/${b.id}`}>{formatDay(b.created_at)}</Link>
                      </td>
                      <td>{b.customer_name}</td>
                      <td className="num">{formatMoney(b.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
