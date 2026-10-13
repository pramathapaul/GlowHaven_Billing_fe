import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, downloadFile, formatMoney, formatDay, billSource } from '../api.js';
import { downloadElementAsPdf } from '../pdf.js';
import { PageHead, Alert, Spinner, StatusBadge, ConfirmDialog } from '../components/ui.jsx';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [payQr, setPayQr] = useState('');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const invoiceRef = useRef(null);
  const thermalRef = useRef(null);
  const thermalStyleRef = useRef(null);
  const labelRef = useRef(null);
  const labelStyleRef = useRef(null);

  useEffect(() => {
    api
      .get(`/api/bills/${id}`)
      .then((d) => setBill(d.bill))
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!bill?.payment?.upi_id) {
      setPayQr('');
      return;
    }
    const params = new URLSearchParams({
      pa: bill.payment.upi_id,
      pn: bill.payment.upi_name || 'GlowHaven',
      am: Number(bill.total).toFixed(2),
      cu: 'INR',
      tn: `Bill #${bill.id.slice(-8)}`,
    });
    QRCode.toDataURL(`upi://pay?${params}`, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setPayQr)
      .catch(() => setPayQr(''));
  }, [bill]);

  useEffect(() => {
    function cleanup() {
      document.body.classList.remove('printing-thermal', 'printing-label');
      if (thermalStyleRef.current) {
        thermalStyleRef.current.remove();
        thermalStyleRef.current = null;
      }
      if (labelStyleRef.current) {
        labelStyleRef.current.remove();
        labelStyleRef.current = null;
      }
    }
    window.addEventListener('afterprint', cleanup);
    return () => {
      window.removeEventListener('afterprint', cleanup);
      cleanup();
    };
  }, []);

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

  function clearPrintModes() {
    document.body.classList.remove('printing-thermal', 'printing-label');
    if (thermalStyleRef.current) {
      thermalStyleRef.current.remove();
      thermalStyleRef.current = null;
    }
    if (labelStyleRef.current) {
      labelStyleRef.current.remove();
      labelStyleRef.current = null;
    }
  }

  function printThermal58() {
    clearPrintModes();
    if (!thermalStyleRef.current) {
      const style = document.createElement('style');
      style.textContent = '@page { size: 58mm auto; margin: 0; }';
      document.head.appendChild(style);
      thermalStyleRef.current = style;
    }
    document.body.classList.add('printing-thermal');
    window.print();
  }

  function printAddressLabel() {
    clearPrintModes();
    if (!labelStyleRef.current) {
      const style = document.createElement('style');
      style.textContent = '@page { size: auto 56mm; margin: 0; }';
      document.head.appendChild(style);
      labelStyleRef.current = style;
    }
    document.body.classList.add('printing-label');
    window.print();
  }

  function printA4() {
    clearPrintModes();
    window.print();
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

  const source = billSource(bill);

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
        <button className="btn btn-primary" onClick={printThermal58}>
          Print 58mm
        </button>
        <button className="btn" onClick={printAddressLabel}>
          Print Address
        </button>
        <button className="btn" onClick={printA4}>
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
            <div style={{ fontSize: 15 }}>From GlowHaven</div>
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
              <strong>{source.kind === 'site' ? `Site order ${source.text}` : `Order ${source.text}`}</strong>
            </div>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <div className="stat-label">To</div>
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

      <div className="thermal-receipt" ref={thermalRef}>
        <div className="tr-center">
          <div className="tr-brand">GlowHaven</div>
          <div>+91 8910434478</div>
          <div>Madhyamgram Purnachal PO</div>
          <div>East Udayrajpur, Pin - 700129</div>
        </div>

        <div className="tr-rule" />

        <div className="tr-row">
          <span>Bill</span>
          <span>#{bill.id.slice(-8)}</span>
        </div>
        <div className="tr-row">
          <span>Date</span>
          <span>{formatDay(bill.created_at)}</span>
        </div>
        <div className="tr-row">
          <span>Source</span>
          <span>
            {source.kind === 'site'
              ? `Site ${source.text}`
              : source.kind === 'order'
                ? `Order ${source.text}`
                : source.text}
          </span>
        </div>

        <div className="tr-rule" />

        <div className="tr-section">Bill To</div>
        <div>{bill.customer?.name || '—'}</div>

        <div className="tr-rule" />

        {bill.items.map((i, idx) => (
          <div className="tr-item" key={i.id}>
            <div className="tr-item-name">
              {idx + 1}. {i.product?.name || 'Product'}
              {i.color ? ` (${i.color})` : ''}
            </div>
            <div className="tr-item-line">
              <span>
                {i.quantity} × {formatMoney(i.price)}
              </span>
              <span>{formatMoney(i.line_total)}</span>
            </div>
          </div>
        ))}

        <div className="tr-rule" />

        <div className="tr-row">
          <span>Subtotal</span>
          <span>{formatMoney(bill.subtotal)}</span>
        </div>
        {bill.delivery_charge ? (
          <div className="tr-row">
            <span>Delivery</span>
            <span>{formatMoney(bill.delivery_charge)}</span>
          </div>
        ) : null}
        {bill.discount ? (
          <div className="tr-row">
            <span>Discount ({bill.discount_rate}%)</span>
            <span>−{formatMoney(bill.discount)}</span>
          </div>
        ) : null}
        <div className="tr-row tr-total">
          <span>TOTAL</span>
          <span>{formatMoney(bill.total)}</span>
        </div>

        {payQr ? (
          <>
            <div className="tr-rule" />
            <div className="tr-qr">
              <img src={payQr} alt="Scan to pay via UPI" />
              <div className="tr-qr-label">Scan to pay · {formatMoney(bill.total)}</div>
              <div className="tr-small">{bill.payment.upi_id}</div>
            </div>
          </>
        ) : null}

        <div className="tr-rule" />

        <div className="tr-foot">Thank you for shopping with us!</div>
        <div className="tr-foot tr-small">Generated {formatDay(bill.created_at)}</div>
      </div>

      <div className="address-label" ref={labelRef}>
        <div className="al-grid">
          <div className="al-panel">
            <div className="al-caption">From</div>
            <div className="al-name">GlowHaven</div>
            <div className="al-line">Madhyamgram Purnachal PO - East Udayrajpur</div>
            <div className="al-line">Pin - 700129</div>
            <div className="al-line">+91 8910434478</div>
            <div className="al-spacer" />
            <div className="al-ref">Bill #{bill.id.slice(-8)} · {formatDay(bill.created_at)}</div>
          </div>
          <div className="al-panel">
            <div className="al-caption">To</div>
            <div className="al-name">{bill.customer?.name || '—'}</div>
            {bill.customer?.phone ? <div className="al-line">{bill.customer.phone}</div> : null}
            {bill.customer?.phone2 ? <div className="al-line">{bill.customer.phone2}</div> : null}
            {bill.customer?.address ? <div className="al-line">{bill.customer.address}</div> : null}
            <div className="al-spacer" />
            <div className="al-ref">
              {source.kind === 'site'
                ? `Site order ${source.text}`
                : source.kind === 'order'
                  ? `Order ${source.text}`
                  : `Bill ${source.text}`}
            </div>
          </div>
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
