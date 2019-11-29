import { OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

export class BaseService implements OnDestroy {
    subscriptions: Subscription[] = [];

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
