import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export const InitializeState = signalStore(
    { providedIn: 'root' },
    withState({ isInitialized: false }),
    withMethods((store) => ({
        markInitialized(): void {
            patchState(store, { isInitialized: true });
        },
    })),
);
