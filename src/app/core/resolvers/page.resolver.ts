import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';

/**
 * ページのリゾルバー。データ本体は取得しない（取得はルートコンポーネントが行う）。
 * route.data の title・description で題名・説明・OGP を入れ、グローバルの初期化を待つ。
 * ストアを永続化しているページは、その persistInitialized$ を渡すと復元も待つ。
 */
export function pageResolver(
    persistInitialized$?: Observable<boolean>,
): ResolveFn<void> {
    return (route, state) => {
        const initializeStateQuery = inject(InitializeStateQuery);
        inject(PageMeta).set({
            title: route.data.title,
            description: route.data.description,
            url: state.url,
        });

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
