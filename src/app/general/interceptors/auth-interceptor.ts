import {
    HttpEvent,
    HttpHandler,
    HttpHeaders,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { flatMap, take } from 'rxjs/operators';
import { TokenService } from 'src/app/core/token/token.service';
import { TokenState } from 'src/app/core/token/token.store';
import { environment } from 'src/environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private readonly tokenService: TokenService) {}

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        return this.tokenService.getToken().pipe(
            take(1),
            flatMap((token) => {
                const req = request.clone({
                    url: request.url,
                    headers: token.accessToken
                        ? request.headers
                              .set(
                                  'Authorization',
                                  `${token.tokenType} ${token.accessToken}`
                              )
                              .set('X-APP-CLIENT-ID', environment.clientId)
                        : request.headers,
                });

                return next.handle(req);
            })
        );
    }
}
