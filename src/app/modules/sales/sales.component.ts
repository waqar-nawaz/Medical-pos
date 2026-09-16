import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ReceiptService } from '../../core/services/receipt.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
})
export class SalesComponent implements OnInit {
  rows: any[]         = [];
  filteredRows: any[] = [];
  selected: any       = null;
  settings: any       = null;
  whatsappPhone       = '';

  // Filters
  from: any = Date;
  to:   any = Date;
  paymentFilter = '';

  // ── Edit-bill state ───────────────────────────────────────────────────────
  editItems: any[]     = [];
  editBillDiscount     = new FormControl(0);
  editAmountPaid       = new FormControl<number|null>(null);

  // Modal states
  invoiceModalOpen = false;
  editModalOpen = false;
  whatsappModalOpen = false;
  ledgerModalOpen = false;

  // ── Ledger ───────────────────────────────────────────────────────────────
  ledgerData: any = null;

  constructor(
    private api: ApiService,
    private receipt: ReceiptService,
    private toast: ToastService
  ) { this.pickCurrentWeek(); }

  get fromInput(): string {
    return this.from ? this.formatDate(this.from) : '';
  }
  set fromInput(v: string) {
    this.from = v ? new Date(v + 'T00:00:00') : null;
  }
  get toInput(): string {
    return this.to ? this.formatDate(this.to) : '';
  }
  set toInput(v: string) {
    this.to = v ? new Date(v + 'T23:59:59') : null;
  }

