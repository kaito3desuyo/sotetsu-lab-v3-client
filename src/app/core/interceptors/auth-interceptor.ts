import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, mergeMap, shareReplay } from 'rxjs/operators';
import {
    TokenStateQuery,
    TokenStateStore,
} from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #tokenStateQuery = inject(TokenStateQuery);
    /** 取り直しの最中なら、その取り直し。同時に 401 になった要求はこれを待つ */
    #refreshing$: Observable<void> | null = null;

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler,
    ): Observable<HttpEvent<any>> {
        if (this.#tokenStateQuery.isExpired) {
            return of(undefined).pipe(
                mergeMap(() => this.#tokenStateStore.fetch()),
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
                    mergeMap(() => this.#handleRequest(request, next)),
                );
            }),
        );
    }

    #refreshToken(): Observable<void> {
        this.#refreshing$ ??= this.#tokenStateStore
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
    ): Observable<HttpEvent<unknown>> {
        const accessToken = this.#tokenStateQuery.accessToken;
        const tokenType = this.#tokenStateQuery.tokenType;

        const req = request.clone({
            url: request.url,
            headers: accessToken
                ? request.headers.set(
                      'x-sotetsu-lab-authorization',
                      `${tokenType} ${accessToken}`,
                  )
                : request.headers,
        });

        return next.handle(req);
    }
}
