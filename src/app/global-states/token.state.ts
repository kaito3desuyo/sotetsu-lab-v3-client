import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { createStore, setProps, withProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

type State = {
    accessToken: string;
    expiresAt: number;
    tokenType: string;
    isFetching: boolean;
};

const state = createStore(
    { name: 'Token' },
    withProps<State>({
        accessToken: null,
        expiresAt: null,
        tokenType: null,
        isFetching: false,
    }),
);

@Injectable({ providedIn: 'root' })
export class TokenStateStore {
    readonly #http = inject(HttpClient);

    fetch(): Observable<void> {
        if (!!state.getValue().isFetching) {
            return of(undefined);
        }

        return of(undefined).pipe(
            tap(() => {
                state.update(
                    setProps((state) => ({
                        ...state,
                        isFetching: true,
                    })),
                );
            }),
            mergeMap(() =>
                this.#http.get<State>(environment.backendUrl + '/token'),
            ),
            tap((v) => {
                state.update(
                    setProps({
                        ...v,
                        isFetching: false,
                    }),
                );
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class TokenStateQuery {
    get accessToken(): string {
        const { accessToken } = state.getValue();
        return accessToken;
    }

    get tokenType(): string {
        const { tokenType } = state.getValue();
        return tokenType;
    }

    get isExpired(): boolean {
        const { expiresAt } = state.getValue();
        return expiresAt < dayjs().subtract(1, 'minute').unix();
    }
}
