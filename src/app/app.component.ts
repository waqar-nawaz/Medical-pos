import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, Permission } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ConfirmService } from './core/services/confirm.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  sidebarCollapsed = false;
  menuOpen = false;

  constructor(public auth: AuthService, private router: Router, public theme: ThemeService, private confirm: ConfirmService) {
    auth.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleTheme() {
    this.theme.toggle();
  }

  canAccess(perm: Permission): boolean {
    return this.auth.hasPermission(perm);
  }

  async logout() {
    const ok = await this.confirm.confirm({
      title: 'Log out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log out',
      isDanger: true,
    });
    if (ok) {
      this.auth.logout();
      this.router.navigate(['/auth/login']);
    }
  }
}