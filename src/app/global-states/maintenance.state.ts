import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { map, Observable, tap } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { withAppDevtools } from '../core/store-features/with-app-devtools';

type State = {
    isMaintenance: boolean;
    startAt?: number;
    endAt?: number;
};

// 省略できる項目も、state の signal を作るために undefined で置いておく
const initialState: State = {
    isMaintenance: false,
    startAt: undefined,
    endAt: undefined,
};

export const MaintenanceState = signalStore(
    { providedIn: 'root' },
    withState<State>(initialState),
    withMethods((store) => {
        const http = new HttpClient(inject(HttpBackend));
        const cache = new QueryCache();

        return {
            /**
             * maxAgeMs を渡したとき（maintenanceGuard）だけ、届いてからその間は使い回す。
             * 渡さなければ必ず取りに行く。
             */
            fetch(options?: { maxAgeMs?: number }): Observable<void> {
                const { maxAgeMs } = options ?? {};

                return cache
                    .get({
                        name: 'fetch',
                        params: {},
                        fetch: () =>
                            http.get<State>(
                                environment.backendUrl + '/maintenance',
                            ),
                        forceReload: maxAgeMs === undefined,
                        maxAgeMs,
                    })
                    .pipe(
                        tap((v) => {
                            patchState(store, v);
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('MaintenanceState'),
);
