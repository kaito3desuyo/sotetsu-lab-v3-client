import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { UserDetailsDto } from '../libs/user/usecase/dtos/user-details.dto';
import { UserService } from '../libs/user/usecase/user.service';

type State = UserDetailsDto;

const state = createStore(
    { name: 'User' },
    withProps<State>({
        userId: null,
        username: null,
        displayName: null,
        role: null,
        createdAt: null,
        updatedAt: null,
    }),
);

@Injectable({ providedIn: 'root' })
export class UserStateStore {
    readonly #userService = inject(UserService);

    fetch(options?: { maxAgeMs?: number }): Observable<void> {
        return this.#userService.getProfile(options).pipe(
            tap((user) => {
                if (user) {
                    state.update(setProps(user));
                } else {
                    state.reset();
                }
            }),
            map(() => undefined),
            catchError(() => {
                state.reset();
                return of(undefined);
            }),
        );
    }

    reset(): void {
        state.reset();
    }
}

@Injectable({ providedIn: 'root' })
export class UserStateQuery {
    readonly isLoggedIn$ = state.pipe(select((state) => !!state.userId));
    readonly displayName$ = state.pipe(select((state) => state.displayName));
    readonly role$ = state.pipe(select((state) => state.role));

    get userId(): string | null {
        return state.getValue().userId;
    }
}
