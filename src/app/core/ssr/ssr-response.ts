import { inject, Injectable, RESPONSE_INIT } from '@angular/core';
import {
    CACHE_CONTROL,
    CACHE_TAG_HEADER,
    MAX_CACHE_TAGS,
    type CachePolicy,
} from './cache-control';

const POLICY_RANK: Record<CachePolicy, number> = {
    long: 0,
    short: 1,
    'no-store': 2,
};

/**
 * サーバーで描くページの応答ヘッダー（CDN に置く長さとキャッシュタグ）を書く係。
 * ページの既定の長さは app.routes.server.ts の headers にあり、ページはここで短くしたりタグを足したりする。
 * ブラウザでは RESPONSE_INIT が無いので何もしない。
 */
@Injectable({ providedIn: 'root' })
export class SsrResponse {
    readonly #init = inject(RESPONSE_INIT, { optional: true });
    /** 今の長さ。始まりはルートの既定（headers の Cache-Control）。ページはこれより長くできない */
    #policy: CachePolicy | null = this.#routeDefaultPolicy();
    readonly #tags = new Set<string>();

    /** 置く長さを決める。短いほう（no-store が最も短い）を優先し、一度短くしたら長く戻さない */
    setCachePolicy(policy: CachePolicy): void {
        if (!this.#init) return;
        if (this.#policy && POLICY_RANK[this.#policy] >= POLICY_RANK[policy]) {
            return;
        }
        this.#policy = policy;
        this.#headers().set('Cache-Control', CACHE_CONTROL[policy]);
    }

    /** 失効に使うタグを足す。上限を超えたら、タグでは消しきれないので外して短く置く */
    addCacheTags(tags: readonly string[]): void {
        if (!this.#init) return;
        for (const tag of tags) {
            this.#tags.add(tag.toLowerCase());
        }
        if (this.#tags.size > MAX_CACHE_TAGS) {
            this.#headers().delete(CACHE_TAG_HEADER);
            this.setCachePolicy('short');
            return;
        }
        this.#headers().set(CACHE_TAG_HEADER, [...this.#tags].join(','));
    }

    #routeDefaultPolicy(): CachePolicy | null {
        if (!this.#init?.headers) return null;
        const value = new Headers(this.#init.headers).get('Cache-Control');
        const policies = Object.keys(CACHE_CONTROL) as CachePolicy[];
        return (
            policies.find((policy) => CACHE_CONTROL[policy] === value) ?? null
        );
    }

    #headers(): Headers {
        const init = this.#init!;
        if (!(init.headers instanceof Headers)) {
            init.headers = new Headers(init.headers);
        }
        return init.headers;
    }
}
