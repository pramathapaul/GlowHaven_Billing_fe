const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const { method = 'GET', body, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers:
      body !== undefined
        ? { 'Content-Type': 'application/json' }
        : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  let data = null;

  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const error = new Error(
      data?.error || `Request failed (HTTP ${res.status})`
    );

    error.status = res.status;
    error.details = data?.details;

    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: 'POST',
      body,
    }),

  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body,
    }),

  patch: (path, body) =>
    request(path, {
      method: 'PATCH',
      body,
    }),

  del: (path) =>
    request(path, {
      method: 'DELETE',
    }),
};

export async function downloadFile(path, filename) {
  const res = await fetch(`${API_URL}${path}`);

  if (!res.ok) {
    let msg = `Download failed (HTTP ${res.status})`;

    try {
      const data = await res.json();

      if (data?.error) {
        msg = data.error;
      }
    } catch {
      // ignore
    }

    throw new Error(msg);
  }

  const blob = await res.blob();

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export const formatMoney = (value) =>
  '₹' +
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

export const formatDay = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        dateStyle: 'medium',
      })
    : '—';

export function billSource(bill) {
  if (bill?.order_id) return { kind: 'order', id: bill.order_id, text: `#${bill.order_id.slice(-8)}` };
  if (bill?.site_order_id) return { kind: 'site', text: `#${bill.site_order_id}` };
  return { kind: 'self', id: bill?.id || '', text: `#${String(bill?.id || '').slice(-8)}` };
}
