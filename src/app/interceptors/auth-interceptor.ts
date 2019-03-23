import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // リクエストの変換処理。ここに共通処理を記述。
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const authReq = request.clone({
      url: 'http://localhost:8080',
      headers: request.headers.set('X-API-URL', request.url)
    });
    return next.handle(authReq);
  }
}
