import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatMoney, formatDate } from '../api.js';
import { PageHead, Alert, Spinner, ConfirmDialog } from '../components/ui.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get(`/api/products/${id}`)
      .then((d) => setProduct(d.product))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doDelete() {
    setBusy(true);
    try {
      const d = await api.del(`/api/products/${id}`);
      navigate('/products', { state: { flash: d.message } });
    } catch (e) {
      setError(e.message);
      setConfirm(false);
      setBusy(false);
    }
  }

  if (error && !product) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!product) return <Spinner />;

  const stockValue = product.quantity * product.cost_price;
  const retailValue = product.quantity * product.mrp;

  return (
    <>
      <PageHead title={product.name} subtitle={`${product.sku} · ${product.category}`}>
        <Link className="btn" to="/products">
          ← Back
        </Link>
        {product.is_deleted ? (
          <button
            className="btn btn-primary"
            onClick={() =>
              api
                .post(`/api/products/${id}/restore`)
                .then(load)
                .catch((e) => setError(e.message))
            }
          >
            Restore
          </button>
        ) : (
          <>
            <Link className="btn" to={`/products/${id}/edit`}>
              Edit
            </Link>
            <button className="btn btn-danger" onClick={() => setConfirm(true)}>
              Delete
            </button>
          </>
        )}
      </PageHead>

      <Alert onClose={() => setError('')}>{error}</Alert>
      {product.is_deleted ? <Alert kind="info">This product is soft-deleted and hidden from pickers.</Alert> : null}

      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-label">Quantity</div>
          <div className="stat-value">
            {product.quantity} <span style={{ fontSize: 14, fontWeight: 500 }}>{product.unit}</span>
          </div>
          <div className="stat-sub">
            {product.quantity <= 0 ? (
              <span className="badge badge-danger">out of stock</span>
            ) : product.low_stock ? (
              <span className="badge badge-warn">low stock</span>
            ) : (
              <span className="badge badge-ok">in stock</span>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">MRP</div>
          <div className="stat-value">{formatMoney(product.mrp)}</div>
          <div className="stat-sub">printed price</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Selling price</div>
          <div className="stat-value">{formatMoney(product.selling_price ?? product.mrp)}</div>
          <div className="stat-sub">what customer pays</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cost price</div>
          <div className="stat-value">{formatMoney(product.cost_price)}</div>
          <div className="stat-sub">per {product.unit}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Margin</div>
          <div className="stat-value">{formatMoney(product.margin)}</div>
          <div className="stat-sub">
            {product.margin_percent ?? '—'}% on cost
            {product.margin < 0 ? <span className="badge badge-danger" style={{ marginLeft: 6 }}>negative</span> : null}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>
          Stock by color
          {product.tracks_colors ? (
            <span className="badge badge-outline" style={{ marginLeft: 8 }}>
              total {product.quantity} {product.unit}
            </span>
          ) : null}
        </h2>
        {product.tracks_colors ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Color</th>
                  <th className="num">Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {product.colors.map((c) => (
                  <tr key={c.color}>
                    <td className="cell-title">{c.color}</td>
                    <td className="num">
                      {c.quantity} {product.unit}
                    </td>
                    <td>
                      {c.quantity <= 0 ? (
                        <span className="badge badge-danger">out of stock</span>
                      ) : c.quantity <= 5 ? (
                        <span className="badge badge-warn">low</span>
                      ) : (
                        <span className="badge badge-ok">available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cell-sub">This product is not tracked by color — single stock bucket.</div>
        )}
      </div>

      <div className="card">
        <h2>Details</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">MRP (printed)</div>
            <div className="value">{formatMoney(product.mrp)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Selling price</div>
            <div className="value">{formatMoney(product.selling_price ?? product.mrp)}</div>
          </div>
          <div className="detail-item">
            <div className="label">SKU</div>
            <div className="value">{product.sku}</div>
          </div>
          <div className="detail-item">
            <div className="label">Category</div>
            <div className="value">{product.category}</div>
          </div>
          <div className="detail-item">
            <div className="label">Stock value (cost)</div>
            <div className="value">{formatMoney(stockValue)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Stock value (retail)</div>
            <div className="value">{formatMoney(retailValue)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Created</div>
            <div className="value" style={{ fontSize: 14 }}>{formatDate(product.created_at)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Updated</div>
            <div className="value" style={{ fontSize: 14 }}>{formatDate(product.updated_at)}</div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Delete product?"
        message={`"${product.name}" will be soft-deleted (hidden from lists and pickers). Existing orders and bills are unaffected.`}
        onConfirm={doDelete}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </>
  );
}
