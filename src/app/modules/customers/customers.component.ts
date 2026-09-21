import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { downloadCsv, stamp } from '../../core/utils/export-csv';

@Component({
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {
  rows: any[] = [];
  editing: any = null;
  modalOpen = false;
  submitted = false;
  form: any;

  payCustomer: any = null;
  payOpen = false;
  payAmount = 0;
  payNote = '';
  paySubmitting = false;

  ledgerCustomer: any = null;
  ledgerOpen = false;
  ledgerRows: any[] = [];
  ledgerLoading = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      email: [''],
      address: [''],
      loyaltyPoints: [0, [Validators.min(0), Validators.max(9)]]
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any>('/customers').subscribe({
      next: (r) => {
        this.rows = r.data || [];
      },
      error: () => {
        this.toast.error('Failed to load customers');
      }
    });
  }

  openModal(customer?: any) {
    this.editing = customer ?? null;
    this.submitted = false;

    if (customer) {
      this.form.patchValue({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        loyaltyPoints: customer.loyaltyPoints || ''
      });
    } else {
      this.form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        loyaltyPoints: ''
      });
    }

    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.editing = null;
  }

  save() {
    this.submitted = true;
    if (this.form.invalid) {
      this.toast.warning('Please fill in all required fields');
      return;
    }

    const req = this.editing
      ? this.api.put<any>(`/customers/${this.editing.id}`, this.form.value)
      : this.api.post<any>('/customers', this.form.value);

    req.subscribe({
      next: () => {
        this.toast.success(this.editing ? 'Customers updated successfully' : 'Customers added successfully');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save customer');
      }
    });
  }

  async remove(customer: any) {
    const confirmed = await this.confirm.confirm({
      title: 'Delete Customer',
      message: `Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (confirmed) {
      this.api.delete<any>(`/customers/${customer.id}`).subscribe({
        next: () => {
          this.toast.success('Customer deleted successfully');
          this.load();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete customer');
        }
      });
    }
  }

  limitToOneDigit(event: any) {
    let value = event.target.value;
    if (value.length > 1) {
      event.target.value = value.slice(0, 1);
    }
  }

  openPayment(customer: any) {
    this.payCustomer = customer;
    this.payAmount = 0;
    this.payNote = '';
    this.payOpen = true;
  }

  closePayment() {
    this.payOpen = false;
    this.payCustomer = null;
  }

  submitPayment() {
    if (!(Number(this.payAmount) > 0)) {
      this.toast.warning('Enter a valid payment amount');
      return;
    }
    this.paySubmitting = true;
    this.api.post<any>(`/sales/payment/${this.payCustomer.id}`, {
      amount: Number(this.payAmount),
      note: this.payNote,
    }).subscribe({
      next: () => {
        this.toast.success(`Payment of ₹${this.payAmount} recorded`);
        this.closePayment();
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Failed to record payment'),
    }).add(() => (this.paySubmitting = false));
  }

  openLedger(customer: any) {
    this.ledgerCustomer = customer;
    this.ledgerRows = [];
    this.ledgerOpen = true;
    this.ledgerLoading = true;
    this.loadLedger();
  }

  loadLedger() {
    this.api.get<any>(`/sales/ledger/${this.ledgerCustomer.id}`).subscribe({
      next: (r) => {
        this.ledgerRows = r.data || [];
        this.ledgerLoading = false;
      },
      error: () => {
        this.ledgerLoading = false;
        this.toast.error('Failed to load ledger');
      },
    });
  }

  closeLedger() {
    this.ledgerOpen = false;
    this.ledgerCustomer = null;
    this.ledgerRows = [];
  }

  exportLedgerCsv() {
    const rows = this.ledgerRows.map(r => [
      r.createdAt ? String(r.createdAt).replace('T', ' ').slice(0, 16) : '',
      r.billId ?? '',
      r.type ?? '',
      r.debit ?? 0,
      r.credit ?? 0,
      r.balance ?? 0,
      r.note ?? '',
    ]);
    downloadCsv(`customer-ledger-${this.ledgerCustomer.name}-${stamp()}.csv`,
      ['Date', 'Bill ID', 'Type', 'Debit', 'Credit', 'Balance', 'Note'], rows);
  }

  exportCsv() {
    const rows = this.rows.map(c => [c.name, c.phone ?? '', c.email ?? '', c.address ?? '', c.balance ?? 0, c.loyaltyPoints ?? 0]);
    downloadCsv(`customers-${stamp()}.csv`, ['Name', 'Phone', 'Email', 'Address', 'Balance', 'Loyalty Points'], rows);
  }
}