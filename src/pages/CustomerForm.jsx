import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHead, Alert, Spinner } from '../components/ui.jsx';

const EMPTY = { name: '', phone: '', phone2: '', email: '', address: '' };

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/api/customers/${id}`)
      .then((d) =>
        setForm({
          name: d.customer.name,
          phone: d.customer.phone,
          phone2: d.customer.phone2 || '',
          email: d.customer.email || '',
          address: d.customer.address || '',
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    else if (!/^[\d+\-().\s]{7,30}$/.test(form.phone.trim())) errs.phone = 'Phone looks invalid (digits, +, - and spaces only).';
    if (form.phone2.trim() && !/^[\d+\-().\s]{7,30}$/.test(form.phone2.trim())) errs.phone2 = 'Phone 2 looks invalid (digits, +, - and spaces only).';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email or leave it empty.';
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
      phone: form.phone.trim(),
      phone2: form.phone2.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    };
    try {
      const d = isEdit
        ? await api.put(`/api/customers/${id}`, payload)
        : await api.post('/api/customers', payload);
      navigate(`/customers/${d.customer.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHead title={isEdit ? 'Edit customer' : 'New customer'}>
        <Link className="btn" to={isEdit ? `/customers/${id}` : '/customers'}>
          Cancel
        </Link>
      </PageHead>

      <div className="card" style={{ maxWidth: 640 }}>
        <Alert onClose={() => setError('')}>{error}</Alert>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input id="name" className={`input ${fieldErrors.name ? 'invalid' : ''}`} value={form.name} onChange={set('name')} />
            {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="phone">Phone *</label>
            <input id="phone" className={`input ${fieldErrors.phone ? 'invalid' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            {fieldErrors.phone ? <span className="field-error">{fieldErrors.phone}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="phone2">Phone 2 (optional)</label>
            <input id="phone2" className={`input ${fieldErrors.phone2 ? 'invalid' : ''}`} value={form.phone2} onChange={set('phone2')} placeholder="+91 98765 43211" />
            {fieldErrors.phone2 ? <span className="field-error">{fieldErrors.phone2}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="email">Email (optional)</label>
            <input id="email" type="email" className={`input ${fieldErrors.email ? 'invalid' : ''}`} value={form.email} onChange={set('email')} placeholder="name@example.com" />
            {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
          </div>
          <div className="field">
            <label htmlFor="address">Address (optional)</label>
            <textarea id="address" className="textarea" value={form.address} onChange={set('address')} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
            </button>
            <Link className="btn" to={isEdit ? `/customers/${id}` : '/customers'}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
