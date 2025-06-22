import { inject, Injectable } from '@angular/core';
import { createStore, setProps, withProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { AuthService } from '../libs/auth/usecase/auth.service';
import { TokenDetailsDto } from '../libs/auth/usecase/dtos/token-details.dto';

type State = TokenDetailsDto;

const state = createStore(
    { name: 'Token' },
    withProps<State>({
        accessToken: null,
        tokenType: null,
        expiresAt: null,
    }),
);

@Injectable({ providedIn: 'root' })
export class TokenStateStore {
    readonly #authService = inject(AuthService);

    fetch(): Observable<void> {
        return of(undefined).pipe(
            mergeMap(() => this.#authService.getToken()),
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
        return !!expiresAt && dayjs().add(1, 'minute').unix() > expiresAt;
    }
}
