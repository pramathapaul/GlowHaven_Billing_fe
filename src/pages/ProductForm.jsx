import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHead, Alert, Spinner } from '../components/ui.jsx';

const EMPTY = { name: '', sku: '', category: '', quantity: '0', unit: 'pcs', mrp: '', selling_price: '', cost_price: '', base_quantity: '0' };
let rowSeq = 1;

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [colors, setColors] = useState([]); // [{ key, color, quantity }]
  const [packs, setPacks] = useState([]); // [{ key, label, mrp, price, cost_price, quantity }]
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/api/products/${id}`)
      .then((d) => {
        const p = d.product;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category,
          quantity: String(p.quantity),
          unit: p.unit,
          mrp: String(p.mrp),
          selling_price: String(p.selling_price ?? p.mrp ?? ''),
          cost_price: String(p.cost_price),
          // Big/original size stock (equals the plain quantity when no packs).
          base_quantity: String(p.base_quantity ?? 0),
        });
        setColors(
          (p.colors || []).map((c) => ({ key: rowSeq++, color: c.color, quantity: String(c.quantity) }))
        );
        setPacks(
          (p.packs || []).map((x) => ({
            key: rowSeq++,
            label: x.label,
            mrp: String(x.mrp ?? x.price ?? ''),
            price: String(x.price),
            cost_price: String(x.cost_price ?? ''),
            quantity: String(x.quantity),
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const tracksColors = colors.length > 0;
  const tracksPacks = packs.length > 0;
  const colorTotal = colors.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const baseQty = Number(form.base_quantity) || 0;
  const packTotal = packs.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  // Total stock = big/original size + every pack bucket.
  const packGrandTotal = baseQty + packTotal;
  const tracksVariants = tracksColors || tracksPacks;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setColorRow = (key, patch) =>
    setColors((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addColorRow = () => setColors((prev) => [...prev, { key: rowSeq++, color: '', quantity: '0' }]);
  const removeColorRow = (key) => setColors((prev) => prev.filter((r) => r.key !== key));
  const setPackRow = (key, patch) =>
    setPacks((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addPackRow = () =>
    setPacks((prev) => [...prev, { key: rowSeq++, label: '', mrp: '', price: '', cost_price: '', quantity: '0' }]);
  const removePackRow = (key) => setPacks((prev) => prev.filter((r) => r.key !== key));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.sku.trim()) errs.sku = 'SKU is required.';
    if (!form.category.trim()) errs.category = 'Category is required.';
    if (!form.unit.trim()) errs.unit = 'Unit is required.';
    if (form.mrp === '' || Number(form.mrp) < 0) errs.mrp = 'MRP must be 0 or more.';
    if (form.selling_price === '' || Number(form.selling_price) < 0) errs.selling_price = 'Selling price must be 0 or more.';
    if (form.cost_price === '' || Number(form.cost_price) < 0) errs.cost_price = 'Cost price must be 0 or more.';

    if (tracksColors && tracksPacks) {
      errs.variants = 'A product can track stock by colors OR packs, not both — clear one of the sections.';
    }

    if (tracksColors) {
      const seen = new Set();
      colors.forEach((row, i) => {
        const name = row.color.trim().toLowerCase();
        if (!name) errs[`color-${row.key}`] = `Row ${i + 1}: color name is required.`;
        else if (seen.has(name)) errs[`color-${row.key}`] = `Row ${i + 1}: duplicate color "${row.color}".`;
        if (row.quantity === '' || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 0) {
          errs[`qty-${row.key}`] = 'Whole number ≥ 0.';
        }
        seen.add(name);
      });
    }

    if (tracksPacks) {
      if (
        form.base_quantity === '' ||
        !Number.isInteger(Number(form.base_quantity)) ||
        Number(form.base_quantity) < 0
      ) {
        errs.base_quantity = 'Big-size stock must be a whole number ≥ 0.';
      }
      const seen = new Set();
      packs.forEach((row, i) => {
        const label = row.label.trim().toLowerCase();
        if (!label) errs[`pack-${row.key}`] = `Row ${i + 1}: pack label is required.`;
        else if (seen.has(label)) errs[`pack-${row.key}`] = `Row ${i + 1}: duplicate pack "${row.label}".`;
        if (row.price === '' || !Number.isFinite(Number(row.price)) || Number(row.price) < 0) {
          errs[`pprice-${row.key}`] = 'Selling price must be 0 or more.';
        }
        if (row.mrp === '' || !Number.isFinite(Number(row.mrp)) || Number(row.mrp) < 0) {
          errs[`pmrp-${row.key}`] = 'MRP must be 0 or more.';
        }
        if (row.cost_price === '' || !Number.isFinite(Number(row.cost_price)) || Number(row.cost_price) < 0) {
          errs[`pcost-${row.key}`] = 'Cost price must be 0 or more.';
        }
        if (row.quantity === '' || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 0) {
          errs[`pqty-${row.key}`] = 'Whole number ≥ 0.';
        }
        seen.add(label);
      });
    }

    if (!tracksVariants && (form.quantity === '' || Number(form.quantity) < 0 || !Number.isInteger(Number(form.quantity)))) {
      errs.quantity = 'Quantity must be a whole number ≥ 0.';
    }

    setFieldErrors(errs);
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setError(Object.values(errs).join(' '));
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      unit: form.unit.trim(),
      mrp: Number(form.mrp),
      selling_price: Number(form.selling_price),
      cost_price: Number(form.cost_price),
      quantity: tracksColors ? colorTotal : tracksPacks ? packGrandTotal : Number(form.quantity),
      // Big/original size stock (server ignores it when there are no packs).
      base_quantity: tracksPacks ? Number(form.base_quantity) : Number(form.quantity) || 0,
      colors: tracksColors ? colors.map((c) => ({ color: c.color.trim(), quantity: Number(c.quantity) })) : [],
      packs: tracksPacks
        ? packs.map((p) => ({
            label: p.label.trim(),
            mrp: Number(p.mrp),
            price: Number(p.price),
            cost_price: Number(p.cost_price),
            quantity: Number(p.quantity),
          }))
        : [],
    };
    try {
      const d = isEdit
        ? await api.put(`/api/products/${id}`, payload)
        : await api.post('/api/products', payload);
      navigate(`/products/${d.product.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHead
        title={isEdit ? 'Edit product' : 'New product'}
        subtitle={isEdit ? 'Update details, colors/packs and stock levels' : 'Add a product to the catalogue'}
      >
        <Link className="btn" to={isEdit ? `/products/${id}` : '/products'}>
          Cancel
        </Link>
      </PageHead>

      <div className="card" style={{ maxWidth: 760 }}>
        <Alert onClose={() => setError('')}>{error}</Alert>
        <form onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Name *</label>
              <input id="name" className={`input ${fieldErrors.name ? 'invalid' : ''}`} value={form.name} onChange={set('name')} />
              {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="sku">SKU *</label>
              <input id="sku" className={`input ${fieldErrors.sku ? 'invalid' : ''}`} value={form.sku} onChange={set('sku')} placeholder="ELEC-MSE-01" />
              <span className="hint">Unique. Stored upper-case.</span>
              {fieldErrors.sku ? <span className="field-error">{fieldErrors.sku}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="category">Category *</label>
              <input id="category" className={`input ${fieldErrors.category ? 'invalid' : ''}`} value={form.category} onChange={set('category')} list="category-list" />
              <datalist id="category-list">
                {['Electronics', 'Grocery', 'Apparel', 'Stationery', 'Hardware'].map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {fieldErrors.category ? <span className="field-error">{fieldErrors.category}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="unit">Unit *</label>
              <input id="unit" className={`input ${fieldErrors.unit ? 'invalid' : ''}`} value={form.unit} onChange={set('unit')} placeholder="pcs / kg / bottle" />
              {fieldErrors.unit ? <span className="field-error">{fieldErrors.unit}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="mrp">MRP (printed price) *</label>
              <input id="mrp" type="number" min="0" step="0.01" className={`input ${fieldErrors.mrp ? 'invalid' : ''}`} value={form.mrp} onChange={set('mrp')} />
              {fieldErrors.mrp ? <span className="field-error">{fieldErrors.mrp}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="cost_price">Cost price (what you pay) *</label>
              <input id="cost_price" type="number" min="0" step="0.01" className={`input ${fieldErrors.cost_price ? 'invalid' : ''}`} value={form.cost_price} onChange={set('cost_price')} />
              {fieldErrors.cost_price ? <span className="field-error">{fieldErrors.cost_price}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="selling_price">Selling price (what customer pays) *</label>
              <input id="selling_price" type="number" min="0" step="0.01" className={`input ${fieldErrors.selling_price ? 'invalid' : ''}`} value={form.selling_price} onChange={set('selling_price')} />
              {fieldErrors.selling_price ? <span className="field-error">{fieldErrors.selling_price}</span> : null}
            </div>
          </div>

          <div className="field">
            <label htmlFor="quantity">
              Quantity in stock {tracksColors ? '(auto from colors)' : tracksPacks ? '(auto from packs)' : '*'}
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="1"
              className={`input ${fieldErrors.quantity ? 'invalid' : ''}`}
              value={tracksColors ? String(colorTotal) : tracksPacks ? String(packGrandTotal) : form.quantity}
              onChange={set('quantity')}
              disabled={tracksVariants}
              readOnly={tracksVariants}
            />
            <span className="hint">
              {tracksColors
                ? 'Totals are the sum of the color breakdown below.'
                : tracksPacks
                  ? 'Totals are the big-size stock plus the pack breakdown below.'
                  : 'Add colors or packs below if this product comes in variants.'}
            </span>
            {fieldErrors.quantity ? <span className="field-error">{fieldErrors.quantity}</span> : null}
          </div>

          <div className="field">
            <label>Stock by color</label>
            <div className="hint" style={{ marginBottom: 6 }}>
              Optional. When colors are tracked, every order/bill line must pick one — deductions hit both the color
              bucket and the total.
            </div>
            {colors.map((row, i) => (
              <div key={row.key} className="inline-form" style={{ marginBottom: 8 }}>
                <input
                  className={`input ${fieldErrors[`color-${row.key}`] ? 'invalid' : ''}`}
                  placeholder={`Color ${i + 1} (e.g. red)`}
                  value={row.color}
                  onChange={(e) => setColorRow(row.key, { color: e.target.value })}
                />
                <input
                  className={`input ${fieldErrors[`qty-${row.key}`] ? 'invalid' : ''}`}
                  style={{ maxWidth: 130 }}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => setColorRow(row.key, { quantity: e.target.value })}
                />
                <button type="button" className="btn btn-ghost" onClick={() => removeColorRow(row.key)} title="Remove color">
                  ✕
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" className="btn btn-sm" onClick={addColorRow}>
                + Add color
              </button>
              {tracksColors ? (
                <span className="hint">Total: {colorTotal}</span>
              ) : null}
            </div>
            {Object.entries(fieldErrors)
              .filter(([k]) => k.startsWith('color-') || k.startsWith('qty-'))
              .map(([k, v]) => (
                <span key={k} className="field-error">
                  {v}
                </span>
              ))}
          </div>

          <div className="field">
            <label>Stock by pack</label>
            <div className="hint" style={{ marginBottom: 6 }}>
              Optional. The product as you first added it stays sellable as the <strong>big size</strong> (no size
              selected) — add a pack for every smaller size (e.g. Small pack). Each pack has its own MRP, selling
              price, cost price and stock bucket. Cannot be combined with colors.
            </div>

            <div className="inline-form" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
              <input
                className="input"
                value="Big size (original) — as added above"
                readOnly
                disabled
                style={{ background: '#f8fafc', color: 'var(--muted)' }}
              />
              <input
                className={`input ${fieldErrors.base_quantity ? 'invalid' : ''}`}
                style={{ maxWidth: 110 }}
                type="number"
                min="0"
                step="0.01"
                placeholder="MRP"
                title="MRP (printed price)"
                value={form.mrp}
                readOnly
              />
              <input
                className="input"
                style={{ maxWidth: 110 }}
                type="number"
                min="0"
                step="0.01"
                placeholder="Selling"
                title="Selling price (what customer pays)"
                value={form.selling_price}
                readOnly
              />
              <input
                className="input"
                style={{ maxWidth: 110 }}
                type="number"
                min="0"
                step="0.01"
                placeholder="Cost"
                title="Cost price (what you pay)"
                value={form.cost_price}
                readOnly
              />
              <input
                className={`input ${fieldErrors.base_quantity ? 'invalid' : ''}`}
                style={{ maxWidth: 90 }}
                type="number"
                min="0"
                step="1"
                placeholder="Qty"
                title="Big-size stock"
                value={form.base_quantity}
                onChange={set('base_quantity')}
              />
            </div>
            {fieldErrors.base_quantity ? <span className="field-error">{fieldErrors.base_quantity}</span> : null}

            {packs.map((row, i) => (
              <div key={row.key} className="inline-form" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                <input
                  className={`input ${fieldErrors[`pack-${row.key}`] ? 'invalid' : ''}`}
                  placeholder={`Pack ${i + 1} (e.g. Small pack)`}
                  value={row.label}
                  onChange={(e) => setPackRow(row.key, { label: e.target.value })}
                />
                <input
                  className={`input ${fieldErrors[`pmrp-${row.key}`] ? 'invalid' : ''}`}
                  style={{ maxWidth: 110 }}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="MRP"
                  title="MRP (printed price)"
                  value={row.mrp}
                  onChange={(e) => setPackRow(row.key, { mrp: e.target.value })}
                />
                <input
                  className={`input ${fieldErrors[`pprice-${row.key}`] ? 'invalid' : ''}`}
                  style={{ maxWidth: 110 }}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Selling"
                  title="Selling price (what customer pays)"
                  value={row.price}
                  onChange={(e) => setPackRow(row.key, { price: e.target.value })}
                />
                <input
                  className={`input ${fieldErrors[`pcost-${row.key}`] ? 'invalid' : ''}`}
                  style={{ maxWidth: 110 }}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Cost"
                  title="Cost price (what you pay)"
                  value={row.cost_price}
                  onChange={(e) => setPackRow(row.key, { cost_price: e.target.value })}
                />
                <input
                  className={`input ${fieldErrors[`pqty-${row.key}`] ? 'invalid' : ''}`}
                  style={{ maxWidth: 90 }}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => setPackRow(row.key, { quantity: e.target.value })}
                />
                <button type="button" className="btn btn-ghost" onClick={() => removePackRow(row.key)} title="Remove pack">
                  ✕
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" className="btn btn-sm" onClick={addPackRow}>
                + Add pack
              </button>
              {tracksPacks ? (
                <span className="hint">
                  Big size {baseQty} + packs {packTotal} = {packGrandTotal} total
                </span>
              ) : null}
            </div>
            {fieldErrors.variants ? <span className="field-error">{fieldErrors.variants}</span> : null}
            {Object.entries(fieldErrors)
              .filter(([k]) => k === 'base_quantity' || k.startsWith('pack-') || k.startsWith('pmrp-') || k.startsWith('pprice-') || k.startsWith('pcost-') || k.startsWith('pqty-'))
              .map(([k, v]) => (
                <span key={k} className="field-error">
                  {v}
                </span>
              ))}
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
            <Link className="btn" to={isEdit ? `/products/${id}` : '/products'}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
