import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';

export interface PermissionItem {
  key: string;
  label: string;
  icon: string;
}

@Component({
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  q = '';
  rows: any[] = [];
  filteredRows: any[] = [];
  editing: any = null;
  editingPermissionUser: any = null;
  editingResetUser: any = null;
  newPassword = '';
  showUserPassword = false;
  showResetPassword = false;

  userModalOpen = false;
  permissionModalOpen = false;
  resetModalOpen = false;

  permissionItems: PermissionItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'pos', label: 'POS / New Bill', icon: '🧾' },
    { key: 'products', label: 'Inventory', icon: '📦' },
    { key: 'sales', label: 'Sales History', icon: '📋' },
    { key: 'suppliers', label: 'Suppliers', icon: '🚚' },
    { key: 'customers', label: 'Customers', icon: '👥' },
    { key: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' },
    { key: 'reports', label: 'Reports', icon: '📈' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
    { key: 'users', label: 'User Management', icon: '👤' },
  ];

  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private confirm: ConfirmService,
    public auth: AuthService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['cashier', Validators.required],
    });
  }

  ngOnInit() {
    this.load();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  load() {
    this.api.get<any>('/users').subscribe(r => {
      this.rows = r.data || [];
      this.applyFilter();
    });
  }

  applyFilter() {
    const q = this.q.trim().toLowerCase();
    this.filteredRows = this.rows.filter(r =>
      !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }

  roleLabel(role: string): string {
    return role === 'admin' ? 'Admin' : 'Cashier';
  }

  roleChip(role: string): string {
    return role === 'admin' ? 'chip-admin' : 'chip-cashier';
  }

  defaultPermissions(role: string): string[] {
    return role === 'admin'
      ? this.permissionItems.map(p => p.key)
      : ['dashboard', 'pos'];
  }

  permCount(user: any): string {
    if (user.role === 'admin') return 'All access';
    const perms = user.permissions || [];
    return perms.length === 0 ? 'None' : `${perms.length} of ${this.permissionItems.length}`;
  }

  isMe(user: any): boolean {
    const token = this.auth.token;
    if (!token) return false;
    try {
      return JSON.parse(atob(token.split('.')[1])).id === user.id;
    } catch {
      return false;
    }
  }

  openModal(row?: any) {
    this.editing = row ?? null;
    if (row) {
      this.form.patchValue({ name: row.name, email: row.email, password: '', role: row.role });
    } else {
      this.form.reset({ name: '', email: '', password: '', role: 'cashier' });
    }
    this.userModalOpen = true;
  }

  closeModal() {
    this.userModalOpen = false;
    this.editing = null;
  }

  save() {
    if (this.form.invalid) {
      this.toast.warning('Please fill all required fields correctly');
      return;
    }
    const body: any = {
      name: this.form.value.name,
      email: this.form.value.email,
      role: this.form.value.role,
      permissions: this.editing
        ? (this.editing.permissions || [])
        : this.defaultPermissions(this.form.value.role),
    };
    const req = this.editing
      ? this.api.put<any>(`/users/${this.editing.id}`, body)
      : this.api.post<any>('/users', { ...body, password: this.form.value.password });
    req.subscribe({
      next: () => {
        this.toast.success(this.editing ? 'User updated successfully' : 'User created successfully');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save user');
      }
    });
  }

  openPermissionModal(user: any) {
    if (user.role === 'admin') {
      this.toast.info('Admin users already have full access');
      return;
    }
    this.editingPermissionUser = user;
    this.permissionModalOpen = true;
  }

  closePermissionModal() {
    this.permissionModalOpen = false;
    this.editingPermissionUser = null;
  }

  hasPerm(perm: string): boolean {
    if (!this.editingPermissionUser) return false;
    return (this.editingPermissionUser.permissions || []).includes(perm);
  }

  togglePerm(perm: string) {
    if (!this.editingPermissionUser) return;
    const perms: string[] = this.editingPermissionUser.permissions || [];
    const idx = perms.indexOf(perm);
    if (idx >= 0) perms.splice(idx, 1);
    else perms.push(perm);
    this.editingPermissionUser.permissions = [...perms];
  }

  grantAll() {
    if (!this.editingPermissionUser) return;
    this.editingPermissionUser.permissions = [...this.permissionItems.map(p => p.key)];
  }

  clearAll() {
    if (!this.editingPermissionUser) return;
    this.editingPermissionUser.permissions = [];
  }

  savePermissions() {
    if (!this.editingPermissionUser) return;
    this.api.put<any>(`/users/${this.editingPermissionUser.id}`, {
      name: this.editingPermissionUser.name,
      email: this.editingPermissionUser.email,
      role: this.editingPermissionUser.role,
      permissions: this.editingPermissionUser.permissions || [],
    }).subscribe({
      next: () => {
        this.toast.success('Permissions updated successfully');
        this.closePermissionModal();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update permissions');
      }
    });
  }

  openResetModal(user: any) {
    this.editingResetUser = user;
    this.newPassword = '';
    this.resetModalOpen = true;
  }

  closeResetModal() {
    this.resetModalOpen = false;
    this.editingResetUser = null;
  }

  savePassword() {
    if (!this.editingResetUser) return;
    if (this.newPassword.length < 6) {
      this.toast.warning('Password must be at least 6 characters');
      return;
    }
    this.api.post<any>(`/users/${this.editingResetUser.id}/reset-password`, { password: this.newPassword }).subscribe({
      next: () => {
        this.toast.success('Password reset successfully');
        this.closeResetModal();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to reset password');
      }
    });
  }

  async remove(row: any) {
    if (!this.isAdmin) return;
    const confirmed = await this.confirm.confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete "${row.name}"? This action is permanent.`,
      confirmText: 'Delete',
      isDanger: true
    });

    if (confirmed) {
      this.api.delete<any>(`/users/${row.id}`).subscribe({
        next: () => {
          this.toast.success('User deleted successfully');
          this.load();
        },
        error: (err) => {
          this.toast.error(err?.error?.message || 'Failed to delete user');
        }
      });
    }
  }
}