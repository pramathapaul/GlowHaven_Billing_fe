import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, downloadFile, formatMoney, formatDay } from '../api.js';
import { downloadElementAsPdf } from '../pdf.js';
import { PageHead, Alert, Spinner, StatusBadge, ConfirmDialog } from '../components/ui.jsx';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const invoiceRef = useRef(null);

  useEffect(() => {
    api
      .get(`/api/bills/${id}`)
      .then((d) => setBill(d.bill))
      .catch((e) => setError(e.message));
  }, [id]);

  async function exportCsv() {
    setDownloading(true);
    setError('');
    try {
      await downloadFile(`/api/bills/${id}/csv`, `bill-${id.slice(-8)}.csv`);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  async function downloadPdf() {
    if (!invoiceRef.current || pdfBusy) return;
    setPdfBusy(true);
    setError('');
    try {
      await downloadElementAsPdf(invoiceRef.current, `bill-${id.slice(-8)}.pdf`);
    } catch (e) {
      setError(e.message || 'Could not generate PDF');
    } finally {
      setPdfBusy(false);
    }
  }

  async function removeBill() {
    setBusy(true);
    setError('');
    try {
      await api.del(`/api/bills/${id}`);
      navigate('/bills');
    } catch (e) {
      setError(e.message);
      setConfirming(false);
      setBusy(false);
    }
  }

  if (error && !bill) return <Alert onClose={() => setError('')}>{error}</Alert>;
  if (!bill) return <Spinner />;

  return (
    <>
      <PageHead title={`Bill #${bill.id.slice(-8)}`} subtitle={bill.order ? 'From order' : 'Standalone bill'}>
        <Link className="btn" to="/bills">
          ← All bills
        </Link>
        {bill.order_id ? (
          <Link className="btn" to={`/orders/${bill.order_id}`}>
            View order
          </Link>
        ) : null}
        <button className="btn" onClick={exportCsv} disabled={downloading}>
          {downloading ? 'Downloading…' : 'Download CSV'}
        </button>
        <button className="btn" onClick={downloadPdf} disabled={pdfBusy}>
          {pdfBusy ? 'Preparing…' : 'Download PDF'}
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print / PDF
        </button>
        <button className="btn btn-danger" onClick={() => setConfirming(true)} disabled={busy}>
          Delete
        </button>
      </PageHead>

      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="card invoice" ref={invoiceRef}>
        <div className="invoice-head">
          <div>
            <h1>Invoice</h1>
            <div style={{ fontSize: 15 }}>GlowHaven</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>+91 8910434478</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Madhyamgram Purnachal PO - East Udayrajpur Pin - 700129</div>
          </div>
          <div className="invoice-meta">
            <div>
              Bill ID: <strong>#{bill.id.slice(-8)}</strong>
            </div>
            <div>
              Date: <strong>{formatDay(bill.created_at)}</strong>
            </div>
            <div>
              Source:{' '}
              <strong>{bill.order_id ? `Order #${bill.order_id.slice(-8)}` : 'Standalone'}</strong>
            </div>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <div className="stat-label">Billed to</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>{bill.customer?.name || '—'}</div>
            <div style={{ color: 'var(--muted)' }}>{bill.customer?.phone}</div>
            {bill.customer?.phone2 ? <div style={{ color: 'var(--muted)' }}>{bill.customer.phone2}</div> : null}
            {bill.customer?.email ? <div style={{ color: 'var(--muted)' }}>{bill.customer.email}</div> : null}
            {bill.customer?.address ? <div style={{ color: 'var(--muted)' }}>{bill.customer.address}</div> : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-label">Amount payable</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>{formatMoney(bill.total)}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              discount {bill.discount_rate}%
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th className="num">Quantity</th>
                <th className="num">MRP</th>
                <th className="num">Discounted price</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((i, idx) => (
                <tr key={i.id}>
                  <td>{idx + 1}</td>
                  <td className="cell-title">
                    {i.product?.name || 'Product'}
                    {i.color ? (
                      <span className="badge badge-neutral" style={{ marginLeft: 6 }}>
                        {i.color}
                      </span>
                    ) : null}
                  </td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">
                    {(i.mrp ?? i.product?.mrp) != null ? formatMoney(i.mrp ?? i.product?.mrp) : '—'}
                  </td>
                  <td className="num">{formatMoney(i.price)}</td>
                  <td className="num">{formatMoney(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}></td>
                <td className="num">Subtotal</td>
                <td className="num">{formatMoney(bill.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4}></td>
                <td className="num">Delivery charges</td>
                <td className="num">{formatMoney(bill.delivery_charge || 0)}</td>
              </tr>
              <tr>
                <td colSpan={4}></td>
                <td className="num">Discount ({bill.discount_rate}%)</td>
                <td className="num">−{formatMoney(bill.discount)}</td>
              </tr>
              <tr>
                <td colSpan={4}></td>
                <td className="num">Total</td>
                <td className="num">{formatMoney(bill.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="invoice-footer">
          <span>Thank you for your business.</span>
          <span>Generated {formatDay(bill.created_at)}</span>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete bill?"
        message={
          bill.order_id
            ? `Bill #${bill.id.slice(-8)} will be permanently deleted. Its order goes back to "confirmed" so it can be re-billed. Stock is not affected.`
            : `Bill #${bill.id.slice(-8)} will be permanently deleted and the stock it used will be returned to inventory.`
        }
        onConfirm={removeBill}
        onCancel={() => setConfirming(false)}
        busy={busy}
      />
    </>
  );
}
