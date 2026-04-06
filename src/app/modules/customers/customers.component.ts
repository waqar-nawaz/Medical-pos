import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {
  @ViewChild('supplierDialog') supplierDialog!: TemplateRef<any>;

  rows: any[] = [];
  editing: any = null;
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private dialog: MatDialog
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
      error: (err) => {
        this.toast.error('Failed to load suppliers');
      }
    });
  }

  openModal(customer?: any) {
    this.editing = customer ?? null;

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

    this.dialog.open(this.supplierDialog, { width: '600px', maxWidth: '95vw' });
  }

  save() {
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
        this.dialog.closeAll();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save customer');
      }
    });
  }

  remove(customer: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Customer',
        message: `Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        isDanger: true
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
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
    });
  }

  limitToOneDigit(event: any) {
    let value = event.target.value;
    if (value.length > 1) {
      event.target.value = value.slice(0, 1);
    }
  }
}
