import {
    HttpErrorResponse,
    type HttpEvent,
    type HttpHandler,
    type HttpInterceptor,
    type HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable, tap } from 'rxjs';
import { SsrResponse } from './ssr-response';

/**
 * サーバーで描く途中に API の取得が失敗したら、そのページを CDN に置かない（サーバーだけに登録する）。
 * 失敗したまま描いたページが 1 週間配られるのを防ぐ。次のリクエストで描き直す。
 */
@Injectable()
export class UpstreamErrorInterceptor implements HttpInterceptor {
    readonly #ssrResponse = inject(SsrResponse);

    intercept(
        req: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            tap({
                error: (error: unknown) => {
                    // 401 は AuthInterceptor がトークンを取り直して送り直す。送り直しの失敗はもう一度ここを通る
                    if (
                        error instanceof HttpErrorResponse &&
                        error.status === 401
                    ) {
                        return;
                    }
                    this.#ssrResponse.setCachePolicy('no-store');
                },
            }),
        );
    }
}
