import { inject, Injector, ProviderToken, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ResolveFn } from '@angular/router';
import { defer, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { InitializeState } from 'src/app/global-states/initialize.state';

/**
 * ページのリゾルバー。データ本体は取得しない（取得はルートコンポーネントが行う）。
 * route.data の title・description で題名・説明・OGP を入れ、グローバルの初期化を待つ。
 * 設定を保存しているページは、そのストアの token を渡すと settingsReady（復元）も待つ。
 */
export function pageResolver(
    settings?: ProviderToken<{ settingsReady: Signal<boolean> }>,
): ResolveFn<void> {
    return (route, state) => {
        inject(PageMeta).set({
            title: route.data.title,
            description: route.data.description,
            url: state.url,
        });
        const injector = inject(Injector);
        const isInitialized = inject(InitializeState).isInitialized;
        // token は settingsReady が true になるのを待つ
        const settingsReady =
            settings === undefined ? undefined : inject(settings).settingsReady;

        return of(undefined).pipe(
            mergeMap(() => whenTrue(isInitialized, injector)),
            mergeMap(() =>
                settingsReady === undefined
                    ? of(true)
                    : whenTrue(settingsReady, injector),
            ),
            map(() => undefined),
        );
    };
}

/**
 * signal が true になるのを待つ。すでに true なら toObservable を作らず同期で出す
 * （toObservable は購読をやめても残る effect を作るため、遷移のたびに作らない）。
 */
function whenTrue(
    source: Signal<boolean>,
    injector: Injector,
): Observable<boolean> {
    return defer(() =>
        source()
            ? of(true)
            : toObservable(source, { injector }).pipe(filter(Boolean), first()),
    );
}
