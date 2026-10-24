import { Injectable, inject } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class GoogleAnalyticsService {
    readonly #logger = inject(NGXLogger);

    constructor() {
        this.#logger.log('GoogleAnalyticsService: Constructor', this._useGA());
    }

    /**
     * GAの使用可否をチェック
     */
    private _useGA(): boolean {
        // gtag は index.html のスクリプトが定める。サーバーには無い
        return typeof gtag !== 'undefined' && !!environment.production;
    }

    /**
     * ページトラッキング
     * @param path URLのパス。スラッシュで始まる必要がある。
     */
    sendPageView(title: string, path: string): void {
        if (!this._useGA()) {
            return;
        }

        if (!path.startsWith('/')) {
            path = `/${path}`;
        }

        this.#logger.log('GoogleAnalyticsService: Send page view =>', path);

        gtag('event', 'page_view', {
            page_title: title,
            page_location: location.href,
            page_path: path,
        });
    }

    /**
     * イベントの送信。値をレポートで見るには、GA 側に同じ名前の
     * イベントスコープのカスタムディメンションが要る
     */
    sendEvent(name: string, params?: Record<string, string | number>): void {
        if (!this._useGA()) {
            return;
        }

        gtag('event', name, params);
    }

    /**
     * 編集する人と見るだけの人を分けて集計するためのユーザープロパティ
     * （GA 側にユーザースコープのカスタムディメンション logged_in・user_role が要る）
     */
    setUserProperties({
        loggedIn,
        role,
    }: {
        loggedIn: boolean;
        role: string | null;
    }): void {
        if (!this._useGA()) {
            return;
        }

        gtag('set', 'user_properties', {
            logged_in: String(loggedIn),
            user_role: role ?? 'guest',
        });
    }
}
