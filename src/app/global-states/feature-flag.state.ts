import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { FeatureFlagService } from '../libs/feature-flag/usecase/feature-flag.service';

type State = {
    flags: Record<string, boolean>;
};

const initialState: State = {
    flags: {},
};

export const FeatureFlagState = signalStore(
    { providedIn: 'root' },
    withState<State>(initialState),
    withComputed(({ flags }) => ({
        /** 目撃の投稿を登録者だけにするか。キーが無ければ off */
        registeredOnlyPosting: () =>
            flags()['registered_only_posting'] === true,
    })),
    withMethods((store) => {
        const featureFlagService = inject(FeatureFlagService);

        return {
            /** 取れなかったときは状態を変えない（resolver を止めない。2026-10-23） */
            fetch(): Observable<void> {
                return featureFlagService.findAll().pipe(
                    tap((flags) => {
                        patchState(store, { flags });
                    }),
                    map(() => undefined),
                    catchError(() => of(undefined)),
                );
            },

            reset(): void {
                patchState(store, initialState);
            },
        };
    }),
    withAppDevtools('FeatureFlagState'),
);
