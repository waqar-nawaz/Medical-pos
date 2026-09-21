import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { downloadCsv, stamp } from '../../core/utils/export-csv';

@Component({
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {
  rows: any[] = [];
  editing: any = null;
  modalOpen = false;
  submitted = false;
  form: any;

  paySupplier: any = null;
  payOpen = false;
  payAmount = 0;
  payNote = '';
  paySubmitting = false;

  paymentsSupplier: any = null;
  paymentsOpen = false;
  paymentRows: any[] = [];
  paymentsLoading = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      contactPerson: [''],
      phone: [''],
      email: [''],
      address: [''],
      notes: ['']
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any>('/suppliers').subscribe({
      next: (r) => {
        this.rows = r.data || [];
      },
      error: () => {
        this.toast.error('Failed to load suppliers');
      }
    });
  }

  openModal(supplier?: any) {
    this.editing = supplier ?? null;
    this.submitted = false;

    if (supplier) {
      this.form.patchValue({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || ''
      });
    } else {
      this.form.reset({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
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
      ? this.api.put<any>(`/suppliers/${this.editing.id}`, this.form.value)
      : this.api.post<any>('/suppliers', this.form.value);

    req.subscribe({
      next: () => {
        this.toast.success(this.editing ? 'Supplier updated successfully' : 'Supplier added successfully');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save supplier');
      }
    });
  }

  async remove(supplier: any) {
    const confirmed = await this.confirm.confirm({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete supplier "${supplier.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (confirmed) {
      this.api.delete<any>(`/suppliers/${supplier.id}`).subscribe({
        next: () => {
          this.toast.success('Supplier deleted successfully');
          this.load();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete supplier');
        }
      });
    }
  }

  openPay(supplier: any) {
    this.paySupplier = supplier;
    this.payAmount = 0;
    this.payNote = '';
    this.payOpen = true;
  }

  closePay() {
    this.payOpen = false;
    this.paySupplier = null;
  }

  submitPay() {
    if (!(Number(this.payAmount) > 0)) {
      this.toast.warning('Enter a valid payment amount');
      return;
    }
    this.paySubmitting = true;
    this.api.post<any>(`/suppliers/${this.paySupplier.id}/payments`, {
      amount: Number(this.payAmount),
      note: this.payNote,
    }).subscribe({
      next: (r: any) => {
        this.toast.success(`Payment of ₹${r?.amount || this.payAmount} recorded`);
        this.closePay();
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message || 'Failed to record payment'),
    }).add(() => (this.paySubmitting = false));
  }

  openPayments(supplier: any) {
    this.paymentsSupplier = supplier;
    this.paymentRows = [];
    this.paymentsOpen = true;
    this.paymentsLoading = true;
    this.api.get<any>(`/suppliers/${supplier.id}/payments`).subscribe({
      next: (r) => {
        this.paymentRows = r.data || [];
        this.paymentsLoading = false;
      },
      error: () => {
        this.paymentsLoading = false;
        this.toast.error('Failed to load payment history');
      },
    });
  }

  closePayments() {
    this.paymentsOpen = false;
    this.paymentsSupplier = null;
    this.paymentRows = [];
  }

  exportPaymentsCsv() {
    if (!this.paymentsSupplier) return;
    const rows = this.paymentRows.map(r => [
      r.createdAt ? String(r.createdAt).replace('T', ' ').slice(0, 16) : '',
      r.amount ?? 0,
      r.userName ?? '',
      r.note ?? '',
    ]);
    downloadCsv(`supplier-payments-${this.paymentsSupplier.name}-${stamp()}.csv`,
      ['Date', 'Amount', 'Recorded By', 'Note'], rows);
  }

  exportCsv() {
    const rows = this.rows.map(s => [s.name, s.phone ?? '', s.email ?? '', s.address ?? '', s.payable ?? 0, s.notes ?? '']);
    downloadCsv(`suppliers-${stamp()}.csv`, ['Name', 'Phone', 'Email', 'Address', 'Payable', 'Notes'], rows);
  }
}