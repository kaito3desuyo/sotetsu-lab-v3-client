import { OnDestroy, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export class BaseComponent implements OnDestroy {
  subscriptions: Subscription;

  protected notification: NotificationService;

  constructor(private injector: Injector) {
    this.subscriptions = new Subscription();

    this.notification = this.injector.get(NotificationService);
  }

  set subscription(sub: Subscription) {
    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
