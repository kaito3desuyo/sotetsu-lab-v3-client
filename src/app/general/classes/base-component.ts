import { OnDestroy, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export class BaseComponent implements OnDestroy {
  subscriptions: Subscription[];

  protected notification: NotificationService;

  constructor(private injector: Injector) {
    this.subscriptions = [];

    this.notification = this.injector.get(NotificationService);
  }

  set subscription(sub: Subscription) {
    this.subscriptions.push(sub);
  }

  ngOnDestroy(): void {
    if (this.subscriptions && this.subscriptions.length) {
      this.subscriptions.forEach(sub => {
        sub.unsubscribe();
      });
    }
  }
}
