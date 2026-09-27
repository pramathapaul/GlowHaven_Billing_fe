import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { PageHead, Alert, Spinner, Empty, ConfirmDialog } from '../components/ui.jsx';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = (q = '') =>
    api
      .get(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then((d) => {
        setCustomers(d.customers);
        setError('');
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    const t = setTimeout(() => load(search.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function confirmDelete() {
    setBusy(true);
    try {
      const d = await api.del(`/api/customers/${toDelete.id}`);
      setFlash(d.message);
      setToDelete(null);
      await load(search.trim());
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Customers" subtitle="People you sell to — with their order and bill history">
        <Link className="btn btn-primary" to="/customers/new">
          + New customer
        </Link>
      </PageHead>

      <Alert kind="success">{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="input grow"
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!customers ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <Empty>
            No customers found. <Link to="/customers/new">Add one</Link>.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} className="cell-title">
                        {c.name}
                      </Link>
                      <div className="cell-sub">ID: {c.id.slice(-8)}</div>
                    </td>
                    <td>{c.phone}</td>
                    <td>{c.email || <span className="cell-sub">—</span>}</td>
                    <td>{c.address || <span className="cell-sub">—</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-sm" to={`/customers/${c.id}`}>
                        View
                      </Link>{' '}
                      <Link className="btn btn-sm" to={`/customers/${c.id}/edit`}>
                        Edit
                      </Link>{' '}
                      <button className="btn btn-sm btn-danger" onClick={() => setToDelete(c)}>
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
        title="Delete customer?"
        message={`"${toDelete?.name}" will be permanently removed. Customers with active orders or bills cannot be deleted.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={busy}
      />
    </>
  );
}
