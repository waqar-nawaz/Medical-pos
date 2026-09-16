import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
  open: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private state: ConfirmState | null = null;
  private stateSubject = new Subject<ConfirmState | null>();

  readonly state$ = this.stateSubject.asObservable();

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.state = { options, resolve, open: true };
      this.stateSubject.next(this.state);
    });
  }

  close(result: boolean) {
    if (this.state) {
      this.state.resolve(result);
      this.state.open = false;
      this.state = null;
    }
    this.stateSubject.next(null);
  }
}