import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

const state = signal<boolean>(false);

@Injectable({ providedIn: 'root' })
export class InitializeStateStore {
    markInitialized(): void {
        state.set(true);
    }
}

@Injectable({ providedIn: 'root' })
export class InitializeStateQuery {
    readonly isInitialized$ = toObservable(state);
}
