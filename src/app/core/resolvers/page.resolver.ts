import { inject, ProviderToken, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ResolveFn } from '@angular/router';
import { isObservable, Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { InitializeState } from 'src/app/global-states/initialize.state';

/**
 * ページのリゾルバー。データ本体は取得しない（取得はルートコンポーネントが行う）。
 * route.data の title・description で題名・説明・OGP を入れ、グローバルの初期化を待つ。
 * 設定を保存しているページは、そのストアの token を渡すと settingsReady（復元）も待つ。
 * 移行中は、永続化の Observable<boolean> も受ける。
 */
export function pageResolver(
    settings?:
        ProviderToken<{ settingsReady: Signal<boolean> }> | Observable<boolean>,
): ResolveFn<void> {
    return (route, state) => {
        inject(PageMeta).set({
            title: route.data.title,
            description: route.data.description,
            url: state.url,
        });
        const isInitialized$ = toObservable(
            inject(InitializeState).isInitialized,
        );
        // 旧 Observable は従来どおり素通し（サーバーの Elf は false を流して終わる）。
        // token は settingsReady が true になるのを待つ
        let settingsReady$: Observable<boolean>;
        if (settings === undefined) {
            settingsReady$ = of(true);
        } else if (isObservable(settings)) {
            settingsReady$ = settings;
        } else {
            settingsReady$ = toObservable(inject(settings).settingsReady).pipe(
                filter(Boolean),
                first(),
            );
        }

        return of(undefined).pipe(
            mergeMap(() => isInitialized$.pipe(filter(Boolean), first())),
            mergeMap(() => settingsReady$),
            map(() => undefined),
        );
    };
}
