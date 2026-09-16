import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {
  rows: any[] = [];
  editing: any = null;
  modalOpen = false;
  form: any;

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
}