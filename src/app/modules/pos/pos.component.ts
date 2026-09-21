import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ReceiptService } from '../../core/services/receipt.service';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

type CartItem = {
  productId: number;
  productName: string;
  barcode?: string | null;
  qty: number;
  price: number;
  gstRate: number;
  productDiscount: number;  // % per-product discount
  lineTotal: number;
  packagingUnit: 'unit' | 'strip' | 'box';
  unitsPerStrip: number;
  stripsPerBox: number;
  trackBatches?: boolean;
  batches?: any[];
  batchId?: number | null;
  batchNo?: string | null;
};

type TenderRow = { method: 'CASH' | 'CARD' | 'UPI'; amount: number };

type Customer = {
  id: number;
  name: string;
  phone?: string | null;
  balance?: number;
};

const CREATE_NEW_CUSTOMER = '__CREATE_NEW_CUSTOMER__';

@Component({
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss'],
})
export class PosComponent implements OnInit {
  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  cart: CartItem[] = [];
  searchCtrl = new FormControl('');
  suggestions: any[] = [];
  searching = false;

  // Customer
  customerSearchCtrl = new FormControl('');
  customerSuggestions: Customer[] = [];
  searchingCustomers = false;
  selectedCustomer: Customer | null = null;
  isNewCustomer = false;
  newCustomerNameCtrl = new FormControl('');
  newCustomerPhoneCtrl = new FormControl('');

  // Bill controls
  discountCtrl = new FormControl(0);  // legacy flat discount (kept for backward compat)
  billDiscountCtrl = new FormControl(0);  // % bill-level discount
  amountPaidCtrl = new FormControl<number | null>(null);  // null = pay full
  paymentMethodCtrl = new FormControl('CASH');

  // Multi-tender split payment
  paymentRows: TenderRow[] = [
    { method: 'CASH', amount: 0 },
    { method: 'CARD', amount: 0 },
    { method: 'UPI',  amount: 0 },
  ];

  readonly CREATE_NEW = CREATE_NEW_CUSTOMER;
  settings: any = null;
  lastSale: any = null;

