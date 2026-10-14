import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TokenDetailsDto } from '../../usecase/dtos/token-details.dto';

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
     */
    getToken(options?: { maxAgeMs?: number }): Observable<TokenDetailsDto> {
        const { maxAgeMs } = options ?? {};

        return this.#cache.get({
            name: 'getToken',
            params: {},
            fetch: () =>
                this.#http.get<TokenDetailsDto>(`${this.#baseUrl}/token`),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }
}
