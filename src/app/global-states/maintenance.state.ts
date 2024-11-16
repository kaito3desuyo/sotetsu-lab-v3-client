import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { map, Observable, tap } from 'rxjs';
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

    fetch(): Observable<void> {
        return this.#http
            .get<State>(environment.backendUrl + '/maintenance')
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
