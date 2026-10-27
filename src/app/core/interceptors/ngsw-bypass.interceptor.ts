import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * 書き込み後の 1 時間（`QueryInvalidator.requestCache` が `'reload'` を返す取得）を
 * Service Worker に素通しさせる係（ADR-0002・ADR-0015）。
 * worker は `cache: 'reload'` を守らず、保存した応答を返しうる。`ngsw-bypass` ヘッダーがあれば
 * worker は何もせずネットワークへ送る。`'reload'` を使うのは requestCache だけなので、
 * 取得側（query）を変えずここでまとめて付ける。データの API（/v3/）だけに付ける（同じ要求に
 * 余計なヘッダーを付けると別オリジンでは preflight が増える）。
 */
@Injectable()
export class NgswBypassInterceptor implements HttpInterceptor {
    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        if (
            request.cache === 'reload' &&
            request.url.startsWith(`${environment.apiUrl}/v3/`)
        ) {
            return next.handle(
                request.clone({ setHeaders: { 'ngsw-bypass': 'true' } }),
            );
        }
        return next.handle(request);
    }
}
