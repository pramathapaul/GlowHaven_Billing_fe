import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatMoney, formatDate } from '../api.js';
import { PageHead, Alert, Spinner, StatusBadge, ConfirmDialog } from '../components/ui.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [productId, setProductId] = useState('');
  const [color, setColor] = useState('');
  const [pack, setPack] = useState('');
  const [qty, setQty] = useState('1');
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingCancel, setPendingCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, p] = await Promise.all([
        api.get(`/api/orders/${id}`),
        api.get('/api/products'),
      ]);
      setOrder(o.order);
      setProducts(p.products);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const editable = order && (order.status === 'draft' || order.status === 'confirmed');

  const selectedProduct = products.find((p) => p.id === productId) || null;
  const colorOptions = selectedProduct?.colors || [];
  const packOptions = selectedProduct?.packs || [];

  function onProductChange(value) {
    setProductId(value);
    setColor('');
    setPack('');
  }

  function colorStockLabel(c) {
    return `${c.color} — ${c.quantity > 0 ? `${c.quantity} in stock` : 'out of stock'}`;
  }

  function packStockLabel(p) {
    return `${p.label} — MRP ${formatMoney(p.mrp ?? p.price)} · ${formatMoney(p.price)} · ${p.quantity > 0 ? `${p.quantity} in stock` : 'out of stock'}`;
  }

  // MRP for a line: the selected pack's own MRP, else the product MRP.
  function lineMrp(i) {
    const pack =
      i.pack && i.product?.packs
        ? i.product.packs.find((p) => p.label.toLowerCase() === i.pack.toLowerCase())
        : null;
    const mrp = pack ? (pack.mrp ?? pack.price) : i.product?.mrp;
    return mrp != null ? formatMoney(mrp) : null;
  }

  async function addItem(e) {
    e.preventDefault();
    setError('');
    setFlash('');
    if (!productId) return setError('Select a product to add.');
    if (selectedProduct?.tracks_colors && !color) return setError(`"${selectedProduct.name}" tracks stock by color — choose a color.`);
    // No pack chosen = the big/original size, which is always allowed.
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity < 1) return setError('Quantity must be a whole number ≥ 1.');
    setBusy(true);
    try {
      const d = await api.post(`/api/orders/${id}/items`, {
        productId,
        quantity,
        color: color || null,
        pack: pack || null,
      });
      setFlash(d.message);
      setQty('1');
      setColor('');
      setPack('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    setBusy(true);
    setError('');
    try {
      const d = await api.del(`/api/orders/${id}/items/${pendingRemove.id}`);
      setFlash(d.message);
      setPendingRemove(null);
      await load();
    } catch (err) {
      setError(err.message);
      setPendingRemove(null);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status) {
    setBusy(true);
    setError('');
    setFlash('');
    try {
      await api.patch(`/api/orders/${id}/status`, { status });
      setFlash(status === 'confirmed' ? 'Order confirmed.' : 'Order cancelled — stock restored.');
      setPendingCancel(false);
      await load();
    } catch (err) {
      setError(err.message);
      setPendingCancel(false);
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!order) return <Spinner />;

  const activeItems = order.items.filter((i) => !i.excluded_from_bill);
  const excludedItems = order.items.filter((i) => i.excluded_from_bill);

  return (
    <>
      <PageHead
        title={`Order #${order.id.slice(-8)}`}
        subtitle={`${order.customer ? order.customer.name : 'Unknown customer'} · created ${formatDate(order.created_at)}`}
      >
        <Link className="btn" to="/orders">
          ← Back
        </Link>
        {order.status === 'draft' ? (
          <button className="btn btn-primary" onClick={() => changeStatus('confirmed')} disabled={busy}>
            Confirm order
          </button>
        ) : null}
        {editable ? (
          <button className="btn btn-danger" onClick={() => setPendingCancel(true)} disabled={busy}>
            Cancel order
          </button>
        ) : null}
        {editable && activeItems.length > 0 ? (
          <button className="btn btn-primary" onClick={() => navigate(`/billing/order/${id}`)}>
            Create bill →
          </button>
        ) : null}
      </PageHead>

      <Alert kind="success">{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            <StatusBadge status={order.status} />
          </div>
          <div className="stat-sub">
            {order.status === 'billed'
              ? 'Billing is locked.'
              : order.status === 'cancelled'
                ? 'All stock was restored.'
                : 'Stock for these lines is deducted.'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Items</div>
          <div className="stat-value">{activeItems.length}</div>
          {excludedItems.length ? <div className="stat-sub">{excludedItems.length} excluded from bill</div> : null}
        </div>
        <div className="stat-card">
          <div className="stat-label">Order total</div>
          <div className="stat-value">{formatMoney(order.total)}</div>
          <div className="stat-sub">sum of line items at ordered price</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Customer</div>
          <div className="stat-value" style={{ fontSize: 16 }}>
            {order.customer ? (
              <Link to={`/customers/${order.customer.id}`}>{order.customer.name}</Link>
            ) : (
              '—'
            )}
          </div>
          <div className="stat-sub">{order.customer?.phone}</div>
        </div>
      </div>

      <div className="card">
        <h2>Line items</h2>
        {order.items.length === 0 ? (
          <div className="empty">No items yet — add products below. Stock is deducted the moment you add a line.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">MRP</th>
                  <th className="num">Price at order</th>
                  <th className="num">Line total</th>
                  <th className="num">Stock now</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} className={i.excluded_from_bill ? 'row-excluded' : ''}>
                    <td>
                      <div className="cell-title">
                        {i.product ? i.product.name : 'Product'}
                        {i.color ? <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{i.color}</span> : null}
                        {i.pack ? <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{i.pack}</span> : null}
                        {i.excluded_from_bill ? (
                          <span className="badge badge-neutral" style={{ marginLeft: 6 }}>
                            excluded from bill
                          </span>
                        ) : null}
                      </div>
                      <div className="cell-sub">{i.product ? `${i.product.sku} · per ${i.product.unit}` : ''}</div>
                    </td>
                    <td className="num">{i.quantity}</td>
                    <td className="num">{lineMrp(i) ?? '—'}</td>
                    <td className="num">{formatMoney(i.price_at_order)}</td>
                    <td className="num">{formatMoney(i.quantity * i.price_at_order)}</td>
                    <td className="num">
                      {i.product
                        ? i.pack
                          ? `${i.product.packs?.find((p) => p.label.toLowerCase() === i.pack.toLowerCase())?.quantity ?? 0} (${i.pack}) / ${i.product.quantity} total`
                          : i.color
                            ? `${i.product.colors?.find((c) => c.color.toLowerCase() === i.color.toLowerCase())?.quantity ?? 0} (${i.color}) / ${i.product.quantity} total`
                            : i.product.packs?.length
                              ? `${i.product.base_quantity ?? 0} (big size) / ${i.product.quantity} total`
                              : i.product.quantity
                        : '—'}
                    </td>
                    <td className="num">
                      {editable ? (
                        <button className="btn btn-sm btn-danger" onClick={() => setPendingRemove(i)}>
                          Remove
                        </button>
                      ) : (
                        <span className="cell-sub">locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editable ? (
          <form className="inline-form" style={{ marginTop: 16 }} onSubmit={addItem}>
            <div className="field">
              <label htmlFor="product">Product</label>
              <select id="product" className="select" value={productId} onChange={(e) => onProductChange(e.target.value)}>
                <option value="">— select product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} ({p.sku}) — {p.quantity > 0 ? `${p.quantity} in stock${p.tracks_colors ? ` · ${p.colors.length} colors` : ''}${p.tracks_packs ? ` · big size ${p.base_quantity ?? 0} + ${p.packs.length} pack${p.packs.length === 1 ? '' : 's'}` : ''}` : 'out of stock'}
                  </option>
                ))}
              </select>
            </div>
            {colorOptions.length > 0 ? (
              <div className="field" style={{ maxWidth: 190 }}>
                <label htmlFor="color">Color *</label>
                <select id="color" className="select" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="">— select color —</option>
                  {colorOptions.map((c) => (
                    <option key={c.color} value={c.color} disabled={c.quantity <= 0}>
                      {colorStockLabel(c)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {packOptions.length > 0 ? (
              <div className="field" style={{ maxWidth: 300 }}>
                <label htmlFor="pack">Size</label>
                <select id="pack" className="select" value={pack} onChange={(e) => setPack(e.target.value)}>
                  <option value="">
                    Big size (original) — MRP {formatMoney(selectedProduct.mrp)} ·{' '}
                    {formatMoney(selectedProduct.selling_price ?? selectedProduct.mrp)} ·{' '}
                    {(selectedProduct.base_quantity ?? 0) > 0
                      ? `${selectedProduct.base_quantity} in stock`
                      : 'out of stock'}
                  </option>
                  {packOptions.map((p) => (
                    <option key={p.label} value={p.label} disabled={p.quantity <= 0}>
                      {packStockLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="field" style={{ maxWidth: 120 }}>
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min="1"
                step="1"
                className="input"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add to order'}
            </button>
          </form>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove line item?"
        message={
          pendingRemove
            ? `${pendingRemove.quantity} unit(s) of "${pendingRemove.product?.name}" will be returned to stock.`
            : ''
        }
        confirmLabel="Remove & restore stock"
        onConfirm={removeItem}
        onCancel={() => setPendingRemove(null)}
        busy={busy}
      />

      <ConfirmDialog
        open={pendingCancel}
        title="Cancel order?"
        message="All deducted stock for this order's items will be restored. This cannot be undone."
        confirmLabel="Cancel order & restore stock"
        onConfirm={() => changeStatus('cancelled')}
        onCancel={() => setPendingCancel(false)}
        busy={busy}
      />
    </>
  );
}
