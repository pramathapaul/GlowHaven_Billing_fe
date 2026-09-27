import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { PageHead, Alert, Spinner } from '../components/ui.jsx';

export default function OrderCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/api/customers')
      .then((d) => {
        setCustomers(d.customers);
        if (d.customers.length === 1) setCustomerId(d.customers[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) {
      setError('Select a customer for this order.');
      return;
    }
    setSaving(true);
    try {
      const d = await api.post('/api/orders', { customerId });
      navigate(`/orders/${d.order.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!customers) return <Spinner />;

  return (
    <>
      <PageHead title="New order" subtitle="Pick a customer first, then add products — stock is deducted as you add lines">
        <Link className="btn" to="/orders">
          Cancel
        </Link>
      </PageHead>

      <div className="card" style={{ maxWidth: 560 }}>
        <Alert onClose={() => setError('')}>{error}</Alert>
        {customers.length === 0 ? (
          <div className="empty">
            You need a customer first. <Link to="/customers/new">Create a customer</Link>.
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="customer">Customer *</label>
              <select
                id="customer"
                className="select"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">— select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Creating…' : 'Create draft order'}
              </button>
              <Link className="btn" to="/orders">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
