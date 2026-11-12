import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

async function convertToDigest<T>(body: T): Promise<string> {
    const bodyEncoded = new TextEncoder().encode(JSON.stringify(body));
    const hashBuffer = await crypto.subtle.digest('SHA-256', bodyEncoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

/**
 * api は Lambda の Function URL を CloudFront の OAC で署名して呼ぶので、本文のある要求には
 * 本文の SHA-256 が要る。backend（API Gateway）には要らず、付けるとログイン・登録の本文の
 * ハッシュが backend のログに残るので、api の URL だけに付ける。
 */
@Injectable()
export class PayloadHashInterceptor implements HttpInterceptor {
    intercept(
        req: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        if (req.body && req.url.startsWith(`${environment.apiUrl}/`)) {
            return from(convertToDigest(req.body)).pipe(
                mergeMap((digest) =>
                    next.handle(
                        req.clone({
                            setHeaders: {
                                'x-amz-content-sha256': digest,
                            },
                        }),
                    ),
                ),
            );
        }

        return next.handle(req);
    }
}
