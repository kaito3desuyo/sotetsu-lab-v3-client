import {
    HttpContext,
    HttpContextToken,
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, mergeMap, shareReplay } from 'rxjs/operators';
import { TokenState } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';

/**
 * AuthInterceptor がトークンを取り直して送り直した要求の印。
 * サーバーでは UpstreamErrorInterceptor が、1 回目の 401 は無視し、送り直しの 401 は失敗として扱う。
 */
export const AUTH_RETRIED = new HttpContextToken<boolean>(() => false);

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    readonly #tokenState = inject(TokenState);
    /** 取り直しの最中なら、その取り直し。同時に 401 になった要求はこれを待つ */
    #refreshing$: Observable<void> | null = null;

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler,
    ): Observable<HttpEvent<any>> {
        if (this.#tokenState.isExpired()) {
            return of(undefined).pipe(
                mergeMap(() => this.#tokenState.fetch()),
                mergeMap(() => this.#handleRequestWithRetry(request, next)),
            );
        }

        return of(undefined).pipe(
            mergeMap(() => this.#handleRequestWithRetry(request, next)),
        );
    }

    /**
     * v3 API が 401 を返したら、トークンを取り直して 1 回だけやり直す。
     * 期限切れの判定は端末の時計に頼るので、時計がずれた端末や Google の描画（古い応答と時刻を使い回す）では
     * 期限切れのトークンを送ってしまう。BFF（/api）の 401 はゲストの profile で正常に起きるのでやり直さない。
     */
    #handleRequestWithRetry(
        request: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        return this.#handleRequest(request, next).pipe(
            catchError((error: unknown) => {
                if (
                    !(error instanceof HttpErrorResponse) ||
                    error.status !== 401 ||
                    !request.url.startsWith(environment.apiUrl)
                ) {
                    return throwError(() => error);
                }
                return this.#refreshToken().pipe(
                    mergeMap(() => this.#handleRequest(request, next, true)),
                );
            }),
        );
    }

    #refreshToken(): Observable<void> {
        this.#refreshing$ ??= this.#tokenState
            .fetch({ bypassHttpCache: true })
            .pipe(
                finalize(() => (this.#refreshing$ = null)),
                shareReplay({ bufferSize: 1, refCount: false }),
            );
        return this.#refreshing$;
    }

    #handleRequest(
        request: HttpRequest<unknown>,
        next: HttpHandler,
        retried = false,
    ): Observable<HttpEvent<unknown>> {
        const accessToken = this.#tokenState.accessToken();
        const tokenType = this.#tokenState.tokenType();

        const req = request.clone({
            url: request.url,
            // 元の要求の context は書き換えない（再購読した 1 回目に印が残らないよう写して付ける）
            context: retried ? this.#markRetried(request.context) : undefined,
            headers: accessToken
                ? request.headers.set(
                      'x-sotetsu-lab-authorization',
                      `${tokenType} ${accessToken}`,
                  )
                : request.headers,
        });

        return next.handle(req);
    }

    #markRetried(source: HttpContext): HttpContext {
        const context = new HttpContext();
        for (const token of source.keys()) {
            context.set(token, source.get(token));
        }
        return context.set(AUTH_RETRIED, true);
    }
}
