import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loading = false;
  submitted = false;
  showPassword = false;
  errorMsg = '';
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      email: ['admin@local', [Validators.required, Validators.email]],
      password: ['Admin@123', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit() {
    this.submitted = true;
    this.errorMsg = '';
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/login', this.form.value).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, res.user);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg =
          err?.error?.message ||
          (err?.status === 0
            ? 'Cannot reach the server. Please try again.'
            : 'Invalid email or password');
        this.errorMsg = msg;
        this.toast.error(msg);
      },
      complete: () => (this.loading = false),
    });
  }
}