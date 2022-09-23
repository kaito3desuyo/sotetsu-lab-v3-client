import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Query, Store, StoreConfig } from '@datorama/akita';
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

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'Token' })
export class TokenStateStore extends Store<State> {
    private readonly _http = new HttpClient(this.handler);

    constructor(private readonly handler: HttpBackend) {
        super({ accessToken: null, expiresAt: null, tokenType: null });
    }

    fetch(): Observable<void> {
        if (!!this.getValue().isFetching) {
            return of(undefined);
        }

        return of(undefined).pipe(
            tap(() => {
                this.update({
                    isFetching: true,
                });
            }),
            mergeMap(() => this._http.get(environment.backendUrl + '/token')),
            tap((v) => {
                this.update({
                    ...v,
                    isFetching: false,
                });
            }),
            map(() => undefined)
        );
    }
}

@Injectable({ providedIn: 'root' })
export class TokenStateQuery extends Query<State> {
    get accessToken(): string {
        return this.getValue().accessToken;
    }

    get tokenType(): string {
        return this.getValue().tokenType;
    }

    get isExpired(): boolean {
        return this.getValue().expiresAt < dayjs().subtract(1, 'minute').unix();
    }

    constructor(protected store: TokenStateStore) {
        super(store);
    }
}
