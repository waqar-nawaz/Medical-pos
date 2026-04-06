import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReceiptService {

  buildHtml(data: any): string {
    const storeName    = esc(data.storeName    || 'Medical Store');
    const storeAddress = esc(data.storeAddress || '');
    const storePhone   = esc(data.storePhone   || '');
    const footer       = esc(data.receiptFooter || 'Thank you for your purchase!');
    const invoiceNo    = esc(data.invoiceNo    || 'N/A');
    const createdAt    = formatDate(data.createdAt);
    const customerName = esc(data.customerName || '');
    const customerPhone= esc(data.customerPhone|| '');
    const payMethod    = esc(data.paymentMethod|| 'CASH');

    const items        = data.items || [];
    const subTotal     = Number(data.subTotal    || 0);
    const gstTotal     = Number(data.gstTotal    || 0);
    const discountAmt  = Number(data.discount    || 0);   // product-level discounts total
    const billDiscAmt  = Number(data.billDiscount|| 0);   // bill-level discount amount
    const grandTotal   = Number(data.grandTotal  || 0);
    const amountPaid   = Number(data.amountPaid  ?? grandTotal);
    const balanceDue   = Number(data.balanceDue  || 0);
    const prevBalance  = Number(data.prevBalance || 0);
    const netAmount    = grandTotal + prevBalance;

    // ── Item rows ──────────────────────────────────────────────────────────
    const itemRows = items.map((it: any, i: number) => {
      const name      = esc(it.productName || '');
      const rate      = Number(it.price      || 0);
      const qty       = Number(it.qty        || 0);
      const unit      = esc(it.packagingUnit || 'unit');
      const disc      = Number(it.productDiscount || 0);
      const lineTotal = Number(it.lineTotal  || 0);
      const bg        = i % 2 === 0 ? '#fff' : '#f9f9f9';
      return `
        <tr style="background:${bg}">
          <td class="td-name">${i + 1}. ${name}</td>
          <td class="td-num">${fmt(rate)}</td>
          <td class="td-num">${qty}</td>
          <td class="td-num">${unit}</td>
          <td class="td-num">${disc > 0 ? disc + '%' : '—'}</td>
          <td class="td-num td-net">${fmt(lineTotal)}</td>
        </tr>`;
    }).join('');

    const totalItems = items.length;

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice – ${invoiceNo}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      body { margin: 0; }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      background: #fff;
      color: #000;
      font-size: 11px;
      line-height: 1.4;
    }

    .receipt {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 10px 10px 16px;
    }

    /* ── Header ── */
    .header { text-align: center; margin-bottom: 6px; }
    .store-name {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .store-sub { font-size: 10px; color: #333; margin-top: 2px; }

    /* ── Invoice meta ── */
    .meta-box {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 5px 0;
    }
    .meta-box .label { font-weight: 700; }

    hr.solid  { border: none; border-top: 2px solid #000; margin: 5px 0; }
    hr.dashed { border: none; border-top: 1px dashed #888; margin: 4px 0; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; }

    .col-headers th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 2px;
      border-bottom: 1px solid #000;
      border-top: 1px solid #000;
    }
    .th-name { text-align: left; }
    .th-num  { text-align: right; }

    .td-name {
      padding: 3px 2px 3px 0;
      font-size: 10.5px;
      word-break: break-word;
      max-width: 28mm;
    }
    .td-num {
      text-align: right;
      padding: 3px 2px;
      font-size: 10.5px;
      white-space: nowrap;
    }
    .td-net { font-weight: 600; }

    /* ── Totals ── */
    .totals-table td { padding: 2px 2px; font-size: 11px; }
    .totals-table .t-label { text-align: left; }
    .totals-table .t-value { text-align: right; font-weight: 600; }
    .grand-row td {
      font-size: 13px;
      font-weight: 700;
      padding-top: 5px;
      border-top: 2px solid #000;
    }
    .net-row td {
      font-size: 13px;
      font-weight: 700;
      padding-top: 4px;
      border-top: 2px solid #000;
    }
    .balance-due td { color: #c00; font-weight: 700; font-size: 12px; }
    .prev-balance td { font-size: 11px; }

    /* ── Footer ── */
    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 10px;
      color: #444;
      border-top: 1px dashed #999;
      padding-top: 6px;
    }

    /* ── Print / Action buttons (screen only) ── */
    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      margin: 18px auto 0;
      width: 80mm;
      max-width: 95vw;
    }
    .btn {
      padding: 9px 22px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    .btn:hover { opacity: .85; }
    .btn-print  { background: #0d9488; color: #fff; }
    .btn-close  { background: #6b7280; color: #fff; }

    /* ── Summary bar ── */
    .summary-bar {
      display: flex;
      justify-content: space-between;
      background: #f0f0f0;
      border: 1px solid #ccc;
      padding: 4px 6px;
      font-size: 10px;
      font-weight: 700;
      margin-top: 4px;
    }
  </style>
</head>
<body>

<div class="receipt" id="receipt">

  <!-- ── Store Header ─────────────────────────────────────────────────── -->
  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddress ? `<div class="store-sub">${storeAddress}</div>` : ''}
    ${storePhone   ? `<div class="store-sub">Tel: ${storePhone}</div>` : ''}
  </div>

  <hr class="solid">

  <!-- ── Invoice Meta ─────────────────────────────────────────────────── -->
  <div class="meta-box">
    <span>${customerName ? `<span class="label">Name:</span> ${customerName}` : '<span class="label">Walk-in Customer</span>'}</span>
    <span><span class="label">No:</span> ${invoiceNo}</span>
  </div>
  <div class="meta-box">
    <span>${customerPhone ? `<span class="label">Phone:</span> ${customerPhone}` : ''}</span>
    <span><span class="label">Date:</span> ${createdAt}</span>
  </div>

  <hr class="solid">

  <!-- ── Items Table ───────────────────────────────────────────────────── -->
  <table>
    <thead>
      <tr class="col-headers">
        <th class="th-name">Name</th>
        <th class="th-num">Rate</th>
        <th class="th-num">Pcs</th>
        <th class="th-num">Unit</th>
        <th class="th-num">Disc</th>
        <th class="th-num">Net</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- ── Summary bar ──────────────────────────────────────────────────── -->
  <div class="summary-bar">
    <span>Items ${totalItems}</span>
    <span>Payment: ${payMethod}</span>
  </div>

  <hr class="dashed">

  <!-- ── Totals ────────────────────────────────────────────────────────── -->
  <table class="totals-table">
    <tr>
      <td class="t-label">Sub Total</td>
      <td class="t-value">${fmt(subTotal)}</td>
    </tr>
    ${gstTotal > 0 ? `
    <tr>
      <td class="t-label">GST</td>
      <td class="t-value">${fmt(gstTotal)}</td>
    </tr>` : ''}
    ${discountAmt > 0 ? `
    <tr>
      <td class="t-label">Item Discounts</td>
      <td class="t-value" style="color:#c00">- ${fmt(discountAmt)}</td>
    </tr>` : ''}
    ${billDiscAmt > 0 ? `
    <tr>
      <td class="t-label">Extra Discount</td>
      <td class="t-value" style="color:#c00">- ${fmt(billDiscAmt)}</td>
    </tr>` : ''}
    <tr class="grand-row">
      <td class="t-label">TOTAL</td>
      <td class="t-value">${fmt(grandTotal)}</td>
    </tr>
    ${amountPaid < grandTotal ? `
    <tr>
      <td class="t-label">Amount Paid</td>
      <td class="t-value">${fmt(amountPaid)}</td>
    </tr>` : ''}
    ${prevBalance > 0 ? `
    <tr class="prev-balance">
      <td class="t-label">Prev. Balance</td>
      <td class="t-value" style="color:#c00">${fmt(prevBalance)}</td>
    </tr>` : ''}
    ${(balanceDue > 0 || prevBalance > 0) ? `
    <tr class="net-row">
      <td class="t-label">Net Amount</td>
      <td class="t-value">${fmt(netAmount)}</td>
    </tr>` : ''}
    ${balanceDue > 0 ? `
    <tr class="balance-due">
      <td class="t-label">⚠ Balance Due</td>
      <td class="t-value">${fmt(balanceDue)}</td>
    </tr>` : ''}
  </table>

  <!-- ── Footer ───────────────────────────────────────────────────────── -->
  <div class="footer">${footer}</div>

</div><!-- /receipt -->

<!-- ── Action buttons (hidden on print) ─────────────────────────────── -->
<div class="actions no-print">
  <button class="btn btn-print" onclick="window.print()">🖨&nbsp; Print Receipt</button>
  <button class="btn btn-close" onclick="window.close()">✕&nbsp; Close</button>
</div>

<script>
  // Auto-print when opened in a popup
  window.addEventListener('load', function () {
    if (window.opener) {
      setTimeout(function () { window.print(); }, 400);
    }
  });
</script>
</body>
</html>`;
  }
}

function fmt(v: any): string {
  return Number(v || 0).toFixed(2);
}

function esc(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c: string) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)
  );
}

function formatDate(iso: any): string {
  try {
    const d = new Date(iso || Date.now());
    const dd   = String(d.getDate()).padStart(2, '0');
    const mon  = d.toLocaleString('en', { month: 'short' });
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const mm   = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mon}-${yyyy} ${hh}:${mm}`;
  } catch {
    return String(iso || '');
  }
}