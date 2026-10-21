import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FetchError } from '../classes/custom-error';

/**
 * HttpClient の失敗を FetchError に直す係。
 * 一番外側に置く（app.config.ts で先頭に登録する）。内側の AuthInterceptor は
 * HttpErrorResponse の 401 を見てトークンを取り直すので、それが済んでから直す
 */
@Injectable()
export class FetchErrorInterceptor implements HttpInterceptor {
    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: unknown) =>
                throwError(() =>
                    error instanceof HttpErrorResponse
                        ? FetchError.fromHttpErrorResponse(error)
                        : error,
                ),
            ),
        );
    }
}
