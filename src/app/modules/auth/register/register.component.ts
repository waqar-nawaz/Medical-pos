import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  loading = false;
  submitted = false;
  showPassword = false;
  errorMsg = '';
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  submit() {
    this.submitted = true;
    this.errorMsg = '';
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/register', this.form.value).subscribe({
      next: () => {
        this.toast.success('Account created. You can sign in now.');
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.loading = false;
        const msg =
          err?.error?.message ||
          (err?.status === 0
            ? 'Cannot reach the server. Please try again.'
            : 'Registration failed. Please try again.');
        this.errorMsg = msg;
        this.toast.error(msg);
      },
      complete: () => (this.loading = false),
    });
  }
}