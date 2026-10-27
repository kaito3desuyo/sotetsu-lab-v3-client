import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { addMinutes, getUnixTime } from 'date-fns';
import { Observable, of } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { AuthService } from '../libs/auth/usecase/auth.service';
import { TokenDetailsDto } from '../libs/auth/usecase/dtos/token-details.dto';

type State = TokenDetailsDto;

const EMPTY_TOKEN: State = {
    accessToken: null,
    tokenType: null,
    expiresAt: null,
};

export const TokenState = signalStore(
    { providedIn: 'root' },
    withState<State>(EMPTY_TOKEN),
    withComputed(({ expiresAt }) => ({
        isExpired: () => {
            const at = expiresAt();
            return !!at && getUnixTime(addMinutes(new Date(), 1)) > at;
        },
    })),
    withMethods((store) => {
        const authService = inject(AuthService);

        return {
            /**
             * 取れなければ（backend の 503 など）トークン無しにして止めない。起動時に投げると画面ごと出なくなる。
             * API はトークン無しを 401 にするので、interceptor がそこで 1 回取り直す。
             */
            fetch(options?: {
                maxAgeMs?: number;
                bypassHttpCache?: boolean;
            }): Observable<void> {
                return of(undefined).pipe(
                    mergeMap(() => authService.getToken(options)),
                    tap((v) => {
                        patchState(store, v ?? EMPTY_TOKEN);
                    }),
                    map(() => undefined),
                    catchError(() => {
                        patchState(store, EMPTY_TOKEN);
                        return of(undefined);
                    }),
                );
            },
        };
    }),
    withAppDevtools('TokenState'),
);
