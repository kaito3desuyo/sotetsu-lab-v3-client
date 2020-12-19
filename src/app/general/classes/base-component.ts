import { OnDestroy, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../services/notification.service';

// TODO: Add Angular decorator.
export class BaseComponent implements OnDestroy {
    private _subscription: Subscription;

    protected notification: NotificationService;

    constructor(private injector: Injector) {
        this._subscription = new Subscription();

        this.notification = this.injector.get(NotificationService);
    }

    set subscription(sub: Subscription) {
        this._subscription.add(sub);
    }

    ngOnDestroy(): void {
        if (this._subscription) {
            this._subscription.unsubscribe();
        }
    }
}
