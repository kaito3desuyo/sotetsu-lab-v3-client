import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

async function convertToDigest<T>(body: T): Promise<string> {
    const bodyEncoded = new TextEncoder().encode(JSON.stringify(body));
    const hashBuffer = await crypto.subtle.digest('SHA-256', bodyEncoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

@Injectable()
export class PayloadHashInterceptor implements HttpInterceptor {
    intercept(
        req: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        if (req.body) {
            return from(convertToDigest(req.body)).pipe(
                mergeMap((digest) =>
                    next.handle(
                        req.clone({
                            setHeaders: {
                                'x-amz-content-sha256': digest,
                            },
                        })
                    )
                )
            );
        }

        return next.handle(req);
    }
}
