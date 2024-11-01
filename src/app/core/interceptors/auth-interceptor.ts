import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
    TokenStateQuery,
    TokenStateStore,
} from 'src/app/global-states/token.state';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #tokenStateQuery = inject(TokenStateQuery);

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler,
    ): Observable<HttpEvent<any>> {
        if (this.#tokenStateQuery.isExpired) {
            return of(undefined).pipe(
                mergeMap(() => this.#tokenStateStore.fetch()),
                mergeMap(() => this.#handleRequest(request, next)),
            );
        }

        return of(undefined).pipe(
            mergeMap(() => this.#handleRequest(request, next)),
        );
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
