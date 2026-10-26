import { isPlatformServer } from '@angular/common';
import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import {
    TokenDetailsDto,
    TokenResult,
} from '../../usecase/dtos/token-details.dto';

/** 期限のこの秒数前になったら、使い回さず取り直す（token.state.ts の isExpired と同じ 1 分） */
const GUEST_TOKEN_MARGIN_SEC = 60;

/**
 * SSR のサーバーが最後に取ったゲストのトークン。
 *
 * - なぜ使い回せるか: サーバーはブラウザのクッキーを BFF に渡さないので、返るのは常にゲストのトークンで、
 *   どの描画でも同じ。描画のたびに取ると、すべての取得の前に BFF への往復が直列で 1 段入る。
 * - 効く範囲: injector は描画ごとに作り直されるので、モジュールの変数に持つ。
 *   Lambda では実行環境が使い回される間だけ効き、環境が替われば取り直す。
 * - ブラウザには効かない: ブラウザでは使わない（今までどおり QueryCache と maxAgeMs だけ）。
 */
let guestTokenMemo: TokenDetailsDto | null = null;

/** テスト用: サーバーで覚えたトークンを捨てる */
export function resetGuestTokenMemoForTest(): void {
    guestTokenMemo = null;
}

function isGuestTokenUsable(memo: TokenDetailsDto): boolean {
    // expiresAt は UNIX 秒
    return memo.expiresAt - GUEST_TOKEN_MARGIN_SEC > Date.now() / 1000;
}

@Injectable({ providedIn: 'root' })
export class TokenQuery {
    readonly #http: HttpClient;
    readonly #baseUrl = environment.backendUrl + '/auth';
    readonly #cache = new QueryCache();
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    constructor() {
        const handler = inject(HttpBackend);

        this.#http = new HttpClient(handler);
    }

    /**
     * maxAgeMs を渡したとき（ガード・resolver）だけ、届いてからその間は使い回す。
     * 渡さなければ（ログイン・ログアウト・期限切れの取り直し）必ず取りに行き、取った値はキャッシュにも入れる。
     * bypassHttpCache を渡すと、URL に乱数を付けてブラウザ側に残った応答を使わせない
     * （Google の描画は Cache-Control を無視して古いトークンを返すことがある）。乱数は時計に頼らない。
     *
     * サーバーでは、さらにゲストのトークンをプロセスの中で期限の 60 秒前まで使い回す（guestTokenMemo）。
     * maxAgeMs を渡さない呼び出しと bypassHttpCache を渡した呼び出しは「取り直しの強制」なので、
     * 覚えたものを捨てて取りに行く（AuthInterceptor が 401 で取り直すとき、古いトークンを返し続けないため）。
     */
    getToken(options?: {
        maxAgeMs?: number;
        bypassHttpCache?: boolean;
    }): Observable<TokenResult> {
        const { maxAgeMs, bypassHttpCache } = options ?? {};
        const params = bypassHttpCache
            ? new HttpParams().set('r', Math.random().toString(36).slice(2))
            : undefined;

        if (this.#isServer) {
            const isForced = maxAgeMs === undefined || !!bypassHttpCache;
            if (isForced) {
                guestTokenMemo = null;
            } else if (guestTokenMemo && isGuestTokenUsable(guestTokenMemo)) {
                return of(guestTokenMemo);
            }
        }

        return this.#cache.get({
            name: 'getToken',
            params: {},
            fetch: () =>
                this.#http
                    .get<TokenResult>(`${this.#baseUrl}/token`, { params })
                    .pipe(
                        tap((result) => {
                            // 204（null）は覚えない
                            if (this.#isServer && result) {
                                guestTokenMemo = result;
                            }
                        }),
                    ),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }
}
