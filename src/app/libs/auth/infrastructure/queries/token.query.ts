import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TokenResult } from '../../usecase/dtos/token-details.dto';

@Injectable({ providedIn: 'root' })
export class TokenQuery {
    readonly #http: HttpClient;
    readonly #baseUrl = environment.backendUrl + '/auth';
    readonly #cache = new QueryCache();

    constructor() {
        const handler = inject(HttpBackend);

        this.#http = new HttpClient(handler);
    }

    /**
     * maxAgeMs を渡したとき（ガード・resolver）だけ、届いてからその間は使い回す。
     * 渡さなければ（ログイン・ログアウト・期限切れの取り直し）必ず取りに行き、取った値はキャッシュにも入れる。
     * bypassHttpCache を渡すと、URL に乱数を付けてブラウザ側に残った応答を使わせない
     * （Google の描画は Cache-Control を無視して古いトークンを返すことがある）。乱数は時計に頼らない。
     */
    getToken(options?: {
        maxAgeMs?: number;
        bypassHttpCache?: boolean;
    }): Observable<TokenResult> {
        const { maxAgeMs, bypassHttpCache } = options ?? {};
        const params = bypassHttpCache
            ? new HttpParams().set('r', Math.random().toString(36).slice(2))
            : undefined;

        return this.#cache.get({
            name: 'getToken',
            params: {},
            fetch: () =>
                this.#http.get<TokenResult>(`${this.#baseUrl}/token`, {
                    params,
                }),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }
}
