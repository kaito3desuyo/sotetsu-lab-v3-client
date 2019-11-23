import { Injectable } from "@angular/core";
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest
} from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";
import { LoggerService } from "../services/logger.service";
/* 
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // リクエストの変換処理。ここに共通処理を記述。
  constructor(private logger: LoggerService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const authReq = request.clone({
      url: environment.backendUrl, // https://backend.sotetsu-lab.com/
      headers: request.headers.set('X-API-URL', request.url),
      params: request.params.append('url', request.url)
    });
    this.logger.debug('リクエスト：' + request.url);
    return next.handle(authReq);
  }
}
*/
