import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { PageHead, Alert, Spinner, StatusBadge } from '../components/ui.jsx';

const round2 = (n) => Math.round(n * 100) / 100;

export default function BillPreview() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [delivery, setDelivery] = useState('0');
  const [discountRate, setDiscountRate] = useState('0');
  const [togglingId, setTogglingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    () =>
      api
        .get(`/api/orders/${orderId}`)
        .then((d) => setOrder(d.order))
        .catch((e) => setError(e.message)),
    [orderId]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (error && !order) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!order) return <Spinner />;

  const editable = order.status === 'draft' || order.status === 'confirmed';
  const items = order.items;
  const checked = items.filter((i) => !i.excluded_from_bill);

  // MRP for a line: the selected pack's own MRP, else the product MRP.
  const lineMrp = (i) => {
    const pack =
      i.pack && i.product?.packs
        ? i.product.packs.find((p) => p.label.toLowerCase() === i.pack.toLowerCase())
        : null;
    const mrp = pack ? (pack.mrp ?? pack.price) : i.product?.mrp;
    return mrp != null ? formatMoney(mrp) : '—';
  };

  const subtotal = round2(checked.reduce((sum, i) => sum + i.quantity * i.price_at_order, 0));
  const deliveryNum = Math.max(0, Number(delivery) || 0);
  const discountRateNum = Math.min(100, Math.max(0, Number(discountRate) || 0));
  const discount = round2((subtotal * discountRateNum) / 100);
  const total = round2(Math.max(0, subtotal + deliveryNum - discount));

  async function toggle(item) {
    const include = item.excluded_from_bill; // currently excluded -> include it
    setTogglingId(item.id);
    setError('');
    setFlash('');
    try {
      const d = await api.post('/api/bills/toggle-item', { orderId, itemId: item.id, include });
      setOrder((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === d.item.id ? { ...d.item, product: d.product || i.product } : i
        ),
      }));
      setFlash(d.message);
    } catch (e) {
      setError(e.message); // checkbox state stays untouched (server state wins)
    } finally {
      setTogglingId(null);
    }
  }

  async function createBill() {
    setCreating(true);
    setError('');
    try {
      const d = await api.post(`/api/bills/from-order/${orderId}`, {
        discountRate: discountRateNum,
        deliveryCharge: deliveryNum,
        itemIds: checked.map((i) => i.id),
      });
      navigate(`/bills/${d.bill.id}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  return (
    <>
      <PageHead
        title={`Bill from order #${order.id.slice(-8)}`}
        subtitle={`${order.customer?.name || 'Unknown'} · unchecking an item restores its stock`}
      >
        <Link className="btn" to={`/orders/${orderId}`}>
          ← Order
        </Link>
        <button className="btn btn-primary" onClick={createBill} disabled={!editable || checked.length === 0 || creating}>
          {creating ? 'Creating…' : `Create bill (${checked.length} item${checked.length === 1 ? '' : 's'})`}
        </button>
      </PageHead>

      <Alert kind="success">{flash}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {!editable ? (
        <Alert kind="info">
          This order is <StatusBadge status={order.status} /> — billing selection is locked.{' '}
          <Link to="/bills">View bills</Link>
        </Alert>
      ) : null}

      <div className="card">
        <h2>Line items</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Bill?</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">MRP</th>
                <th className="num">Price</th>
                <th className="num">Line total</th>
                <th className="num">Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={i.excluded_from_bill ? 'row-excluded' : ''}>
                  <td>
                    <input
                      className="item-check"
                      type="checkbox"
                      checked={!i.excluded_from_bill}
                      disabled={!editable || togglingId === i.id}
                      onChange={() => toggle(i)}
                      aria-label={`Include ${i.product?.name || 'item'} in bill`}
                    />
                  </td>
                  <td>
                    <div className="cell-title">
                      {i.product?.name || 'Product'}
                      {i.color ? <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{i.color}</span> : null}
                      {i.pack ? <span className="badge badge-neutral" style={{ marginLeft: 6 }}>{i.pack}</span> : null}
                    </div>
                    <div className="cell-sub">
                      {i.product?.sku}
                      {i.excluded_from_bill ? ' · excluded (stock restored)' : ''}
                    </div>
                  </td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{lineMrp(i)}</td>
                  <td className="num">{formatMoney(i.price_at_order)}</td>
                  <td className="num">{formatMoney(i.quantity * i.price_at_order)}</td>
                  <td className="num">
                    {i.pack && i.product?.packs
                      ? `${i.product.packs.find((p) => p.label.toLowerCase() === i.pack.toLowerCase())?.quantity ?? 0} (${i.pack})`
                      : i.color && i.product?.colors
                        ? `${i.product.colors.find((c) => c.color.toLowerCase() === i.color.toLowerCase())?.quantity ?? 0} (${i.color})`
                        : (i.product?.quantity ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 ? <div className="empty">This order has no items.</div> : null}
      </div>

      <div className="card">
        <h2>Charges</h2>
        <div className="inline-form" style={{ marginBottom: 16 }}>
          <div className="field" style={{ maxWidth: 180 }}>
            <label htmlFor="delivery">Delivery charges (₹)</label>
            <input
              id="delivery"
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
            />
          </div>
          <div className="field" style={{ maxWidth: 180 }}>
            <label htmlFor="disc">Discount (%)</label>
            <input
              id="disc"
              className="input"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={discountRate}
              onChange={(e) => setDiscountRate(e.target.value)}
            />
          </div>
        </div>

        <div className="totals-box">
          <div className="row">
            <span>Subtotal ({checked.length} item{checked.length === 1 ? '' : 's'})</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="row">
            <span>Delivery charges</span>
            <span>{formatMoney(deliveryNum)}</span>
          </div>
          <div className="row">
            <span>Discount ({discountRateNum}%)</span>
            <span>−{formatMoney(discount)}</span>
          </div>
          <div className="row grand">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={createBill}
            disabled={!editable || checked.length === 0 || creating}
          >
            {creating ? 'Creating…' : 'Create bill'}
          </button>
        </div>
      </div>
    </>
  );
}