  constructor(
    private api: ApiService,
    private receipt: ReceiptService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) { }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => this.settings = r.data);

    // Product autocomplete
    this.searchCtrl.valueChanges.pipe(
      debounceTime(150), distinctUntilChanged(),
      switchMap(v => {
        const q = String(v || '').trim();
        if (q.length < 2) { this.suggestions = []; return of(null); }
        this.searching = true;
        return this.api.get<any>('/products', { q, limit: 10 }).pipe(catchError(() => of({ ok: true, data: [] })));
      })
    ).subscribe((r: any) => { if (r?.data) this.suggestions = r.data || []; this.searching = false; });

    // Customer autocomplete
    this.customerSearchCtrl.valueChanges.pipe(
      debounceTime(200), distinctUntilChanged(),
      switchMap(v => {
        const q = String(v || '').trim();
        // Only reset if user typed something different
        if (!this.selectedCustomer || q !== this.selectedCustomer.name) {
          this.selectedCustomer = null;
          this.isNewCustomer = false;
        }
        if (q.length < 2) { this.customerSuggestions = []; return of(null); }
        this.searchingCustomers = true;
        return this.api.get<any>('/customers', { q, limit: 10 }).pipe(catchError(() => of({ ok: true, data: [] })));
      })
    ).subscribe((r: any) => { if (r?.data) this.customerSuggestions = r.data || []; this.searchingCustomers = false; });

    setTimeout(() => this.barcodeInput?.nativeElement?.focus(), 0);
  }

  // ── Customer ──────────────────────────────────────────────────────────────
  selectCustomer(customer: Customer) {
    this.selectedCustomer = customer;
    this.isNewCustomer = false;
    this.customerSearchCtrl.setValue(customer.name, { emitEvent: false });
    this.customerSuggestions = [];
  }

  selectCreateNew() {
    this.isNewCustomer = true;
    this.selectedCustomer = null;
    const typed = String(this.customerSearchCtrl.value || '').trim();
    this.newCustomerNameCtrl.setValue(typed);
    this.newCustomerPhoneCtrl.setValue('');
    this.customerSuggestions = [];
  }

  clearCustomer() {
    this.selectedCustomer = null;
    this.isNewCustomer = false;
    this.customerSearchCtrl.setValue('', { emitEvent: false });
    this.customerSuggestions = [];
    this.newCustomerNameCtrl.setValue('');
    this.newCustomerPhoneCtrl.setValue('');
  }

  // ── Products / Cart ───────────────────────────────────────────────────────
  onEnter() {
    const v = String(this.searchCtrl.value || '').trim();
    if (!v) return;
    this.scan(v);
  }

  scan(code: string) {
    this.api.get<any>('/products', { q: code, limit: 1 }).subscribe(r => {
      const products = r.data || [];
      if (products.length === 0) { this.toast.error('Product not found'); return; }
      this.selectProduct(products[0]);
    });
  }

  selectProduct(p: any) {
    // Batch-tracked product: ensure a batch with stock is chosen
    let defaultBatch: any = null;
    if (p.trackBatches === 1) {
      const available = (p.batches || []).filter((b: any) => Number(b.stockQty) > 0);
      if (available.length === 0) { this.toast.error(`${p.name}: no batch stock available`); return; }
      defaultBatch = available[0];
    }

    const existing = this.cart.find(x => x.productId === p.id);
    if (existing) {
      const maxQty = existing.batchId
        ? (existing.batches?.find(b => b.id === existing.batchId)?.stockQty ?? Infinity)
        : p.stockQty;
      if (existing.qty + 1 > maxQty) { this.toast.warning('Cannot add more than available stock'); return; }
      existing.qty++;
      this.recalcItem(existing);
    } else {
      const item: CartItem = {
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        qty: 1,
        price: p.price || 0,
        gstRate: p.gstRate || 0,
        productDiscount: p.productDiscount || 0,
        lineTotal: 0,
        packagingUnit: p.packagingUnit || 'unit',
        unitsPerStrip: p.unitsPerStrip || 1,
        stripsPerBox: p.stripsPerBox || 1,
        trackBatches: p.trackBatches === 1,
        batches: p.batches || [],
        batchId: defaultBatch?.id ?? null,
        batchNo: defaultBatch?.batchNo || null,
      };
      if (defaultBatch) {
        item.qty = Math.min(1, Math.max(0, Number(defaultBatch.stockQty)));
        if (item.qty <= 0) { this.toast.error(`${p.name}: no batch stock`); return; }
      }
      this.recalcItem(item);
      this.cart.push(item);
    }

    this.searchCtrl.setValue('', { emitEvent: false });
    this.suggestions = [];
    this.toast.success('Item added to cart');
  }

  batchLabel(b: any): string {
    return `${b.batchNo || 'B' + b.id}${b.expiryDate ? ' · ' + b.expiryDate : ''} (${b.stockQty})`;
  }

  setBatch(item: CartItem, b: any) {
    const batch = (item.batches || []).find(x => x.id === Number(b?.id ?? b));
    if (!batch) return;
    item.batchId = batch.id;
    item.batchNo = batch.batchNo;
    if (item.qty > Number(batch.stockQty)) {
      item.qty = Math.max(0, Number(batch.stockQty));
    }
    this.recalcItem(item);
  }

  recalcItem(item: CartItem) {
    const base = item.price * item.qty;
    const discAmt = base * (item.productDiscount / 100);
    const afterDisc = base - discAmt;
    const gst = afterDisc * (item.gstRate / 100);
    item.lineTotal = afterDisc + gst;
  }

  updateQty(item: CartItem, val: any) {
    item.qty = Math.max(1, Math.floor(Number(val) || 1));
    const max = item.batchId
      ? (item.batches?.find(b => b.id === item.batchId)?.stockQty ?? Infinity)
      : Infinity;
    if (item.qty > max) item.qty = max;
    this.recalcItem(item);
  }
  increaseQty(item: CartItem) {
    const max = item.batchId
      ? (item.batches?.find(b => b.id === item.batchId)?.stockQty ?? Infinity)
      : Infinity;
    if (item.qty >= max) { this.toast.warning('Batch stock limit reached'); return; }
    item.qty++;
    this.recalcItem(item);
  }
  decreaseQty(item: CartItem) { if (item.qty > 1) { item.qty--; this.recalcItem(item); } }
  updateDiscount(item: CartItem, val: any) {
    item.productDiscount = Math.max(0, Math.min(100, Number(val) || 0));
    this.recalcItem(item);
  }
  remove(item: CartItem) {
    const idx = this.cart.indexOf(item);
    if (idx >= 0) { this.cart.splice(idx, 1); this.toast.info('Item removed'); }
  }

  async clearCart() {
    const confirmed = await this.confirm.confirm({
      title: 'Clear Cart',
      message: 'Are you sure you want to remove all items from the cart?',
      confirmText: 'Clear All',
      isDanger: true,
    });

    if (confirmed) {
      this.cart = [];
      this.clearCustomer();
      this.discountCtrl.setValue(0);
      this.billDiscountCtrl.setValue(0);
      this.amountPaidCtrl.setValue(null);
      this.resetSplit();
      this.toast.info('Cart cleared');
    }
  }

  get splitTotal(): number {
    return this.paymentRows.reduce((s, r) => s + (Math.max(0, Number(r.amount) || 0)), 0);
  }

  resetSplit() {
    for (const r of this.paymentRows) r.amount = 0;
  }

  totals() {
    let subTotal = 0, gstTotal = 0, discountTotal = 0;
    for (const x of this.cart) {
      const base = x.price * x.qty;
      const discAmt = base * (x.productDiscount / 100);
      const after = base - discAmt;
      const gst = after * (x.gstRate / 100);
      subTotal += base;
      discountTotal += discAmt;
      gstTotal += gst;
    }
    const afterItemDisc = subTotal - discountTotal + gstTotal;
    const billDiscPct = Math.max(0, Number(this.billDiscountCtrl.value) || 0);
    const billDiscAmt = afterItemDisc * (billDiscPct / 100);
    const grandTotal = Math.max(0, afterItemDisc - billDiscAmt);
    let amountPaid = this.splitTotal;
    if (amountPaid <= 0) {
      amountPaid = this.amountPaidCtrl.value !== null
        ? Math.max(0, Number(this.amountPaidCtrl.value))
        : grandTotal;
    }
    const balanceDue = Math.max(0, grandTotal - amountPaid);
    return { subTotal, gstTotal, discountTotal, billDiscAmt, grandTotal, amountPaid, balanceDue };
  }

  get customerPrevBalance(): number {
    return Number(this.selectedCustomer?.balance || 0);
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  async checkout() {
    if (this.cart.length === 0) { this.toast.warning('Cart is empty'); return; }

    const t = this.totals();
    let customerId: number | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;

    if (this.selectedCustomer) {
      customerId = this.selectedCustomer.id;
      customerName = this.selectedCustomer.name;
      customerPhone = this.selectedCustomer.phone ?? null;
    } else if (this.isNewCustomer) {
      const name = this.newCustomerNameCtrl.value?.trim();
      if (!name) { this.toast.warning('Please enter a name for the new customer'); return; }
      customerName = name;
      customerPhone = this.newCustomerPhoneCtrl.value?.trim() || null;
    }

    const splitPay = this.paymentRows
      .map(r => ({ method: r.method, amount: Math.max(0, Math.round(Number(r.amount) * 100) / 100) }))
      .filter(p => p.amount > 0);
    const splitTotal = splitPay.reduce((s, p) => s + p.amount, 0);
    const useSplit = splitPay.length > 0;

    const body = {
      customerId,
      customerName,
      customerPhone,
      isNewCustomer: this.isNewCustomer,
      paymentMethod: useSplit
        ? (splitPay.length === 1 ? splitPay[0].method : 'MIXED')
        : (this.paymentMethodCtrl.value || 'CASH'),
      payments: useSplit ? splitPay : undefined,
      discount: 0,
      billDiscount: Number(this.billDiscountCtrl.value) || 0,
      amountPaid: useSplit ? splitTotal : (this.amountPaidCtrl.value !== null ? t.amountPaid : null),
      items: this.cart.map(x => ({
        productId: x.productId,
        qty: x.qty,
        price: x.price,
        gstRate: x.gstRate,
        productDiscount: x.productDiscount,
        packagingUnit: x.packagingUnit,
        batchId: x.batchId || null,
      })),
    };

    this.api.post<any>('/sales', body).subscribe({
      next: (r) => {
        this.lastSale = r.data;
        this.cart = [];
        this.clearCustomer();
        this.discountCtrl.setValue(0);
        this.billDiscountCtrl.setValue(0);
        this.amountPaidCtrl.setValue(null);
        this.resetSplit();
        this.toast.success('Sale completed successfully!');
        setTimeout(() => this.print(), 500);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to complete sale');
      }
    });
  }

  async print() {
    if (!this.lastSale) return;
    const html = this.receipt.buildHtml({ ...this.lastSale, ...this.settings });
    try {
      const res = await (window as any).medpos?.printReceipt?.(html, { silent: false });
      if (res?.success) return;
    } catch { }
    const w = window.open('', '_blank', 'width=420,height=640,menubar=no,toolbar=no,location=no');
    if (w) { w.document.write(html); w.document.close(); }
    else this.toast.error('Please allow popups to print receipts');
  }
}
