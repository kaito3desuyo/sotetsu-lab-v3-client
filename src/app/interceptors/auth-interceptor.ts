import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // リクエストの変換処理。ここに共通処理を記述。
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const authReq = request.clone({
      url: environment.backendUrl, // https://backend.sotetsu-lab.com/
      headers: request.headers.set('X-API-URL', request.url),
      params: {...request.params, url: request.url}
    });
    return next.handle(authReq).pipe(tap(res => {console.log(res)}));
  }
}
