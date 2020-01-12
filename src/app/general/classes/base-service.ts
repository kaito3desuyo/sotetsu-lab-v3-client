import { OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

export class BaseService implements OnDestroy {
    private _subscription: Subscription = new Subscription();

    get subscription(): Subscription {
        return this._subscription;
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
