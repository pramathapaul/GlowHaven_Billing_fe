import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHead, Alert, Spinner } from '../components/ui.jsx';

const EMPTY = { name: '', sku: '', category: '', quantity: '0', unit: 'pcs', mrp: '', selling_price: '', cost_price: '' };
let rowSeq = 1;

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [colors, setColors] = useState([]); // [{ key, color, quantity }]
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
        });
        setColors(
          (p.colors || []).map((c) => ({ key: rowSeq++, color: c.color, quantity: String(c.quantity) }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const tracksColors = colors.length > 0;
  const colorTotal = colors.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  const tracksVariants = tracksColors;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setColorRow = (key, patch) =>
    setColors((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addColorRow = () => setColors((prev) => [...prev, { key: rowSeq++, color: '', quantity: '0' }]);
  const removeColorRow = (key) => setColors((prev) => prev.filter((r) => r.key !== key));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.sku.trim()) errs.sku = 'SKU is required.';
    if (!form.category.trim()) errs.category = 'Category is required.';
    if (!form.unit.trim()) errs.unit = 'Unit is required.';
    if (form.mrp === '' || Number(form.mrp) < 0) errs.mrp = 'MRP must be 0 or more.';
    if (form.selling_price === '' || Number(form.selling_price) < 0) errs.selling_price = 'Selling price must be 0 or more.';
    if (form.cost_price === '' || Number(form.cost_price) < 0) errs.cost_price = 'Cost price must be 0 or more.';

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
      quantity: tracksColors ? colorTotal : Number(form.quantity),
      colors: tracksColors ? colors.map((c) => ({ color: c.color.trim(), quantity: Number(c.quantity) })) : [],
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
        subtitle={isEdit ? 'Update details, colors and stock levels' : 'Add a product to the catalogue'}
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
              Quantity in stock {tracksColors ? '(auto from colors)' : '*'}
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="1"
              className={`input ${fieldErrors.quantity ? 'invalid' : ''}`}
              value={tracksColors ? String(colorTotal) : form.quantity}
              onChange={set('quantity')}
              disabled={tracksVariants}
              readOnly={tracksVariants}
            />
            <span className="hint">
              {tracksColors
                ? 'Totals are the sum of the color breakdown below.'
                : 'Add colors below if this product comes in variants.'}
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
