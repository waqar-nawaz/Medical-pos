import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type User = { id: number; email: string; name: string; role: 'admin' | 'cashier'; permissions: string[] | null };

export const ALL_PERMISSIONS = [
  'dashboard',
  'pos',
  'products',
  'sales',
  'suppliers',
  'customers',
  'purchase-orders',
  'reports',
  'settings',
  'users',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

declare global {
  interface Window {
    medpos?: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      printReceipt: (html: string, options?: any) => Promise<{success: boolean; failureReason?: string | null}>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'medpos_token';
  private userKey = 'medpos_user';

  private _user$ = new BehaviorSubject<User | null>(this.readUser());
  user$ = this._user$.asObservable();

  private _isLoggedIn$ = new BehaviorSubject<boolean>(this.isTokenValid());
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  version = '1.0.0';

  constructor() {
    this.loadVersion();
  }

  private async loadVersion() {
    try {
      const v = await window.medpos?.getVersion?.();
      if (v) this.version = v;
    } catch {}
  }

  private isTokenValid(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  get token(): string | null {
    if (!this.isTokenValid()) return null;
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token: string, user: User) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this._user$.next(user);
    this._isLoggedIn$.next(true);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._user$.next(null);
    this._isLoggedIn$.next(false);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  }

  hasRole(...roles: User['role'][]) {
    return this.user$.pipe(map(u => !!u && roles.includes(u.role)));
  }

  isAdmin(): boolean {
    return this._user$.getValue()?.role === 'admin';
  }

  hasPermission(perm: Permission): boolean {
    const u = this._user$.getValue();
    if (!u) return false;
    if (u.role === 'admin') return true;
    return Array.isArray(u.permissions) && u.permissions.includes(perm);
  }

  canAccess$ = (perm: Permission) => this.user$.pipe(map(u => !!u && (u.role === 'admin' || (Array.isArray(u.permissions) && u.permissions.includes(perm)))));
}
