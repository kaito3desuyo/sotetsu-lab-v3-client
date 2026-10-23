import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { UserDetailsDto } from '../libs/user/usecase/dtos/user-details.dto';
import { UserService } from '../libs/user/usecase/user.service';

type State = UserDetailsDto;

/** 時刻表（列車情報）を書ける役割。API の trip-blocks 書き込みと同じ（editor / manager） */
function canEditTimetable(role: string | null): boolean {
    return role === 'editor' || role === 'manager';
}

const state = createStore(
    { name: 'User' },
    withProps<State>({
        userId: null,
        username: null,
        displayName: null,
        role: null,
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
    /** 時刻表の入力・編集ができるか。画面側の出し分けはすべてこれで判定する */
    readonly canEditTimetable$ = state.pipe(
        select((state) => canEditTimetable(state.role)),
    );

    get userId(): string | null {
        return state.getValue().userId;
    }

    get canEditTimetable(): boolean {
        return canEditTimetable(state.getValue().role);
    }
}
