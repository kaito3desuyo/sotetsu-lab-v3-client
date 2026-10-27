import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { UserDetailsDto } from '../libs/user/usecase/dtos/user-details.dto';
import { UserService } from '../libs/user/usecase/user.service';

type State = UserDetailsDto;

const initialState: State = {
    userId: null,
    username: null,
    displayName: null,
    role: null,
};

/** 時刻表（列車情報）を書ける役割。API の trip-blocks 書き込みと同じ（editor / manager） */
function canEditTimetable(role: string | null): boolean {
    return role === 'editor' || role === 'manager';
}

export const UserState = signalStore(
    { providedIn: 'root' },
    withState<State>(initialState),
    withComputed(({ userId, role }) => ({
        isLoggedIn: () => !!userId(),
        /** 時刻表の入力・編集ができるか。画面側の出し分けはすべてこれで判定する */
        canEditTimetable: () => canEditTimetable(role()),
    })),
    withMethods((store) => {
        const userService = inject(UserService);
        const reset = (): void => {
            patchState(store, initialState);
        };

        return {
            fetch(options?: { maxAgeMs?: number }): Observable<void> {
                return userService.getProfile(options).pipe(
                    tap((user) => {
                        if (user) {
                            patchState(store, user);
                        } else {
                            reset();
                        }
                    }),
                    map(() => undefined),
                    catchError(() => {
                        reset();
                        return of(undefined);
                    }),
                );
            },

            reset,
        };
    }),
    withAppDevtools('UserState'),
);
