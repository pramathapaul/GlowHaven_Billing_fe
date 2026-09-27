import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatMoney } from '../api.js';
import { PageHead, Alert, Spinner } from '../components/ui.jsx';

const round2 = (n) => Math.round(n * 100) / 100;
let rowSeq = 1;

export default function StandaloneBill() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [products, setProducts] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [rows, setRows] = useState([{ key: rowSeq++, productId: '', color: '', pack: '', qty: '1', price: '' }]);
  const [delivery, setDelivery] = useState('0');
  const [discountRate, setDiscountRate] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/api/customers'), api.get('/api/products')])
      .then(([c, p]) => {
        setCustomers(c.customers);
        setProducts(p.products);
        if (c.customers.length === 1) setCustomerId(c.customers[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  const productMap = useMemo(() => new Map((products || []).map((p) => [p.id, p])), [products]);

  const updateRow = (key, patch) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const onProductChange = (key, productId) => {
    const p = productMap.get(productId);
    updateRow(key, {
      productId,
      // Default = the big/original size (no pack chosen).
      price: p ? String(p.selling_price ?? p.mrp) : '',
      color: p?.colors?.length ? p.colors[0].color : '',
      pack: '',
    });
  };

  const onPackChange = (key, label) => {
    const row = rows.find((r) => r.key === key);
    const p = row ? productMap.get(row.productId) : null;
    const entry = p?.packs?.find((x) => x.label === label);
    // Empty label = the big/original size -> bill at the product's own price.
    updateRow(key, {
      pack: label,
      price: entry ? String(entry.price) : p ? String(p.selling_price ?? p.mrp) : '',
    });
  };

  const addRow = () =>
    setRows((prev) => [...prev, { key: rowSeq++, productId: '', color: '', pack: '', qty: '1', price: '' }]);
  const removeRow = (key) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  /** Availability for one row = bucket stock − what the OTHER rows already claim. */
  const rowError = (row) => {
    if (!row.productId) return null;
    const p = productMap.get(row.productId);
    if (!p) return 'Product not available.';
    const qty = Number(row.qty) || 0;
    if (!Number.isInteger(qty) || qty < 1) return 'Quantity must be a whole number ≥ 1.';

    const othersFor = (match) =>
      rows
        .filter((r) => r.key !== row.key && r.productId === row.productId && match(r))
        .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

    if (p.tracks_colors) {
      if (!row.color) return 'Choose a color.';
      const entry = p.colors.find((c) => c.color.toLowerCase() === row.color.toLowerCase());
      if (!entry) return `No color "${row.color}" on this product.`;
      const availableColor = entry.quantity - othersFor((r) => (r.color || '').toLowerCase() === row.color.toLowerCase());
      if (qty > availableColor) return `Only ${availableColor} available in ${row.color}.`;
      const availableTotal = p.quantity - othersFor(() => true);
      if (qty > availableTotal) return `Only ${availableTotal} available in total.`;
      return null;
    }

    if (p.tracks_packs) {
      // No pack chosen = the big/original size of the product.
      if (!row.pack) {
        const base = Number(p.base_quantity ?? 0);
        const availableBase = base - othersFor((r) => !(r.pack || ''));
        if (qty > availableBase) return `Only ${availableBase} available in big size.`;
        const availableTotal = p.quantity - othersFor(() => true);
        if (qty > availableTotal) return `Only ${availableTotal} available in total.`;
        return null;
      }
      const entry = p.packs.find((x) => x.label.toLowerCase() === row.pack.toLowerCase());
      if (!entry) return `No pack "${row.pack}" on this product.`;
      const availablePack = entry.quantity - othersFor((r) => (r.pack || '').toLowerCase() === row.pack.toLowerCase());
      if (qty > availablePack) return `Only ${availablePack} available in ${row.pack}.`;
      const availableTotal = p.quantity - othersFor(() => true);
      if (qty > availableTotal) return `Only ${availableTotal} available in total.`;
      return null;
    }

    const available = p.quantity - othersFor(() => true);
    if (qty > available) return `Only ${available} available.`;
    return null;
  };

  const rowErrors = rows.filter((r) => r.productId).map((r) => ({ key: r.key, error: rowError(r) }));
  const uniqueErrors = [...new Set(rowErrors.map((r) => r.error).filter(Boolean))];

  const lines = rows
    .filter((r) => r.productId && !rowError(r))
    .map((r) => {
      const p = productMap.get(r.productId);
      const qty = Number(r.qty) || 0;
      // Empty price falls back to the selected pack's price, else the product's.
      const packEntry = p && r.pack ? p.packs?.find((x) => x.label === r.pack) : null;
      const defaultPrice = p ? (packEntry ? packEntry.price : (p.selling_price ?? p.mrp)) : 0;
      const price = r.price === '' ? defaultPrice : Number(r.price) || 0;
      return { key: r.key, product: p, color: r.color || null, pack: r.pack || null, quantity: qty, price, lineTotal: round2(qty * price) };
    });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const deliveryNum = Math.max(0, Number(delivery) || 0);
  const discountRateNum = Math.min(100, Math.max(0, Number(discountRate) || 0));
  const discount = round2((subtotal * discountRateNum) / 100);
  const total = round2(Math.max(0, subtotal + deliveryNum - discount));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Select a customer.');
    if (rows.every((r) => !r.productId)) return setError('Add at least one product.');
    if (uniqueErrors.length) return setError(uniqueErrors.join(' '));
    if (lines.length === 0) return setError('Fix the item rows before saving.');

    setSaving(true);
    try {
      const d = await api.post('/api/bills/standalone', {
        customerId,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          price: l.price,
          color: l.color,
          pack: l.pack,
        })),
        deliveryCharge: deliveryNum,
        discountRate: discountRateNum,
      });
      navigate(`/bills/${d.bill.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!customers || !products) return <Spinner />;

  return (
    <>
      <PageHead title="Standalone bill" subtitle="Stock (and its color bucket) is validated and deducted in one transaction">
        <Link className="btn" to="/billing">
          Cancel
        </Link>
      </PageHead>

      <Alert onClose={() => setError('')}>{error}</Alert>

      <form onSubmit={onSubmit} noValidate>
        <div className="card">
          <h2>Customer</h2>
          {customers.length === 0 ? (
            <div className="empty">
              No customers yet. <Link to="/customers/new">Create one</Link>.
            </div>
          ) : (
            <div className="field" style={{ maxWidth: 420 }}>
              <label htmlFor="customer">Bill to *</label>
              <select id="customer" className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Items</h2>
          {rows.map((row) => {
            const p = row.productId ? productMap.get(row.productId) : null;
            const err = rowErrors.find((r) => r.key === row.key)?.error;
            const colorEntry = p?.colors?.find((c) => c.color.toLowerCase() === row.color.toLowerCase());
            const packEntry = p?.packs?.find((x) => x.label.toLowerCase() === row.pack.toLowerCase());
            return (
              <div key={row.key} className="inline-form" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
                <div className="field" style={{ minWidth: 220 }}>
                  <label>Product</label>
                  <select className="select" value={row.productId} onChange={(e) => onProductChange(row.key, e.target.value)}>
                    <option value="">— select —</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id} disabled={prod.quantity <= 0}>
                        {prod.name} ({prod.sku}) — {prod.quantity > 0 ? `${prod.quantity} in stock` : 'out of stock'}
                      </option>
                    ))}
                  </select>
                </div>

                {p?.tracks_colors ? (
                  <div className="field" style={{ maxWidth: 190 }}>
                    <label>Color *</label>
                    <select className="select" value={row.color} onChange={(e) => updateRow(row.key, { color: e.target.value })}>
                      <option value="">— select —</option>
                      {p.colors.map((c) => (
                        <option key={c.color} value={c.color} disabled={c.quantity <= 0}>
                          {c.color} — {c.quantity > 0 ? `${c.quantity} in stock` : 'out of stock'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {p?.tracks_packs ? (
                  <div className="field" style={{ maxWidth: 280 }}>
                    <label>Size</label>
                    <select className="select" value={row.pack} onChange={(e) => onPackChange(row.key, e.target.value)}>
                      <option value="">
                        Big size (original) — MRP {formatMoney(p.mrp)} · {formatMoney(p.selling_price ?? p.mrp)} ·{' '}
                        {(p.base_quantity ?? 0) > 0 ? `${p.base_quantity} in stock` : 'out of stock'}
                      </option>
                      {p.packs.map((x) => (
                        <option key={x.label} value={x.label} disabled={x.quantity <= 0}>
                          {x.label} — MRP {formatMoney(x.mrp ?? x.price)} · {formatMoney(x.price)} ·{' '}
                          {x.quantity > 0 ? `${x.quantity} in stock` : 'out of stock'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="field" style={{ maxWidth: 100 }}>
                  <label>Qty</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={row.qty}
                    onChange={(e) => updateRow(row.key, { qty: e.target.value })}
                  />
                </div>

                <div className="field" style={{ maxWidth: 110 }}>
                  <label>MRP</label>
                  <div className="input" style={{ background: '#f8fafc', color: 'var(--muted)' }}>
                    {p ? formatMoney(packEntry ? (packEntry.mrp ?? packEntry.price) : p.mrp) : '—'}
                  </div>
                </div>

                <div className="field" style={{ maxWidth: 120 }}>
                  <label>Unit price</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.price}
                    placeholder={p ? String(packEntry ? packEntry.price : (p.selling_price ?? p.mrp)) : ''}
                    onChange={(e) => updateRow(row.key, { price: e.target.value })}
                  />
                </div>

                <div className="field" style={{ maxWidth: 70 }}>
                  <label>Available</label>
                  <div className="input" style={{ background: '#f8fafc', color: 'var(--muted)' }}>
                    {p
                      ? colorEntry
                        ? `${colorEntry.quantity}`
                        : p.tracks_packs
                          ? `${packEntry ? packEntry.quantity : (p.base_quantity ?? 0)}`
                          : `${p.quantity}`
                      : '—'}
                  </div>
                </div>

                <button type="button" className="btn btn-ghost" onClick={() => removeRow(row.key)} title="Remove row">
                  ✕
                </button>

                {err ? (
                  <div className="field-error" style={{ flexBasis: '100%' }}>
                    {err}
                  </div>
                ) : null}
              </div>
            );
          })}
          <button type="button" className="btn btn-sm" onClick={addRow}>
            + Add another product
          </button>
        </div>

        <div className="card">
          <h2>Charges</h2>
          <div className="inline-form" style={{ marginBottom: 16 }}>
            <div className="field" style={{ maxWidth: 180 }}>
              <label htmlFor="delivery">Delivery charges (₹)</label>
              <input id="delivery" className="input" type="number" min="0" step="0.01" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
            </div>
            <div className="field" style={{ maxWidth: 180 }}>
              <label htmlFor="disc">Discount (%)</label>
              <input id="disc" className="input" type="number" min="0" max="100" step="0.5" value={discountRate} onChange={(e) => setDiscountRate(e.target.value)} />
            </div>
          </div>

          <div className="totals-box">
            <div className="row">
              <span>Subtotal</span>
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
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Create bill & deduct stock'}
            </button>
            <Link className="btn" to="/billing">
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}
