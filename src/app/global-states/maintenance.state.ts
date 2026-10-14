import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { map, Observable, tap } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';

type State = {
    isMaintenance: boolean;
    startAt?: number;
    endAt?: number;
};

const state = createStore(
    { name: 'maintenance' },
    withProps<State>({
        isMaintenance: false,
    }),
);

@Injectable({ providedIn: 'root' })
export class MaintenanceStateStore {
    readonly #handler = inject(HttpBackend);
    readonly #http = new HttpClient(this.#handler);
    readonly #cache = new QueryCache();

    /**
     * maxAgeMs を渡したとき（maintenanceGuard）だけ、届いてからその間は使い回す。
     * 渡さなければ必ず取りに行く。
     */
    fetch(options?: { maxAgeMs?: number }): Observable<void> {
        const { maxAgeMs } = options ?? {};

        return this.#cache
            .get({
                name: 'fetch',
                params: {},
                fetch: () =>
                    this.#http.get<State>(
                        environment.backendUrl + '/maintenance',
                    ),
                forceReload: maxAgeMs === undefined,
                maxAgeMs,
            })
            .pipe(
                tap((v) => {
                    state.update(setProps(v));
                }),
                map(() => undefined),
            );
    }
}

@Injectable({ providedIn: 'root' })
export class MaintenanceStateQuery {
    readonly isMaintenance$ = state.pipe(
        select((state) => state.isMaintenance),
    );
    readonly startAt$ = state.pipe(select((state) => state.startAt));
    readonly endAt$ = state.pipe(select((state) => state.endAt));

    get isMaintenance(): boolean {
        const { isMaintenance } = state.getValue();
        return isMaintenance;
    }

    get startAt(): number {
        const { startAt } = state.getValue();
        return startAt;
    }

    get endAt(): number {
        const { endAt } = state.getValue();
        return endAt;
    }
}
