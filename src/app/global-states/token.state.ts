import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { addMinutes, getUnixTime } from 'date-fns';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { AuthService } from '../libs/auth/usecase/auth.service';
import { TokenDetailsDto } from '../libs/auth/usecase/dtos/token-details.dto';

type State = TokenDetailsDto;

const EMPTY_TOKEN: State = {
    accessToken: null,
    tokenType: null,
    expiresAt: null,
};

const state = createStore({ name: 'Token' }, withProps<State>(EMPTY_TOKEN));

@Injectable({ providedIn: 'root' })
export class TokenStateStore {
    readonly #authService = inject(AuthService);

    /**
     * 取れなければ（backend の 503 など）トークン無しにして止めない。起動時に投げると画面ごと出なくなる。
     * API はトークン無しを 401 にするので、interceptor がそこで 1 回取り直す。
     */
    fetch(options?: {
        maxAgeMs?: number;
        bypassHttpCache?: boolean;
    }): Observable<void> {
        return of(undefined).pipe(
            mergeMap(() => this.#authService.getToken(options)),
            tap((v) => {
                state.update(setProps(v ?? EMPTY_TOKEN));
            }),
            map(() => undefined),
            catchError(() => {
                state.update(setProps(EMPTY_TOKEN));
                return of(undefined);
            }),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class TokenStateQuery {
    readonly accessToken$ = state.pipe(select((state) => state.accessToken));

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
        return (
            !!expiresAt && getUnixTime(addMinutes(new Date(), 1)) > expiresAt
        );
    }
}
