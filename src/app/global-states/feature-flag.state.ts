import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { FeatureFlagService } from '../libs/feature-flag/usecase/feature-flag.service';

type State = {
    flags: Record<string, boolean>;
};

const state = createStore(
    { name: 'FeatureFlag' },
    withProps<State>({
        flags: {},
    }),
);

@Injectable({ providedIn: 'root' })
export class FeatureFlagStateStore {
    readonly #featureFlagService = inject(FeatureFlagService);

    /** 取れなかったときは状態を変えない（resolver を止めない。2026-10-23） */
    fetch(): Observable<void> {
        return this.#featureFlagService.findAll().pipe(
            tap((flags) => {
                state.update(setProps({ flags }));
            }),
            map(() => undefined),
            catchError(() => of(undefined)),
        );
    }

    reset(): void {
        state.reset();
    }
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagStateQuery {
    /** 目撃の投稿を登録者だけにするか。キーが無ければ off */
    readonly registeredOnlyPosting$ = state.pipe(
        select((state) => state.flags['registered_only_posting'] === true),
    );
}
