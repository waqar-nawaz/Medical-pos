import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  loading = false;
  submitted = false;
  form: any;

  

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService) {
    this.form = this.fb.group({
    storeName: ['', [Validators.required, Validators.minLength(2)]],
    storePhone: [''],
    storeAddress: [''],
    receiptFooter: [''],
    gstEnabled: [true],
  });
  }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => {
      const s = r.data;
      this.form.patchValue({
        storeName: s.storeName,
        storePhone: s.storePhone,
        storeAddress: s.storeAddress,
        receiptFooter: s.receiptFooter,
        gstEnabled: !!s.gstEnabled,
      });
    });
  }

  save() {
    this.submitted = true;
    if (this.form.invalid || this.loading) {
      if (this.form.invalid) this.toast.warning('Please fill all required fields correctly');
      return;
    }
    this.loading = true;
    this.api.put<any>('/settings', this.form.value).subscribe({
      next: () => {
        this.submitted = false;
        this.toast.success('Settings saved');
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  downloadBackup() {
    this.loading = true;
    this.api.download('/settings/backup').subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical_pos_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.loading = false;
        this.toast.success('Backup downloaded');
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'Failed to download backup');
      },
    });
  }
}
