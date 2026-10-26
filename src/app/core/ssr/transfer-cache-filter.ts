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
 * `cache` が reload・no-store・no-cache の要求は引き継がない。`includeNonCacheableRequests: true` にすると
 * Angular はこの指定を見なくなるが、列車情報を書いた後の 1 時間は時刻表系の GET が `cache: 'reload'` で
 * 取り直しを求める（ADR-0002）ので、CDN の古い HTML に積まれた応答で答えると書いた直後の画面が古いままになる。
 *
 * BFF（/api/ の認証・profile・maintenance）は利用者ごとの値を返すため、ここで外して積まない。
 */
export function isTransferableRequest(req: HttpRequest<unknown>): boolean {
    if (
        req.cache === 'reload' ||
        req.cache === 'no-store' ||
        req.cache === 'no-cache'
    ) {
        return false;
    }
    return req.url.startsWith(`${environment.apiUrl}/v3/`);
}
