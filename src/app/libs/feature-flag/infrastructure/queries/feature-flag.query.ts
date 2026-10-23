import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';

/** API が約 60 秒覚えているので、画面を移るたびには取りに行かない（2026-10-23） */
const FEATURE_FLAG_MAX_AGE_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class FeatureFlagQuery {
    readonly #http = inject(HttpClient);

    readonly #v3ApiUrl = environment.apiUrl + '/v3/feature-flags';
    readonly #cache = new QueryCache();

    /** フラグ名 → on/off。キーが無いフラグは off として扱う（呼ぶ側で） */
    findAll(): Observable<Record<string, boolean>> {
        return this.#cache
            .get({
                name: 'findAll',
                params: {},
                fetch: () =>
                    this.#http.get<Record<string, boolean>>(this.#v3ApiUrl, {
                        observe: 'response',
                    }),
                maxAgeMs: FEATURE_FLAG_MAX_AGE_MS,
            })
            .pipe(map((res) => res.body ?? {}));
    }
}
