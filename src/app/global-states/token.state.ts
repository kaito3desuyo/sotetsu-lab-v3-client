import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { createStore, setProps, withProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

type State = {
    accessToken: string;
    expiresAt: number;
    tokenType: string;
};

const state = createStore(
    { name: 'Token' },
    withProps<State>({
        accessToken: null,
        expiresAt: null,
        tokenType: null,
    }),
);

@Injectable({ providedIn: 'root' })
export class TokenStateStore {
    #http: HttpClient;

    constructor(handler: HttpBackend) {
        this.#http = new HttpClient(handler);
    }

    fetch(): Observable<void> {
        return of(undefined).pipe(
            mergeMap(() =>
                this.#http.get<State>(environment.backendUrl + '/token'),
            ),
            tap((v) => {
                state.update(setProps(v));
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
        return !!expiresAt && expiresAt < dayjs().subtract(1, 'minute').unix();
    }
}
