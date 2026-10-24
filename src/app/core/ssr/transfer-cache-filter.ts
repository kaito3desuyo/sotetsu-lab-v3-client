import { HttpRequest } from '@angular/common/http';
import { environment } from 'src/environments/environment';

/**
 * サーバーで取った応答をブラウザへ引き継ぐ（HttpTransferCache）対象かを返す。
 *
 * API の v3 の GET は CloudFront で共有しないために `Cache-Control: private` を返す。
 * Angular は既定で private / no-store / no-cache の応答を積まないが、この private は共有を避けるための指定で、
 * 同じ中身は HTML にすでに描かれている。引き継いでも新たに漏れるものは無いので、
 * `includeNonCacheableRequests: true` と組み合わせてこの関数で /v3/ だけに絞る。
 *
 * BFF（/api/ の認証・profile・maintenance）は利用者ごとの値を返すため、ここで外して積まない。
 */
export function isTransferableRequest(req: HttpRequest<unknown>): boolean {
    return req.url.startsWith(`${environment.apiUrl}/v3/`);
}