  pickCurrentWeek() {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - today.getDay()); start.setHours(0,0,0,0);
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
    this.from = start; this.to = end;
  }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => this.settings = r.data);
    this.load();
  }

  load() {
    const params: any = {};
    if (this.from) params.from = this.formatDate(this.from);
    if (this.to)   params.to   = this.formatDate(this.to);
    this.api.get<any>('/sales', params).subscribe({
      next:  r => { this.rows = r.data || []; this.filterByPayment(); },
      error: () => this.toast.error('Failed to load sales history'),
    });
  }

  formatDate(d: any) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  filterByPayment() {
    this.filteredRows = this.paymentFilter
      ? this.rows.filter(r => r.paymentMethod === this.paymentFilter)
      : [...this.rows];
  }

  open(row: any) {
    this.api.get<any>(`/sales/${row.id}`).subscribe({
      next:  r => { this.selected = r.data || null; this.invoiceModalOpen = true; },
      error: () => this.toast.error('Failed to load invoice'),
    });
  }

  closeInvoice() {
    this.invoiceModalOpen = false;
    this.selected = null;
  }

  // ── Edit Bill ─────────────────────────────────────────────────────────────
  openEdit(row: any) {
    this.api.get<any>(`/sales/${row.id}`).subscribe({
      next: r => {
        this.selected = r.data;
        // Deep-copy items so edits don't affect the view
        this.editItems = (r.data?.items || []).map((it: any) => ({
          ...it,
          productDiscount: it.productDiscount ?? 0,
          packagingUnit:   it.packagingUnit   ?? 'unit',
        }));
        this.editBillDiscount.setValue(
          r.data?.billDiscount
            ? Math.round((r.data.billDiscount / Math.max(1, r.data.grandTotal + r.data.billDiscount)) * 100)
            : 0
        );
        this.editAmountPaid.setValue(null);
        this.editModalOpen = true;
      },
      error: () => this.toast.error('Failed to load invoice for editing'),
    });
  }

  closeEdit() {
    this.editModalOpen = false;
    this.selected = null;
  }

  editTotals() {
    let sub = 0, disc = 0, gst = 0;
    for (const it of this.editItems) {
      const base   = it.price * it.qty;
      const dAmt   = base * ((it.productDiscount||0) / 100);
      const after  = base - dAmt;
      const gstAmt = after * ((it.gstRate||0) / 100);
      sub  += base; disc += dAmt; gst += gstAmt;
    }
    const afterDisc   = sub - disc + gst;
    const bdPct       = Math.max(0, Math.min(100, Number(this.editBillDiscount.value)||0));
    const bdAmt       = afterDisc * (bdPct / 100);
    const grand       = Math.max(0, afterDisc - bdAmt);
    const paid        = this.editAmountPaid.value !== null ? Math.max(0, Number(this.editAmountPaid.value)) : grand;
    const balDue      = Math.max(0, grand - paid);
    return { sub, disc, gst, bdAmt, grand, paid, balDue };
  }

  removeEditItem(idx: number) {
    this.editItems.splice(idx, 1);
  }

  saveEdit() {
    if (!this.selected) return;
    if (this.editItems.length === 0) { this.toast.warning('Cannot save a bill with no items'); return; }

    const t = this.editTotals();
    const body = {
      items: this.editItems.map(it => ({
        productId:       it.productId,
        qty:             it.qty,
        price:           it.price,
        gstRate:         it.gstRate,
        productDiscount: it.productDiscount || 0,
        packagingUnit:   it.packagingUnit   || 'unit',
      })),
      billDiscount: Number(this.editBillDiscount.value) || 0,
      amountPaid:   this.editAmountPaid.value !== null ? t.paid : null,
    };

    this.api.put<any>(`/sales/${this.selected.id}`, body).subscribe({
      next: () => {
        this.toast.success('Bill updated successfully');
        this.closeEdit();
        this.load();
      },
      error: err => this.toast.error(err?.error?.message || 'Failed to update bill'),
    });
  }

  // ── Customer Ledger ───────────────────────────────────────────────────────
  openLedger(customerId: number) {
    this.api.get<any>(`/customers/${customerId}/ledger`).subscribe({
      next: r => {
        this.ledgerData = r.data;
        this.ledgerModalOpen = true;
      },
      error: () => this.toast.error('Failed to load customer ledger'),
    });
  }

  closeLedger() {
    this.ledgerModalOpen = false;
    this.ledgerData = null;
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  async print() {
    if (!this.selected) return;
    const html = this.receipt.buildHtml({ ...this.selected, ...this.settings });
    try {
      const res = await (window as any).medpos?.printReceipt?.(html, { silent: false });
      if (res?.success) return;
    } catch {}
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.target = '_blank'; a.click();
    URL.revokeObjectURL(url);
  }

  getPaymentClass(m: string) { return `payment-${(m||'CASH').toLowerCase()}`; }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  openWhatsappDialog() {
    this.whatsappPhone = this.selected?.customerPhone || '';
    this.whatsappModalOpen = true;
  }

  closeWhatsapp() {
    this.whatsappModalOpen = false;
  }

  sendWhatsapp() {
    if (!this.whatsappPhone) { this.toast.warning('Please enter a phone number'); return; }
    this.whatsapp(this.whatsappPhone);
    this.closeWhatsapp();
  }

  whatsapp(phone: string) {
    if (!this.selected || !phone) return;
    const inv = this.selected;
    let msg = `🧾 *INVOICE*\nInvoice: ${inv.invoiceNo}\nDate: ${new Date(inv.createdAt).toLocaleString()}\n`;
    if (inv.customerName) msg += `Customer: ${inv.customerName}\n`;
    msg += `\nTotal: ₹${inv.grandTotal}\nPayment: ${inv.paymentMethod}\nThank you!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  exportCSV() {
    if (!this.filteredRows.length) { this.toast.warning('No data to export'); return; }
    const headers = ['Bill No','Date','Customer','Items','Amount','Payment Method'];
    const rows    = this.filteredRows.map(r => [r.invoiceNo, new Date(r.createdAt).toLocaleString(),
      r.customerName||'Walk-in', r.totalItems||0, r.grandTotal.toFixed(2), r.paymentMethod||'CASH']);
    let csv = headers.join(',') + '\n';
    rows.forEach(r => { csv += r.map(c => `"${c}"`).join(',') + '\n'; });
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a   = document.createElement('a');
    a.href = url; a.download = `sales-${this.formatDate(this.from)}-to-${this.formatDate(this.to)}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    this.toast.success('CSV exported successfully');
  }
}