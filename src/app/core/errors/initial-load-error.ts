import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    NavigationError,
    RedirectCommand,
    ResolveFn,
    Router,
} from '@angular/router';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import { isChunkLoadError } from './chunk-load-error';
import { toErrorMessage } from './to-error-message';

/** 最初の読み込みに失敗したときに出す画面の path（app.route.ts） */
export const LOAD_ERROR_PATH = 'load-error';

/** 読み込めなかったページの題。読み込めなかった画面のヘッダーに同じ題を出す */
@Injectable({ providedIn: 'root' })
export class LoadErrorTitle {
    readonly title = signal('');
}

/** 読み込めなかった画面の route の data.title（ヘッダーは data.title を読む） */
export const loadErrorTitleResolver: ResolveFn<string> = () =>
    inject(LoadErrorTitle).title();

/**
 * 最初の読み込み（共通のデータの取得など）に失敗したとき、読み込めなかった画面に切り替える。
 * そのままだと router が URL を `/` に戻し、サーバーで描いた中身も消えて白い画面になる。
 * アドレス欄は開いた URL のまま（skipLocationChange）にし、読み込み直せば同じページを開き直せるようにする。
 *
 * 次の場合は何もしない（NavigationError のまま app.component が扱う）。
 * - サーバー: 読み込めなかった画面を返すと、CDN がそのページとして置いてしまう
 * - 2 回目からの移動: 前の画面が残っているので、通知だけでよい
 * - 部品の読み込みの失敗: 新しい版を読み込み直す
 */
export function initialLoadErrorHandler(
    ev: NavigationError,
): RedirectCommand | void {
    const router = inject(Router);
    if (
        !isPlatformBrowser(inject(PLATFORM_ID)) ||
        router.navigated ||
        isChunkLoadError(ev.error)
    ) {
        return;
    }

    // 画面を替えると NavigationError は流れないので、ここで送る
    inject(GoogleAnalyticsService).sendEvent('page_load_error', {
        error_message: toErrorMessage(ev.error),
    });
    inject(LoadErrorTitle).title.set(deepestTitle(ev.target?.root ?? null));

    return new RedirectCommand(router.parseUrl(`/${LOAD_ERROR_PATH}`), {
        skipLocationChange: true,
    });
}

/** layout.component の題の決め方と同じく、最も深い data.title */
function deepestTitle(snapshot: ActivatedRouteSnapshot | null): string {
    let title = '';
    while (snapshot) {
        const dataTitle: unknown = snapshot.data?.['title'];
        if (typeof dataTitle === 'string' && dataTitle) {
            title = dataTitle;
        }
        snapshot = snapshot.firstChild;
    }
    return title;
}
