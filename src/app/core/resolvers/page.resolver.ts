import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';

/**
 * ページのリゾルバー。データ本体は取得しない（取得はルートコンポーネントが行う）。
 * route.data.title でタイトルを付け、グローバルの初期化を待つ。
 * ストアを永続化しているページは、その persistInitialized$ を渡すと復元も待つ。
 */
export function pageResolver(
    persistInitialized$?: Observable<boolean>,
): ResolveFn<void> {
    return (route) => {
        const initializeStateQuery = inject(InitializeStateQuery);
        inject(TitleService).setTitle(route.data.title);

        return of(undefined).pipe(
            mergeMap(() =>
                initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() => persistInitialized$ ?? of(true)),
            map(() => undefined),
        );
    };
}
