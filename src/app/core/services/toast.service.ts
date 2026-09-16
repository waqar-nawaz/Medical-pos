import { Injectable, NgZone } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private root!: HTMLDivElement;
  private toasts = new Map<number, HTMLDivElement>();
  private counter = 0;

  constructor(private zone: NgZone) {
    this.ensureRoot();
  }

  private ensureRoot() {
    if (this.root) return;
    let el = document.getElementById('toast-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast-root';
      el.className = 'toast-root';
      document.body.appendChild(el);
    }
    this.root = el as HTMLDivElement;
  }

  private show(type: ToastType, message: string, duration: number) {
    this.zone.runOutsideAngular(() => {
      const id = ++this.counter;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span style="flex-shrink:0">${ICONS[type]}</span><span>${message}</span>`;
      this.root.appendChild(toast);
      this.toasts.set(id, toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
          toast.remove();
          this.toasts.delete(id);
        }, 300);
      }, duration);
    });
  }

  success(msg: string) { this.show('success', msg, 3500); }
  error(msg: string) { this.show('error', msg, 6000); }
  warning(msg: string) { this.show('warning', msg, 4500); }
  info(msg: string) { this.show('info', msg, 3500); }
}