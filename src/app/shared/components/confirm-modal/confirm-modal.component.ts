import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfirmService, ConfirmOptions } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
})
export class ConfirmModalComponent implements OnDestroy {
  options: ConfirmOptions | null = null;
  open = false;

  private sub: Subscription;

  constructor(private confirm: ConfirmService) {
    this.sub = this.confirm.state$.subscribe((state) => {
      if (state && state.open) {
        this.options = state.options;
        this.open = true;
      } else {
        this.open = false;
        this.options = null;
      }
    });
  }

  cancel() {
    this.confirm.close(false);
  }

  ok() {
    this.confirm.close(true);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}