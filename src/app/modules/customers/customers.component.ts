import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

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
        this.toast.error('Failed to load suppliers');
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
}