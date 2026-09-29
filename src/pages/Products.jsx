import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { PageHead, Alert, Spinner, Empty, ConfirmDialog } from '../components/ui.jsx';

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/api/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      if (lowStock) params.set('lowStock', 'true');
      if (includeDeleted) params.set('includeDeleted', 'true');
      api
        .get(`/api/products?${params.toString()}`)
        .then((d) => {
          setProducts(d.products);
          setError('');
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [search, category, lowStock, includeDeleted]);

  async function confirmDelete() {
    setBusy(true);
    try {
      const d = await api.del(`/api/products/${toDelete.id}`);
      setFlash(d.message);
      setToDelete(null);
      const params = new URLSearchParams();
      if (includeDeleted) params.set('includeDeleted', 'true');
      const list = await api.get(`/api/products?${params.toString()}`);
      setProducts(list.products);
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  }

  async function restore(product) {
    try {
      const d = await api.post(`/api/products/${product.id}/restore`);
      setFlash(d.message);
      const list = await api.get(`/api/products?${includeDeleted ? 'includeDeleted=true' : ''}`);
      setProducts(list.products);
    } catch (e) {
      setError(e.message);
    }
  }

  const hasFilters = search || category || lowStock || includeDeleted;

  return (
    <>
      <PageHead title="Products" subtitle="Search, stock levels, pricing and margin">
        <Link className="btn btn-primary" to="/products/new">
          + New product
        </Link>
      </PageHead>

      <Alert kind="success">{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="input grow"
            placeholder="Search by name, SKU or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="checkbox-label">
            <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
            Low stock only
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
            Show deleted
          </label>
          {hasFilters ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearch('');
                setCategory('');
                setLowStock(false);
                setIncludeDeleted(false);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {!products ? (
          <Spinner />
        ) : products.length === 0 ? (
          <Empty>No products match your filters.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th className="num">Qty</th>
                    <th className="num">MRP</th>
                    <th className="num">Selling price</th>
                    <th className="num">Cost</th>
                  <th className="num">Margin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.is_deleted ? 'row-excluded' : ''}>
                    <td>
                      <Link to={`/products/${p.id}`} className="cell-title">
                        {p.name}
                      </Link>
                      <div className="cell-sub">
                        per {p.unit}
                        {p.tracks_colors ? (
                          <span className="badge badge-outline" style={{ marginLeft: 6 }}>
                            {p.colors.map((c) => `${c.color} ${c.quantity}`).join(' · ')}
                          </span>
                        ) : null}
                        {p.is_deleted ? <span className="badge badge-danger" style={{ marginLeft: 6 }}>deleted</span> : null}
                      </div>
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.category}</td>
                    <td className="num">
                      <span className={`badge ${p.quantity <= 0 ? 'badge-danger' : p.low_stock ? 'badge-warn' : 'badge-ok'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="num">{formatMoney(p.mrp)}</td>
                    <td className="num">{formatMoney(p.selling_price ?? p.mrp)}</td>
                    <td className="num">{formatMoney(p.cost_price)}</td>
                    <td className="num">
                      {formatMoney(p.margin)}
                      <div className="cell-sub">{p.margin_percent ?? '—'}%</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-sm" to={`/products/${p.id}`}>
                        View
                      </Link>{' '}
                      {p.is_deleted ? (
                        <button className="btn btn-sm" onClick={() => restore(p)}>
                          Restore
                        </button>
                      ) : (
                        <>
                          <Link className="btn btn-sm" to={`/products/${p.id}/edit`}>
                            Edit
                          </Link>{' '}
                          <button className="btn btn-sm btn-danger" onClick={() => setToDelete(p)}>
                            Delete
                          </button>
                        </>
                      )}
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
        title="Delete product?"
        message={`"${toDelete?.name}" will be hidden from lists and pickers (soft delete). Existing orders and bills keep their references. Its SKU stays reserved.`}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        busy={busy}
      />
    </>
  );
}
