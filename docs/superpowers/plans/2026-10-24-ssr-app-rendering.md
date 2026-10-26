# SSR 本体 2a: アプリ側の描き分け Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ssr: false` のまま、アプリが「ページごとの描き方・CDN に置く長さとタグ・404・サーバーで描かないもの・題名と OGP」をサーバーで正しく返せるようにする。手元の SSR で、全ページが期待どおりの状態コード・ヘッダー・題名で描け、ブラウザで引き継いだ（hydration）ときに食い違いが出ないことを確かめる。

**Architecture:** SSR 本体（spec 13.3 のリリース 2）は 3 本の計画に割る。2a（この計画）はアプリの中だけで、本番のビルドは `ssr: false` のまま出せる。2b は圏外の保存と Service Worker、2c は Lambda と配信（osls）で SSR を本番で有効にする。2a では、サーバーでの描き分けの部品を `src/app/core/ssr/` に置き（最初の描画が済んだかの signal・応答のヘッダーを書く係・API の失敗で CDN に置かない係）、各ページから使う。

**Tech Stack:** Angular 22.2（`@angular/ssr` 22.2.2・`application` ビルダー・`RenderMode`・`RESPONSE_INIT`・incremental hydration）・Express 5・zone.js・@ngneat/elf 2・Jest 30

**Spec:** `docs/superpowers/specs/2026-10-12-ssr-design.md`（4 章・5 章・6.1・6.2・13.2。リリースの分け方は 13.3 の 2）

## Global Constraints

- 作業場所は worktree `/home/seapolis/Projects/sotetsu-lab-v3/.context/wt-client-ssr`（branch `feature/ssr-main`・master da294bfb から）。main checkout（`sotetsu-lab-v3-client`）には触らない
- `angular.json` の `production` 構成と `"ssr": false`・`"prerender": false`（options）は変えない。手元の確かめは計画 1 で作った `ssr-check` 構成で行う
- テストは `npx jest --testPathPatterns=<path>`（`npm test` はサンドボックスで全 spec が落ちる）。全体は `npx jest` をサンドボックスの外で
- 手元の SSR は `npm run build:ssr-check` → `npm run ssr:check`（本番の API を読むだけ・サンドボックスの外）
- コンポーネントは OnPush・standalone・`inject()`・private は `#`。新しい core の部品は役目のディレクトリ（`core/ssr/`）に置き、名前に Service を付けない
- class のバインディングは `[class]`／`[class.x]`。`[ngClass]` を使わない。Tailwind は `tw-` 接頭辞
- 題名の書式は今のまま `<題名> - Sotetsu Lab. v3`（題名が空なら `Sotetsu Lab. v3`）
- CDN に置く長さの文字列（spec 6.1・6.2。この計画で決める値）:
  - long: `public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800`
  - short: `public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400`
  - no-store: `no-store`
- キャッシュタグのヘッダー名は `Cache-Tag`、値はカンマ区切り・小文字。`calendar:<calendarId>`・`sighting-date:<YYYY-MM-DD>`。1 応答 50 個まで（spec 6.2）。ヘッダー名は 2c で CloudFront の `CacheTagConfig` に合わせて確かめる
- 「今日」は鉄道の日付（4 時までは前日。`getRailwayDate`）。サーバーの時刻帯は `Asia/Tokyo` を前提にする（手元は `ssr:check` が `TZ` を渡す。Lambda は 2c）
- コミットは GPG 署名つき。`git commit` はサンドボックスの外で行い、`git log --show-signature -1` で確かめる
- コミットの形: Conventional Commits＋絵文字（`feat: :sparkles: …`・`fix: :bug: …`・`refactor: :recycle: …`・`test: :white_check_mark: …`・`docs: :memo: …`）。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Bash でパイプ（`|`）をつながない。1 コマンド 1 目的。`git stash` を素で使わない
- prettier はファイル単位で（ディレクトリ単位の `--write` をしない）
- push・PR・デプロイはしない

## Review Focus

- ログインした人・今日の日付・端末に保存した状態（操作帯の畳み・運用群の絞り込み）で変わる表示が、サーバーの HTML に入ること（CDN で別の人に配られる）、またはブラウザの最初の描画とサーバーの HTML が食い違って hydration が壊れること → Task 4 のテストと Task 8 のブラウザでの確かめ
- API の取得に失敗したまま描いたページが、1 週間 CDN に置かれること → Task 1 の interceptor とエラー係のテスト、Task 8 の確かめ
- パラメータの足りない URL を、サーバーが「今日」や「今の時刻」で補って 302 し、その行き先が CDN に残ること → Task 5 のテストと `ssr:check`（3xx は FAIL）
- 今日を含む期間の過去の運用情報が長く置かれ、新しい目撃が出なくなること → Task 5 の `pastTimeCacheHints` のテストと `ssr:check` の short の行
- 運用表のカードがサーバーの HTML に入らない（`@defer` の場所取りのまま）こと、または HTML が大きくなりすぎること → Task 6 の確かめと Task 8 の大きさの記録

---

### Task 1: サーバーでの描き分けの部品（`core/ssr`）

**Files:**
- Create: `src/app/core/ssr/first-render.ts`
- Create: `src/app/core/ssr/first-render.spec.ts`
- Create: `src/app/core/ssr/cache-control.ts`
- Create: `src/app/core/ssr/ssr-response.ts`
- Create: `src/app/core/ssr/ssr-response.spec.ts`
- Create: `src/app/core/ssr/upstream-error.interceptor.ts`
- Create: `src/app/core/ssr/upstream-error.interceptor.spec.ts`
- Modify: `src/app/core/services/server-error-handler.ts`
- Modify: `src/app/core/services/server-error-handler.spec.ts`
- Modify: `src/app/app.config.server.ts`

**Interfaces:**
- Produces: `FirstRender`（`done: Signal<boolean>`）と `afterFirstRender<T>(source: Signal<T>, fallback: T): Signal<T>`（注入の文脈で呼ぶ）。Task 4 が使う
- Produces: `type CachePolicy = 'long' | 'short' | 'no-store'`・`CACHE_CONTROL: Record<CachePolicy, string>`・`CACHE_TAG_HEADER`・`MAX_CACHE_TAGS`・`calendarCacheTag(calendarId: string): string`・`sightingDateCacheTag(date: string): string`。Task 2・5 が使う
- Produces: `SsrResponse`（`setCachePolicy(policy: CachePolicy): void`・`addCacheTags(tags: readonly string[]): void`）。ブラウザでは何もしない。Task 5 が使う
- Produces: `UpstreamErrorInterceptor`（サーバーだけに登録）

- [ ] **Step 1: `FirstRender` のテストを書く**

`src/app/core/ssr/first-render.spec.ts`:

```ts
import { DOCUMENT } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterFirstRender, FirstRender } from './first-render';

@Component({
    selector: 'app-host',
    template: '{{ value() }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
    readonly source = signal('ブラウザの値');
    readonly value = afterFirstRender(this.source, 'サーバーの値');
}

function setup(platformId: 'browser' | 'server', serverRendered: boolean) {
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    const root = TestBed.inject(DOCUMENT).body;
    if (serverRendered) root.setAttribute('ng-server-context', 'ssr');
    return () => root.removeAttribute('ng-server-context');
}

describe('FirstRender', () => {
    let cleanup: () => void;
    afterEach(() => cleanup());

    it('サーバーでは済まない（サーバーの値で描く）', () => {
        cleanup = setup('server', true);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        TestBed.tick();
        fixture.detectChanges();

        expect(TestBed.inject(FirstRender).done()).toBe(false);
        expect(fixture.nativeElement.textContent).toBe('サーバーの値');
    });

    it('サーバーの HTML を引き継ぐときは、最初の描画はサーバーの値、描いた後にブラウザの値', () => {
        cleanup = setup('browser', true);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toBe('サーバーの値');

        TestBed.tick();
        fixture.detectChanges();

        expect(TestBed.inject(FirstRender).done()).toBe(true);
        expect(fixture.nativeElement.textContent).toBe('ブラウザの値');
    });

    it('サーバーの HTML が無い起動（Service Worker の殻・テスト）は最初からブラウザの値', () => {
        cleanup = setup('browser', false);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toBe('ブラウザの値');
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/first-render.spec.ts`
Expected: FAIL（`Cannot find module './first-render'`）

- [ ] **Step 3: `FirstRender` を書く**

`src/app/core/ssr/first-render.ts`:

```ts
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
    afterNextRender,
    computed,
    inject,
    Injectable,
    PLATFORM_ID,
    signal,
    type Signal,
} from '@angular/core';

/**
 * ブラウザの最初の描画が済んだか。
 *
 * サーバーで描いた HTML を引き継ぐ（hydration）とき、ブラウザの最初の描画はサーバーと同じ形でなければならない。
 * ログインした人・今日の日付・端末に保存した状態で形が変わる表示は、これが true になってから出す（spec 5.2・5.3・13.2）。
 * - サーバー: false のまま（ゲスト・今日なし・保存なしで描く）
 * - サーバーの HTML を引き継ぐブラウザ: 最初の描画の後に true
 * - サーバーの HTML が無い起動（Service Worker の殻・S3 の index.html・テスト）: 合わせる相手が無いので最初から true
 *
 * サーバーの HTML かどうかは、サーバーが根の要素に付ける `ng-server-context` で見分ける。
 */
@Injectable({ providedIn: 'root' })
export class FirstRender {
    readonly #done = signal(false);
    readonly done = this.#done.asReadonly();

    constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
        if (!inject(DOCUMENT).querySelector('[ng-server-context]')) {
            this.#done.set(true);
            return;
        }
        afterNextRender(() => this.#done.set(true));
    }
}

/**
 * 最初の描画が済むまでは fallback（サーバーで描いたときの値）を、済んだら source を返す。
 * 注入の文脈（フィールドの初期化・constructor）で呼ぶ。
 */
export function afterFirstRender<T>(source: Signal<T>, fallback: T): Signal<T> {
    const firstRender = inject(FirstRender);
    return computed(() => (firstRender.done() ? source() : fallback));
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/first-render.spec.ts`
Expected: PASS（3 件）

- [ ] **Step 5: CDN に置く長さとタグの定数を書く**

`src/app/core/ssr/cache-control.ts`:

```ts
/**
 * サーバーで描いた HTML を CDN に置く長さ（spec 6.1・6.2）。ブラウザには置かない（max-age=0）。
 * - long: 改正か入力でしか変わらないページ。1 週間置き、期限が切れても 1 日は古いものをすぐ返して裏で描き直す。入力されたら API がタグで失効させる
 * - short: 今日を含む過去の運用情報・404・リダイレクト。1 分
 * - no-store: 入力・ログインのページ、API の取得に失敗したまま描いたページ
 */
export type CachePolicy = 'long' | 'short' | 'no-store';

export const CACHE_CONTROL: Record<CachePolicy, string> = {
    long: 'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800',
    short: 'public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400',
    'no-store': 'no-store',
};

/** キャッシュタグを載せる応答ヘッダー。CloudFront の CacheTagConfig の HeaderName と同じにする（2c） */
export const CACHE_TAG_HEADER = 'Cache-Tag';

/** CloudFront が 1 つの応答で受けるタグの数の上限 */
export const MAX_CACHE_TAGS = 50;

/** そのダイヤの列車情報が書き換わったら失効させるタグ */
export function calendarCacheTag(calendarId: string): string {
    return `calendar:${calendarId}`.toLowerCase();
}

/** その日の目撃が後から書き換わったら失効させるタグ（日付は YYYY-MM-DD） */
export function sightingDateCacheTag(date: string): string {
    return `sighting-date:${date}`;
}
```

- [ ] **Step 6: `SsrResponse` のテストを書く**

`src/app/core/ssr/ssr-response.spec.ts`:

```ts
import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CACHE_CONTROL, CACHE_TAG_HEADER } from './cache-control';
import { SsrResponse } from './ssr-response';

function setup(init: ResponseInit | null) {
    TestBed.configureTestingModule({
        providers: [{ provide: RESPONSE_INIT, useValue: init }],
    });
    return TestBed.inject(SsrResponse);
}

describe('SsrResponse', () => {
    it('ブラウザ（RESPONSE_INIT が無い）では何もしない', () => {
        const response = setup(null);

        expect(() => {
            response.setCachePolicy('short');
            response.addCacheTags(['calendar:a']);
        }).not.toThrow();
    });

    it('置く長さを Cache-Control に書く', () => {
        const init: ResponseInit = { headers: new Headers() };
        setup(init).setCachePolicy('long');

        expect((init.headers as Headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.long,
        );
    });

    it('短いほうを優先し、一度短くしたら長く戻さない', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);

        response.setCachePolicy('short');
        response.setCachePolicy('long');
        expect((init.headers as Headers).get('Cache-Control')).toBe(
            CACHE_CONTROL.short,
        );

        response.setCachePolicy('no-store');
        response.setCachePolicy('short');
        expect((init.headers as Headers).get('Cache-Control')).toBe(
            'no-store',
        );
    });

    it('headers がオブジェクトでも Headers にして書く', () => {
        const init: ResponseInit = { headers: { 'X-Other': '1' } };
        setup(init).setCachePolicy('short');

        const headers = init.headers as Headers;
        expect(headers.get('X-Other')).toBe('1');
        expect(headers.get('Cache-Control')).toBe(CACHE_CONTROL.short);
    });

    it('タグを重ねずカンマ区切りの小文字で書く', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);

        response.addCacheTags(['calendar:ABC']);
        response.addCacheTags(['calendar:abc', 'sighting-date:2026-10-01']);

        expect((init.headers as Headers).get(CACHE_TAG_HEADER)).toBe(
            'calendar:abc,sighting-date:2026-10-01',
        );
    });

    it('51 個を超えたらタグを外し、短く置く（失効で消せないので）', () => {
        const init: ResponseInit = { headers: new Headers() };
        const response = setup(init);
        response.setCachePolicy('long');

        response.addCacheTags(
            Array.from({ length: 51 }, (_, i) => `sighting-date:d${i}`),
        );

        const headers = init.headers as Headers;
        expect(headers.has(CACHE_TAG_HEADER)).toBe(false);
        expect(headers.get('Cache-Control')).toBe(CACHE_CONTROL.short);
    });
});
```

- [ ] **Step 7: 落ちることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/ssr-response.spec.ts`
Expected: FAIL（`Cannot find module './ssr-response'`）

- [ ] **Step 8: `SsrResponse` を書く**

`src/app/core/ssr/ssr-response.ts`:

```ts
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
    #policy: CachePolicy | null = null;
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

    #headers(): Headers {
        const init = this.#init!;
        if (!(init.headers instanceof Headers)) {
            init.headers = new Headers(init.headers);
        }
        return init.headers;
    }
}
```

- [ ] **Step 9: 通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/ssr-response.spec.ts`
Expected: PASS（6 件）

- [ ] **Step 10: API の失敗で CDN に置かない interceptor のテストを書く**

`src/app/core/ssr/upstream-error.interceptor.spec.ts`:

```ts
import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SsrResponse } from './ssr-response';
import { UpstreamErrorInterceptor } from './upstream-error.interceptor';

describe('UpstreamErrorInterceptor', () => {
    let http: HttpClient;
    let controller: HttpTestingController;
    let setCachePolicy: jest.Mock;

    beforeEach(() => {
        setCachePolicy = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: UpstreamErrorInterceptor,
                    multi: true,
                },
                { provide: SsrResponse, useValue: { setCachePolicy } },
            ],
        });
        http = TestBed.inject(HttpClient);
        controller = TestBed.inject(HttpTestingController);
    });

    afterEach(() => controller.verify());

    it('取れたら何もしない', () => {
        http.get('/x').subscribe();
        controller.expectOne('/x').flush({});

        expect(setCachePolicy).not.toHaveBeenCalled();
    });

    it('500 なら CDN に置かない', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller
            .expectOne('/x')
            .flush(null, { status: 500, statusText: 'Server Error' });

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });

    it('通信できなくても CDN に置かない', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller.expectOne('/x').error(new ProgressEvent('error'));

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });

    it('401 は数えない（AuthInterceptor がトークンを取り直して送り直す）', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller
            .expectOne('/x')
            .flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(setCachePolicy).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 11: 落ちることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/upstream-error.interceptor.spec.ts`
Expected: FAIL（`Cannot find module './upstream-error.interceptor'`）

- [ ] **Step 12: interceptor を書く**

`src/app/core/ssr/upstream-error.interceptor.ts`:

```ts
import {
    HttpErrorResponse,
    type HttpEvent,
    type HttpHandler,
    type HttpInterceptor,
    type HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable, tap } from 'rxjs';
import { SsrResponse } from './ssr-response';

/**
 * サーバーで描く途中に API の取得が失敗したら、そのページを CDN に置かない（サーバーだけに登録する）。
 * 失敗したまま描いたページが 1 週間配られるのを防ぐ。次のリクエストで描き直す。
 */
@Injectable()
export class UpstreamErrorInterceptor implements HttpInterceptor {
    readonly #ssrResponse = inject(SsrResponse);

    intercept(
        req: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            tap({
                error: (error: unknown) => {
                    // 401 は AuthInterceptor がトークンを取り直して送り直す。送り直しの失敗はもう一度ここを通る
                    if (
                        error instanceof HttpErrorResponse &&
                        error.status === 401
                    ) {
                        return;
                    }
                    this.#ssrResponse.setCachePolicy('no-store');
                },
            }),
        );
    }
}
```

- [ ] **Step 13: 通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/ssr/upstream-error.interceptor.spec.ts`
Expected: PASS（4 件）

- [ ] **Step 14: サーバーのエラー係でも CDN に置かないようにする（テスト）**

`src/app/core/services/server-error-handler.spec.ts` を次に置き換える:

```ts
import { TestBed } from '@angular/core/testing';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { ServerErrorHandler } from './server-error-handler';

describe('ServerErrorHandler', () => {
    let setCachePolicy: jest.Mock;

    beforeEach(() => {
        setCachePolicy = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                ServerErrorHandler,
                { provide: SsrResponse, useValue: { setCachePolicy } },
            ],
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('エラーを標準エラーに ERROR 付きで出す', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('x');

        TestBed.inject(ServerErrorHandler).handleError(error);

        expect(spy).toHaveBeenCalledWith('ERROR', error);
    });

    it('エラーが起きたページは CDN に置かない', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        TestBed.inject(ServerErrorHandler).handleError(new Error('x'));

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });
});
```

Run: `npx jest --testPathPatterns=src/app/core/services/server-error-handler.spec.ts`
Expected: FAIL（2 件目。`setCachePolicy` が呼ばれない）

- [ ] **Step 15: サーバーのエラー係を直す**

`src/app/core/services/server-error-handler.ts` を次に置き換える:

```ts
import { ErrorHandler, inject, Injectable } from '@angular/core';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';

/**
 * サーバーで描くときのエラーの係。本番の設定では NGXLogger が出力を止めているので、
 * そのままだとサーバーのエラーがどこにも残らない。標準エラーに出し、Lambda のログと手元の確かめ（ssr:check）で拾えるようにする。
 * エラーが起きたまま描いたページは CDN に置かない。
 */
@Injectable()
export class ServerErrorHandler implements ErrorHandler {
    readonly #ssrResponse = inject(SsrResponse);

    handleError(error: unknown): void {
        console.error('ERROR', error);
        this.#ssrResponse.setCachePolicy('no-store');
    }
}
```

Run: `npx jest --testPathPatterns=src/app/core/services/server-error-handler.spec.ts`
Expected: PASS（2 件）

- [ ] **Step 16: interceptor をサーバーだけに登録する**

`src/app/app.config.server.ts` の import に足す:

```ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { UpstreamErrorInterceptor } from './core/ssr/upstream-error.interceptor';
```

`providers` の末尾（`ErrorHandler` の行の後）に足す:

```ts
        // サーバーで API の取得に失敗したら、そのページを CDN に置かない。
        // ブラウザの interceptor の後ろ（API に近い側）に入るので、AuthInterceptor の送り直しもここを通る
        {
            provide: HTTP_INTERCEPTORS,
            useClass: UpstreamErrorInterceptor,
            multi: true,
        },
```

- [ ] **Step 17: まとめて確かめてコミット**

Run: `npx jest --testPathPatterns=src/app/core/ssr src/app/core/services/server-error-handler`
Expected: PASS

```bash
npx prettier --write src/app/core/ssr/first-render.ts src/app/core/ssr/first-render.spec.ts src/app/core/ssr/cache-control.ts src/app/core/ssr/ssr-response.ts src/app/core/ssr/ssr-response.spec.ts src/app/core/ssr/upstream-error.interceptor.ts src/app/core/ssr/upstream-error.interceptor.spec.ts src/app/core/services/server-error-handler.ts src/app/core/services/server-error-handler.spec.ts src/app/app.config.server.ts
git add src/app/core/ssr src/app/core/services/server-error-handler.ts src/app/core/services/server-error-handler.spec.ts src/app/app.config.server.ts
git commit -m "feat: :sparkles: サーバーでの描き分けの部品を足す（最初の描画・CDN に置く長さとタグ・失敗時は置かない）" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

---

### Task 2: ページごとの描き方・404・手元の確かめの拡張

**Files:**
- Modify: `src/app/app.routes.server.ts`（全体を書き換え）
- Create: `src/app/pages/not-found/not-found.route.ts`
- Create: `src/app/pages/not-found/not-found.component.ts`
- Create: `src/app/pages/not-found/not-found.component.spec.ts`
- Modify: `src/app/app.route.ts`（末尾に `'**'`）
- Modify: `server.ts`（リダイレクトは短く置く）
- Modify: `scripts/ssr-check.mjs`（全体を書き換え）

**Interfaces:**
- Consumes: `CACHE_CONTROL`（Task 1）
- Produces: `scripts/ssr-check.mjs` の `PATHS` の各行 `{ path, kind: 'server' | 'client' | 'not-found', cache, tag?, title? }`。Task 5 が `tag` と `cache` を、Task 7 が `title` を足す

- [ ] **Step 1: 404 のページのテストを書く**

`src/app/pages/not-found/not-found.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NotFoundComponent } from './not-found.component';

describe('NotFoundComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NotFoundComponent],
            providers: [provideRouter([])],
        });
    });

    it('見つからないことを伝え、トップへ戻るボタンを出す', () => {
        const fixture = TestBed.createComponent(NotFoundComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('ページが見つかりません');
        expect(text).toContain('トップへ戻る');
    });

    it('トップへ戻る', () => {
        const fixture = TestBed.createComponent(NotFoundComponent);
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        fixture.componentInstance.onBackToTop();

        expect(navigate).toHaveBeenCalledWith(['/']);
    });
});
```

Run: `npx jest --testPathPatterns=src/app/pages/not-found`
Expected: FAIL（`Cannot find module './not-found.component'`）

- [ ] **Step 2: 404 のページを書く**

`src/app/pages/not-found/not-found.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

/** どのページにも当たらない URL。サーバーは状態コード 404 で返す（app.routes.server.ts） */
@Component({
    selector: 'app-not-found',
    template: `
        <main class="tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16">
            <app-empty-state
                icon="search_off"
                message="ページが見つかりません"
                subtitle="URL が変わったか、ページが無くなった可能性があります。"
                actionLabel="トップへ戻る"
                (actionClick)="onBackToTop()"
            ></app-empty-state>
        </main>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent],
})
export class NotFoundComponent {
    readonly #router = inject(Router);
    readonly #notification = inject(NotificationService);

    onBackToTop(): void {
        notifyNavigationFailure(this.#router.navigate(['/']), this.#notification);
    }
}
```

（`notifyNavigationFailure` の引数の形は `src/app/core/utils/notify-navigation-failure.ts` を開いて合わせる。route-diagram の `notifyNavigationFailure(this.#router.navigate(...), this.#notification)` と同じ形のはず）

`src/app/pages/not-found/not-found.route.ts`:

```ts
import { Routes } from '@angular/router';
import { pageResolver } from 'src/app/core/resolvers/page.resolver';

export const NOT_FOUND_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./not-found.component').then(
                (mod) => mod.NotFoundComponent,
            ),
        resolve: {
            from: pageResolver(),
        },
        data: {
            title: 'ページが見つかりません',
        },
    },
];
```

Run: `npx jest --testPathPatterns=src/app/pages/not-found`
Expected: PASS（2 件）

- [ ] **Step 3: アプリのルートの末尾に `'**'` を足す**

`src/app/app.route.ts` の `APP_ROUTES` の最後（`maintenance` の後）に足す。ほかのページと同じく、グローバルの初期化（`initialDataResolver`）を通す（`pageResolver` がそれを待つので）:

```ts
    {
        // どのページにも当たらない URL。以前はナビゲーションのエラーの通知だけが出ていた
        path: '**',
        loadChildren: () =>
            import('./pages/not-found/not-found.route').then(
                (mod) => mod.NOT_FOUND_ROUTES,
            ),
        canActivate: [maintenanceGuard],
        resolve: {
            from: initialDataResolver,
        },
        runGuardsAndResolvers: 'always',
    },
```

- [ ] **Step 4: ページごとの描き方を書く**

`src/app/app.routes.server.ts` を次に置き換える（spec 4 章の表）:

```ts
import { RenderMode, type ServerRoute } from '@angular/ssr';
import { CACHE_CONTROL } from './core/ssr/cache-control';

const LONG = { 'Cache-Control': CACHE_CONTROL.long };
const NO_STORE = { 'Cache-Control': CACHE_CONTROL['no-store'] };

/**
 * ページごとのサーバーでの描き方（spec 4 章）。
 * - 入力・ログインが要るページはブラウザで描く（Client）。CDN に置かない
 * - ほかはサーバーで描き、既定で長く置く。ページが SsrResponse で短くしたりタグを足したりする
 * - 枠だけのページ（ダッシュボード・real-time・列車位置情報）もここでは Server。中身を取らないのはページ側
 * - どれにも当たらない URL は 404 の枠を描いて短く置く
 * matrix param（;calendar_id=…）は当てはめる前に外される（@angular/ssr の stripMatrixParams）
 */
export const serverRoutes: ServerRoute[] = [
    { path: 'login', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'register', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'maintenance', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'timetable/add', renderMode: RenderMode.Client, headers: NO_STORE },
    { path: 'timetable/copy', renderMode: RenderMode.Client, headers: NO_STORE },
    {
        path: 'timetable/update',
        renderMode: RenderMode.Client,
        headers: NO_STORE,
    },
    { path: '', renderMode: RenderMode.Server, headers: LONG },
    { path: 'operation/real-time', renderMode: RenderMode.Server, headers: LONG },
    { path: 'operation/past-time', renderMode: RenderMode.Server, headers: LONG },
    { path: 'operation/table', renderMode: RenderMode.Server, headers: LONG },
    {
        path: 'operation/route-diagram',
        renderMode: RenderMode.Server,
        headers: LONG,
    },
    { path: 'timetable/station', renderMode: RenderMode.Server, headers: LONG },
    { path: 'timetable/all-line', renderMode: RenderMode.Server, headers: LONG },
    { path: 'train-diagram', renderMode: RenderMode.Server, headers: LONG },
    { path: 'train-location', renderMode: RenderMode.Server, headers: LONG },
    { path: 'library/vehicle', renderMode: RenderMode.Server, headers: LONG },
    {
        path: '**',
        renderMode: RenderMode.Server,
        status: 404,
        headers: { 'Cache-Control': CACHE_CONTROL.short },
    },
];
```

- [ ] **Step 5: リダイレクトは短く置く**

この計画のあとはサーバーが URL を補って移ることは無い（Task 5）が、残ったリダイレクトが長く置かれないよう `server.ts` で上書きする。

`server.ts` の import に足す:

```ts
import { CACHE_CONTROL } from './src/app/core/ssr/cache-control';
```

`angularApp.handle(req).then(...)` の部分を次に置き換える:

```ts
app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) => {
            if (!response) {
                next();
                return;
            }
            // リダイレクトの行き先は時刻や今日で変わりうるので、長く置かない
            if (response.status >= 300 && response.status < 400) {
                response.headers.set('Cache-Control', CACHE_CONTROL.short);
            }
            return writeResponseToNodeResponse(response, res);
        })
        .catch(next);
});
```

- [ ] **Step 6: 手元の確かめを、状態コード・描き方・ヘッダーまで見るように書き換える**

`scripts/ssr-check.mjs` を次に置き換える:

```js
// 手元で SSR を起動し、主なページをサーバーで描けるか確かめる。
// 先に `npm run build:ssr-check`。サーバーは本番の API を読む（読むだけ）。
// 見ること: 状態コード・サーバーで描いたか（ng-server-context）・CDN に置く長さ・キャッシュタグ・題名・サーバーのエラー
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// 「今日」を鉄道の日付で数えるので、本番（Lambda）と同じ時刻帯で動かす
process.env.TZ = 'Asia/Tokyo';

const PORT = 4300;
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_MS = 20_000;

const CALENDAR = 'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb'; // 平日ダイヤ 2026-03-14
const STATION = 'fb799a2e-c96c-4629-8a7d-e8b57f8e6930'; // 二俣川
const OPERATION = '8553e26c-38c0-4895-9ff5-b4f02572df99'; // 01K
const ROUTE = '2e22124f-04eb-475f-929a-7dba25561638'; // 本線

const LONG =
    'public, max-age=0, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800';
const SHORT =
    'public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=86400';
const NO_STORE = 'no-store';

function ymd(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${m}-${d}`;
}
// 鉄道の日付（4 時までは前日）の 6 日前から 7 日間 = 今日を含む
const railwayToday = new Date(Date.now() - 4 * 3600 * 1000);
const RECENT_START = ymd(
    new Date(
        railwayToday.getFullYear(),
        railwayToday.getMonth(),
        railwayToday.getDate() - 6,
    ),
);

const PATHS = [
    { path: '/', kind: 'server', cache: LONG },
    { path: '/operation/real-time', kind: 'server', cache: LONG },
    { path: '/operation/past-time', kind: 'server', cache: LONG },
    {
        path: '/operation/past-time;reference_date=2026-10-01;days=3',
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/operation/past-time;reference_date=${RECENT_START};days=7`,
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/operation/table;calendar_id=${CALENDAR}`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/operation/table', kind: 'server', cache: LONG },
    {
        path: `/operation/route-diagram;operation_id=${OPERATION}`,
        kind: 'server',
        cache: LONG,
    },
    {
        path: `/timetable/station;calendar_id=${CALENDAR};station_id=${STATION};trip_direction=0`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/timetable/station', kind: 'server', cache: LONG },
    {
        path: `/timetable/all-line;calendar_id=${CALENDAR};trip_direction=0`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/timetable/all-line', kind: 'server', cache: LONG },
    {
        path: `/train-diagram;calendar_id=${CALENDAR};route_ids=${ROUTE};time=0600`,
        kind: 'server',
        cache: LONG,
    },
    { path: '/train-diagram', kind: 'server', cache: LONG },
    { path: `/train-location;route_id=${ROUTE}`, kind: 'server', cache: LONG },
    { path: '/train-location', kind: 'server', cache: LONG },
    { path: '/library/vehicle', kind: 'server', cache: LONG },
    { path: '/login', kind: 'client', cache: NO_STORE },
    { path: '/register', kind: 'client', cache: NO_STORE },
    { path: '/maintenance', kind: 'client', cache: NO_STORE },
    {
        path: `/timetable/add;calendar_id=${CALENDAR};trip_direction=0`,
        kind: 'client',
        cache: NO_STORE,
    },
    { path: '/no-such-page', kind: 'not-found', cache: SHORT },
    { path: '/operation', kind: 'not-found', cache: SHORT },
];

const server = spawn(
    process.execPath,
    ['dist/sotetsu-lab-v3-client/server/server.mjs'],
    {
        env: { ...process.env, PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
    },
);
let log = '';
server.stdout.on('data', (chunk) => (log += chunk));
server.stderr.on('data', (chunk) => (log += chunk));

async function waitReady() {
    for (let i = 0; i < 100; i++) {
        try {
            await fetch(`${BASE}/favicon.ico`);
            return;
        } catch {
            await sleep(200);
        }
    }
    throw new Error(`server did not start\n${log}`);
}

function judge(entry, res, html) {
    const problems = [];
    const rendered = html.includes('ng-server-context');
    if (entry.kind === 'server' && !(res.status === 200 && rendered)) {
        problems.push(`expected 200 rendered, got ${res.status} rendered=${rendered}`);
    }
    if (
        entry.kind === 'client' &&
        !(res.status === 200 && !rendered && html.includes('<app-root'))
    ) {
        problems.push(`expected 200 client shell, got ${res.status} rendered=${rendered}`);
    }
    if (entry.kind === 'not-found' && !(res.status === 404 && rendered)) {
        problems.push(`expected 404 rendered, got ${res.status} rendered=${rendered}`);
    }
    const cache = res.headers.get('cache-control');
    if (cache !== entry.cache) {
        problems.push(`cache-control: ${cache}`);
    }
    if (entry.tag) {
        const tags = (res.headers.get('cache-tag') ?? '').split(',');
        if (!tags.includes(entry.tag)) {
            problems.push(`cache-tag lacks ${entry.tag}: ${tags.join(',')}`);
        }
    }
    if (entry.title) {
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
        if (!title.includes(entry.title)) {
            problems.push(`title: ${title}`);
        }
    }
    return problems;
}

async function check(entry) {
    const logStart = log.length;
    const started = performance.now();
    const res = await fetch(BASE + entry.path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text();
    const ms = Math.round(performance.now() - started);
    // 描き終えたあとに出る ERROR も拾うため、少し待ってからログを見る
    await sleep(300);
    const errors = log.slice(logStart).match(/ERROR[^\n]*/g) ?? [];
    const problems = [...judge(entry, res, html), ...errors];
    const ok = problems.length === 0;
    console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${res.status} ${ms}ms ${html.length}B ${entry.path}`,
    );
    for (const problem of problems) {
        console.log(`     ${problem}`);
    }
    return ok;
}

let failed = 0;
try {
    await waitReady();
    // 2 周する。2 周目は同じ実行環境が前のリクエストの後に描く場合を真似る
    for (const round of [1, 2]) {
        console.log(`--- round ${round}`);
        for (const entry of PATHS) {
            try {
                if (!(await check(entry))) {
                    failed++;
                }
            } catch (error) {
                failed++;
                console.log(`FAIL ---       ${entry.path} ${error.message}`);
            }
        }
    }
} finally {
    server.kill();
}
process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 7: ビルドして叩く**

サンドボックスの外で:

```bash
npm run build:ssr-check
npm run ssr:check
```

Expected:
- ビルドが通る（`app.routes.server.ts` のパスがアプリのルートに当たらないとビルドが止まる。止まったらパスを直す）
- `/login`・`/register`・`/maintenance`・`/timetable/add…` が `OK 200`（client）、`/no-such-page`・`/operation` が `OK 404`
- この時点では、パラメータの足りない `/timetable/station`・`/operation/table`・`/train-diagram`・`/timetable/all-line` などが FAIL（サーバーが補って 302 する、または今日が無いまま取りに行く）になりうる。それは Task 5 で直すので、FAIL の行と理由を残して先へ進む（`npm run ssr:check > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/ssr-check-2a-task2.txt`）
- `ERROR` が出た行は、この Task の変更が原因なら直す

- [ ] **Step 8: コミット**

```bash
npx prettier --write src/app/app.routes.server.ts src/app/app.route.ts src/app/pages/not-found/not-found.route.ts src/app/pages/not-found/not-found.component.ts src/app/pages/not-found/not-found.component.spec.ts server.ts scripts/ssr-check.mjs
git add src/app/app.routes.server.ts src/app/app.route.ts src/app/pages/not-found server.ts scripts/ssr-check.mjs
git commit -m "feat: :sparkles: ページごとのサーバーでの描き方と 404 のページを足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

---

### Task 3: 枠だけのページ（ダッシュボード・real-time・列車位置情報）

spec 4 章: 刻々と変わるページは、サーバーでは枠（ヘッダー・サイドナビ・ページの骨組み）と題名だけ描き、中身はブラウザで取る。これらのページは、端末に保存した中身（`persistState`）とログイン状態（投稿カード）でも形が変わるので、サーバーの HTML をブラウザで引き継がず、ブラウザで描き直す（`ngSkipHydration`）。サーバーが描くのはページの読み込み中の骨組みなので、描き直しで見た目は大きく跳ねない。

**Files:**
- Modify: `src/app/pages/dashboard/dashboard.component.ts`
- Modify: `src/app/pages/dashboard/dashboard.component.spec.ts`
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts`
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts`
- Modify: `src/app/pages/train-location/train-location.component.ts`
- Modify: `src/app/pages/train-location/train-location.component.spec.ts`

**Interfaces:**
- Consumes: なし（Angular の `ngSkipHydration`・`isPlatformServer`）

- [ ] **Step 1: ダッシュボードのテストを書く**

`src/app/pages/dashboard/dashboard.component.spec.ts` の末尾（最後の `});` の後）に足す:

```ts
describe('DashboardComponent をサーバーで描くとき', () => {
    it('中身を取らない（枠だけ描く）', async () => {
        const fetchTodaysCalendar = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: DashboardService,
                    useValue: {
                        fetchTodaysCalendar,
                        fetchTodaysDayName: () => of(undefined),
                        fetchRunningTripCount: () => of(undefined),
                        fetchTodaysSightings: () => of(undefined),
                        fetchLatestSightingPositions: () => of(undefined),
                        fetchTripClasses: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        TestBed.createComponent(DashboardComponent);

        expect(fetchTodaysCalendar).not.toHaveBeenCalled();
    });

    it('サーバーの HTML をブラウザで引き継がない（ngSkipHydration）', async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: DashboardService, useValue: {} },
            ],
        })
            .overrideComponent(DashboardComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(DashboardComponent);

        expect(
            fixture.nativeElement.hasAttribute('ngskiphydration'),
        ).toBe(true);
    });
});
```

import の行に `PLATFORM_ID` を足す（`import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';`）。

Run: `npx jest --testPathPatterns=src/app/pages/dashboard/dashboard.component.spec.ts`
Expected: FAIL（新しい 2 件）

- [ ] **Step 2: ダッシュボードを直す**

`src/app/pages/dashboard/dashboard.component.ts`:

- import に `PLATFORM_ID` と `isPlatformServer` を足す（`import { isPlatformServer } from '@angular/common';`・`@angular/core` の import に `PLATFORM_ID`）
- `@Component` に `host` を足す:

```ts
    // 枠だけのページ（spec 4 章）。保存した中身・ログイン状態で形が変わるので、
    // サーバーの HTML（読み込み中の骨組み）を引き継がず、ブラウザで描き直す
    host: { ngSkipHydration: 'true' },
```

- constructor を次に置き換える:

```ts
    constructor() {
        // 枠だけのページ。中身は刻々と変わるのでサーバーでは取らない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
        this.fetchData();
    }
```

Run: `npx jest --testPathPatterns=src/app/pages/dashboard/dashboard.component.spec.ts`
Expected: PASS

- [ ] **Step 3: real-time のテストを書く**

`src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts` の末尾に足す（providers は同じファイルの「取得の失敗」の describe と同じ形）:

```ts
describe('OperationRealTimeComponent をサーバーで描くとき', () => {
    it('中身を取らず、引き継がない', async () => {
        const fetchOperationGroups = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: OperationRealTimeService,
                    useValue: { fetchOperationGroups },
                },
                { provide: SocketService, useValue: { on: () => new Subject() } },
                { provide: NotificationService, useValue: { open: jest.fn() } },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: new Subject<void>() },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(OperationRealTimeComponent);

        expect(fetchOperationGroups).not.toHaveBeenCalled();
        expect(
            fixture.nativeElement.hasAttribute('ngskiphydration'),
        ).toBe(true);
    });
});
```

import に `PLATFORM_ID` を足す（ファイル先頭の `@angular/core` の import）。

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts`
Expected: FAIL（新しい 1 件）

- [ ] **Step 4: real-time を直す**

`src/app/pages/operation/operation-real-time/operation-real-time.component.ts`:

- import に `isPlatformServer`（`@angular/common`）と `PLATFORM_ID`（`@angular/core`）を足す
- `@Component` に `host: { ngSkipHydration: 'true' },` を足す（ダッシュボードと同じコメントを付ける。既に `host` があれば、その中に `ngSkipHydration: 'true'` を足す）
- constructor を次に置き換える:

```ts
    constructor() {
        // 枠だけのページ。中身は刻々と変わるのでサーバーでは取らない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
        this.fetchData();
        this.hookEvent();
    }
```

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts`
Expected: PASS

- [ ] **Step 5: 列車位置情報のテストを書く**

`src/app/pages/train-location/train-location.component.spec.ts` の末尾に足す（providers は同じファイルの最初の describe と同じ形）:

```ts
describe('TrainLocationComponent をサーバーで描くとき', () => {
    it('URL を補わず、中身を取らず、引き継がない', async () => {
        const fetchTripBlocks = jest.fn(() => of(undefined));
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks,
                        fetchItineraryLinks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: undefined,
                        todaysCalendarIds$: of([]),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                        operatingSystemEndsByRouteId$: of({}),
                    },
                },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const navigate = jest.spyOn(TestBed.inject(Router), 'navigate');
        const fixture = TestBed.createComponent(TrainLocationComponent);
        fixture.detectChanges();

        expect(navigate).not.toHaveBeenCalled();
        expect(fetchTripBlocks).not.toHaveBeenCalled();
        expect(
            fixture.nativeElement.hasAttribute('ngskiphydration'),
        ).toBe(true);
    });
});
```

import に `PLATFORM_ID` を足す（`import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';`）。

Run: `npx jest --testPathPatterns=src/app/pages/train-location/train-location.component.spec.ts`
Expected: FAIL（新しい 1 件）

- [ ] **Step 6: 列車位置情報を直す**

`src/app/pages/train-location/train-location.component.ts`:

- import に `isPlatformServer`（`@angular/common`）と `PLATFORM_ID`（`@angular/core`）を足す
- `@Component` に `host: { ngSkipHydration: 'true' },` を足す（既に `host` があればその中に）
- constructor の `runIntervalInBrowser(...)` の呼び出しの直後に足す:

```ts
        // 枠だけのページ。中身は刻々と変わるので、サーバーでは URL を補わず取りもしない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
```

Run: `npx jest --testPathPatterns=src/app/pages/train-location/train-location.component.spec.ts`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
npx prettier --write src/app/pages/dashboard/dashboard.component.ts src/app/pages/dashboard/dashboard.component.spec.ts src/app/pages/operation/operation-real-time/operation-real-time.component.ts src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts src/app/pages/train-location/train-location.component.ts src/app/pages/train-location/train-location.component.spec.ts
git add src/app/pages/dashboard/dashboard.component.ts src/app/pages/dashboard/dashboard.component.spec.ts src/app/pages/operation/operation-real-time/operation-real-time.component.ts src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts src/app/pages/train-location/train-location.component.ts src/app/pages/train-location/train-location.component.spec.ts
git commit -m "feat: :sparkles: 刻々と変わるページはサーバーで枠だけ描く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

---

### Task 4: 人と端末で形が変わる表示を、ブラウザの最初の描画の後に出す

中身まで描くページと、全ページに出るヘッダーで、ログイン状態と端末に保存した状態で**形**（`@if` の枝・選択欄の表示）が変わるところを `afterFirstRender` で包む。サーバーはゲスト・保存なしの形で描き、ブラウザは最初の描画をそれに合わせ、描いた後に本当の形にする。

形が変わらず属性の値だけ変わるところ（サイドナビの今日のダイヤへのリンクの `href`・「今日」ボタンの `disabled`）は、hydration が値を書き換えるだけで食い違いにならないので包まない（Task 8 のブラウザでの確かめで食い違いが出たら包む）。

**Files:**
- Modify: `src/app/layout/components/header/header.component.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`
- Modify: `src/app/pages/train-diagram/train-diagram.component.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts`
- Modify: `src/app/core/query-cache/query-invalidator.ts`
- Test: `src/app/layout/components/header/header.component.spec.ts`（あれば足す。無ければ作る）
- Test: `src/app/core/query-cache/query-invalidator.spec.ts`（あれば足す）

**Interfaces:**
- Consumes: `afterFirstRender<T>(source: Signal<T>, fallback: T): Signal<T>`（Task 1）

- [ ] **Step 1: ヘッダーのテストを書く**

`src/app/layout/components/header/header.component.spec.ts` を開く。あればその TestBed の形に、無ければ次の形で、サーバーではゲストの挨拶を出すテストを足す:

```ts
import { NO_ERRORS_SCHEMA, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import {
    TokenStateStore,
} from 'src/app/global-states/token.state';
import {
    UserStateQuery,
    UserStateStore,
} from 'src/app/global-states/user.state';
import { HeaderComponent } from './header.component';

describe('HeaderComponent をサーバーで描くとき', () => {
    it('ログインしていてもゲストの挨拶を出す（CDN で別の人に配られるため）', async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [
                provideRouter([]),
                { provide: PLATFORM_ID, useValue: 'server' },
                { provide: AuthService, useValue: {} },
                { provide: TokenStateStore, useValue: {} },
                { provide: UserStateStore, useValue: {} },
                {
                    provide: UserStateQuery,
                    useValue: {
                        isLoggedIn$: of(true),
                        displayName$: of('相鉄太郎'),
                    },
                },
            ],
        })
            .overrideComponent(HeaderComponent, {
                set: { schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        const fixture = TestBed.createComponent(HeaderComponent);
        fixture.detectChanges();

        const header: HTMLElement = fixture.nativeElement.querySelector('header');
        expect(header.textContent).toContain('ゲスト さん');
        expect(header.textContent).not.toContain('相鉄太郎');
    });
});
```

（`AuthService`・`TokenStateStore`・`UserStateStore` の import パスは `header.component.ts` の import に合わせる。`overrideComponent` で imports を空にすると `mat-menu` の参照が解けずに落ちる場合は、imports はそのままにして `schemas` だけ足す）

Run: `npx jest --testPathPatterns=src/app/layout/components/header`
Expected: FAIL（「相鉄太郎」が出る）

- [ ] **Step 2: ヘッダーを直す**

`src/app/layout/components/header/header.component.ts`:

- import に `afterFirstRender` を足す（`import { afterFirstRender } from 'src/app/core/ssr/first-render';`）
- `isLoggedIn` を次に置き換える:

```ts
    /** サーバーと、それを引き継ぐ最初の描画はゲストの形にする（spec 5.3。CDN で別の人に配られるため） */
    readonly isLoggedIn = afterFirstRender(
        toSignal(this.#userStateQuery.isLoggedIn$, { initialValue: false }),
        false,
    );
```

Run: `npx jest --testPathPatterns=src/app/layout/components/header`
Expected: PASS（既存のヘッダーのテストも通る。テストの jsdom にはサーバーの印が無いので、ブラウザのテストは最初からログインの形）

- [ ] **Step 3: 全線時刻表の編集の行・操作帯の畳み・ダイヤグラムの操作帯の畳み・運用表の絞り込み・運用行路図の今日のダイヤを包む**

それぞれ import に `afterFirstRender` を足し、次のとおり置き換える。

`src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`:

```ts
    /** 編集・コピー・削除・グループの操作は、時刻表を書ける役割だけに出す。
     * サーバーと、それを引き継ぐ最初の描画では出さない（spec 5.3） */
    readonly canEdit = afterFirstRender(
        toSignal(inject(UserStateQuery).canEditTimetable$, {
            initialValue: false,
        }),
        false,
    );
```

```ts
    /** 端末に保存した畳み状態。サーバーは保存を読めないので、最初の描画は開いた形（spec 13.2） */
    readonly controlCollapsed = afterFirstRender(
        toSignal(TimetableAllLineStore.controlCollapsed$, {
            initialValue: false,
        }),
        false,
    );
```

`src/app/pages/train-diagram/train-diagram.component.ts`:

```ts
    /** 端末に保存した畳み状態。サーバーは保存を読めないので、最初の描画は開いた形（spec 13.2） */
    readonly controlCollapsed = afterFirstRender(
        toSignal(TrainDiagramStore.controlCollapsed$, { initialValue: false }),
        false,
    );
```

`src/app/pages/operation/operation-table/operation-table.component.ts`:

```ts
    /** 端末に保存した運用群の絞り込み。サーバーは保存を読めないので、最初の描画は絞らない形（spec 13.2） */
    readonly selectedGroupNames = afterFirstRender(
        toSignal(OperationTableStore.selectedGroupNames$, {
            initialValue: [],
        }),
        NO_GROUP_NAMES,
    );
```

同じファイルのモジュールの先頭（`OperationTableStore.resetLoading();` の後）に足す:

```ts
/** 絞り込み無し。fallback を毎回作らないよう 1 つに */
const NO_GROUP_NAMES: string[] = [];
```

`src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts`:

```ts
    /** 今日のダイヤ。サーバーは今日を取らないので、最初の描画は無い形（spec 5.2） */
    readonly #todaysCalendarId = afterFirstRender(
        toSignal(inject(TodaysCalendarListStateQuery).todaysCalendarId$),
        undefined,
    );
```

各ファイルで、置き換えた signal を読んでいるテストを流す:

Run: `npx jest --testPathPatterns=src/app/pages/timetable/timetable-all-line src/app/pages/train-diagram src/app/pages/operation/operation-table src/app/pages/operation/operation-route-diagram`
Expected: PASS（jsdom にはサーバーの印が無いので、ブラウザでの動きは変わらない）

- [ ] **Step 4: 全線時刻表のサーバーの形のテストを書く**

`src/app/pages/timetable/timetable-all-line/timetable-all-line.component.spec.ts` の既存の TestBed の組み立て（`setup` などの関数）を使い、`PLATFORM_ID` を `'server'` にして、`UserStateQuery.canEditTimetable$` が `of(true)` でも `component.canEdit()` が `false` になるテストを足す:

```ts
    it('サーバーでは書ける役割でも編集の行を出さない', async () => {
        // このファイルの TestBed の組み立てに次の 2 つを足して作る:
        //   { provide: PLATFORM_ID, useValue: 'server' }
        //   { provide: UserStateQuery, useValue: { canEditTimetable$: of(true) } }
        expect(component.canEdit()).toBe(false);
    });
```

（組み立ての関数が providers を受けられない形なら、その関数に `extraProviders: Provider[] = []` の引数を足して `providers` の末尾に広げる。既存の呼び出しは変えない）

Run: `npx jest --testPathPatterns=src/app/pages/timetable/timetable-all-line/timetable-all-line.component.spec.ts`
Expected: PASS

- [ ] **Step 5: 失効の窓をサーバーで localStorage から読まない**

`src/app/core/query-cache/query-invalidator.ts`:

- import に `isPlatformBrowser`（`@angular/common`）と `PLATFORM_ID`（`@angular/core`）を足す
- フィールドに足す:

```ts
    /** サーバーには localStorage が無い。GET のたびに例外を作って握らないよう、先に分ける */
    readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
```

- `#readWrittenAt` の `let stored: number | null = null;` から `catch` の閉じ括弧までを次に置き換える:

```ts
        let stored: number | null = null;
        if (this.#isBrowser) {
            try {
                const value = localStorage.getItem(WRITTEN_AT_KEYS[tag]);
                stored = value === null ? null : Number(value);
            } catch {
                stored = null;
            }
        }
```

`query-invalidator.spec.ts` があれば、その組み立てに `{ provide: PLATFORM_ID, useValue: 'server' }` を足した場合に `localStorage.getItem` が呼ばれず `requestCache` が `'default'` を返すテストを足す:

```ts
    it('サーバーでは localStorage を読まない', () => {
        const getItem = jest.spyOn(Storage.prototype, 'getItem');
        // このファイルの組み立てに { provide: PLATFORM_ID, useValue: 'server' } を足して QueryInvalidator を作る
        expect(invalidator.requestCache('timetable')).toBe('default');
        expect(getItem).not.toHaveBeenCalled();
    });
```

Run: `npx jest --testPathPatterns=src/app/core/query-cache`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
npx prettier --write src/app/layout/components/header/header.component.ts src/app/layout/components/header/header.component.spec.ts src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts src/app/pages/timetable/timetable-all-line/timetable-all-line.component.spec.ts src/app/pages/train-diagram/train-diagram.component.ts src/app/pages/operation/operation-table/operation-table.component.ts src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts src/app/core/query-cache/query-invalidator.ts src/app/core/query-cache/query-invalidator.spec.ts
git add -u src/app
git add src/app/layout/components/header/header.component.spec.ts
git commit -m "feat: :sparkles: ログイン状態と端末の保存で形が変わる表示は最初の描画の後に出す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

（`git add -u src/app` の前に `git status --short` で、この Task で触ったファイルだけが変わっていることを確かめる）

---

### Task 5: サーバーは URL を補わない・キャッシュタグと置く長さ

駅別時刻表・全線時刻表・運用表・ダイヤグラムは、パラメータの足りない URL を「今日のダイヤ」「今の時刻」で補って移る。サーバーでそれをすると、行き先（今日・今）が CDN に残る。サーバーでは補わず、取りもせず、ページの骨組みのまま返す（ブラウザが起動した後に補う）。骨組みは誰に対しても同じなので長く置いてよい。

パラメータがそろっているときは、ダイヤのタグ（`calendar:<id>`）を付ける。運用行路図は取った運用のダイヤで付ける。過去の運用情報は日付のタグを付け、今日（鉄道の日付）以降を含む期間は短く置く（spec 6.2）。

**Files:**
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.ts`
- Modify: `src/app/pages/train-diagram/train-diagram.component.ts`
- Modify: `src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts`
- Create: `src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.ts`
- Create: `src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.spec.ts`
- Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.ts`
- Modify: 各ページの `*.component.spec.ts`（サーバーのテストを足す）
- Modify: `scripts/ssr-check.mjs`（`tag`・`cache` を足す）

**Interfaces:**
- Consumes: `SsrResponse`・`calendarCacheTag`・`sightingDateCacheTag`・`CachePolicy`（Task 1）
- Produces: `pastTimeCacheHints(dates: readonly string[], now: Date): { policy: CachePolicy; tags: string[] }`

- [ ] **Step 1: 過去の運用情報の置き方のテストを書く**

`src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.spec.ts`:

```ts
import { pastTimeCacheHints } from './past-time-cache-hints.util';

describe('pastTimeCacheHints', () => {
    // 2026-10-24 12:00（鉄道の日付も 10-24）
    const noon = new Date(2026, 9, 24, 12, 0);
    // 2026-10-25 02:00（鉄道の日付はまだ 10-24）
    const lateNight = new Date(2026, 9, 25, 2, 0);

    it('日付が無い（検索前）は長く置き、タグは無い', () => {
        expect(pastTimeCacheHints([], noon)).toEqual({
            policy: 'long',
            tags: [],
        });
    });

    it('過ぎた日だけなら長く置き、日付ごとのタグを付ける', () => {
        expect(pastTimeCacheHints(['2026-10-01', '2026-10-02'], noon)).toEqual({
            policy: 'long',
            tags: ['sighting-date:2026-10-01', 'sighting-date:2026-10-02'],
        });
    });

    it('今日を含むなら短く置く', () => {
        expect(
            pastTimeCacheHints(['2026-10-23', '2026-10-24'], noon).policy,
        ).toBe('short');
    });

    it('先の日を含むなら短く置く（これから目撃が増える）', () => {
        expect(pastTimeCacheHints(['2026-10-30'], noon).policy).toBe('short');
    });

    it('4 時までは前日を今日として数える', () => {
        expect(pastTimeCacheHints(['2026-10-24'], lateNight).policy).toBe(
            'short',
        );
        expect(pastTimeCacheHints(['2026-10-23'], lateNight).policy).toBe(
            'long',
        );
    });
});
```

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-past-time/utils/past-time-cache-hints`
Expected: FAIL（`Cannot find module`）

- [ ] **Step 2: 過去の運用情報の置き方を書く**

`src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.ts`:

```ts
import { format } from 'date-fns';
import {
    sightingDateCacheTag,
    type CachePolicy,
} from 'src/app/core/ssr/cache-control';
import { getRailwayDate } from 'src/app/core/utils/railway-day';

/**
 * 過去の運用情報の HTML を CDN に置く長さとタグ（spec 6.2）。
 * 目撃は 1 件ごとに失効させると無料枠を超えるので、今日（鉄道の日付）以降を含む期間は短く置いて賄う。
 * 過ぎた日は長く置き、後日の訂正のときだけ API が日付のタグで失効させる。
 */
export function pastTimeCacheHints(
    dates: readonly string[],
    now: Date,
): { policy: CachePolicy; tags: string[] } {
    if (!dates.length) return { policy: 'long', tags: [] };
    const today = format(getRailwayDate(now), 'yyyy-MM-dd');
    return {
        policy: dates.some((date) => date >= today) ? 'short' : 'long',
        tags: dates.map(sightingDateCacheTag),
    };
}
```

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-past-time/utils/past-time-cache-hints`
Expected: PASS（5 件）

- [ ] **Step 3: 過去の運用情報で使う**

`src/app/pages/operation/operation-past-time/operation-past-time.component.ts`:

- import に足す: `SsrResponse`（`src/app/core/ssr/ssr-response`）・`pastTimeCacheHints`（`./utils/past-time-cache-hints.util`）
- フィールドに `readonly #ssrResponse = inject(SsrResponse);`
- paramMap の購読の中、`OperationPastTimeStore.setIncludeInvalidated(...)` の後・`this.fetchData();` の前に足す:

```ts
                // サーバーで描くときの置き方。ブラウザでは何もしない（spec 6.2）
                const hints = pastTimeCacheHints(
                    OperationPastTimeStore.dates,
                    new Date(),
                );
                this.#ssrResponse.setCachePolicy(hints.policy);
                this.#ssrResponse.addCacheTags(hints.tags);
```

- [ ] **Step 4: 駅別時刻表を直す**

`src/app/pages/timetable/timetable-station/timetable-station.component.ts`:

- import に `isPlatformServer`（`@angular/common`）・`PLATFORM_ID`（`@angular/core`）・`SsrResponse`・`calendarCacheTag`（`src/app/core/ssr/...`）を足す
- フィールドに足す:

```ts
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #ssrResponse = inject(SsrResponse);
```

- paramMap の購読の中、`if (!rawCalendarId || !rawStationId || tripDirection === null) {` の直後（ブロックの先頭）に足す:

```ts
                    // サーバーでは補わない。補う先は今日のダイヤなので、CDN に置く HTML に今日を入れない。
                    // 骨組みのまま返し、ブラウザで起動した後に補う（spec 13.2）
                    if (this.#isServer) return;
```

- `TimetableStationStore.setCalendarId(calendarId);` の直前に足す:

```ts
                if (calendarId) {
                    this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
                }
```

（ブラウザで今日のダイヤが取れなかったときは `null` のまま下へ落ちるので、`if` で包む）

- [ ] **Step 5: 全線時刻表を直す**

`src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`:

- import と 2 つのフィールド（`#isServer`・`#ssrResponse`）を駅別時刻表と同じく足す
- paramMap の購読の中、`if (calendarId && tripDirection === null) {` の直後に足す:

```ts
                    // サーバーでは補わない。骨組みのまま返し、ブラウザで補う（駅別時刻表と同じ）
                    if (this.#isServer) return;
```

- `TimetableAllLineStore.setCalendarId(calendarId);` の直前に足す:

```ts
                if (calendarId) {
                    this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
                }
```

- [ ] **Step 6: 運用表を直す**

`src/app/pages/operation/operation-table/operation-table.component.ts`:

- import と 2 つのフィールドを足す
- paramMap の購読の先頭（`const calendarId = ...` の前）に足す:

```ts
                // サーバーでは今日のダイヤで補わない。今日を取っていないので、取りにも行かず骨組みのまま返す
                if (this.#isServer && !paramMap.get('calendar_id')) return;
```

- `OperationTableStore.setCalendarId(calendarId ?? null);` の直前に足す:

```ts
                if (calendarId) {
                    this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
                }
```

- [ ] **Step 7: ダイヤグラムを直す**

`src/app/pages/train-diagram/train-diagram.component.ts`:

- import と 2 つのフィールドを足す
- paramMap の購読の中、`const missingParams = ...;` の直後に足す:

```ts
                // サーバーでは今日のダイヤ・今の時刻で補わない。骨組みのまま返し、ブラウザで補う（spec 13.2）
                if (this.#isServer && missingParams) return;
```

- `TrainDiagramStore.setCalendarId(calendarId ?? null);` の直前に足す:

```ts
                if (calendarId) {
                    this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
                }
```

- [ ] **Step 8: 運用行路図にタグを付ける**

`src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts`:

- import に `SsrResponse`・`calendarCacheTag` を足し、フィールドに `readonly #ssrResponse = inject(SsrResponse);`
- `fetchData` の中、`OperationRouteDiagramStore.initializeSelectedRouteIds();` の直前に足す:

```ts
        // 運用の URL にダイヤは無い。取った運用のダイヤでタグを付ける（その時刻表が書き換わったら失効）
        const calendarId = OperationRouteDiagramStore.calendarId;
        if (calendarId) {
            this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
        }
```

- [ ] **Step 9: ページのサーバーのテストを足す**

駅別時刻表・全線時刻表・運用表・ダイヤグラムの各 `*.component.spec.ts` に、そのファイルの既存の組み立て（paramMap を渡して作る関数）を使って次の 2 件を足す。組み立ての関数が providers を受けられなければ、Task 4 Step 4 と同じく `extraProviders` の引数を足す。

```ts
    it('サーバーではパラメータの足りない URL を補わず、取りにも行かない', async () => {
        // 組み立てに { provide: PLATFORM_ID, useValue: 'server' } を足し、パラメータの無い paramMap で作る
        expect(navigateSpy).not.toHaveBeenCalled();
        expect(serviceFetchSpy).not.toHaveBeenCalled();
    });

    it('サーバーではダイヤのタグを付ける', async () => {
        // 組み立てに次の 2 つを足し、calendar_id のそろった paramMap で作る:
        //   { provide: PLATFORM_ID, useValue: 'server' }
        //   { provide: SsrResponse, useValue: { addCacheTags, setCachePolicy: jest.fn() } }
        expect(addCacheTags).toHaveBeenCalledWith(['calendar:cal-1']);
    });
```

`navigateSpy` は `jest.spyOn(TestBed.inject(Router), 'navigate')`、`serviceFetchSpy` はそのページの service の最初の取得（駅別時刻表なら `fetchCalendar`、全線時刻表なら `fetchStations`、運用表なら `fetchCalendar`、ダイヤグラムなら `fetchTripClasses`）の `jest.fn`、`addCacheTags` は `jest.fn()`。全線時刻表の「補わない」は `calendar_id` だけあって `trip_direction` の無い paramMap で確かめる（`calendar_id` も無いときは今も取らない）。

Run: `npx jest --testPathPatterns=src/app/pages/timetable src/app/pages/operation src/app/pages/train-diagram`
Expected: PASS

- [ ] **Step 10: 手元の確かめの期待を足す**

`scripts/ssr-check.mjs` の `PATHS` を次のとおり変える:

- `/operation/past-time;reference_date=2026-10-01;days=3` の行に `tag: 'sighting-date:2026-10-01',`
- `` `/operation/past-time;reference_date=${RECENT_START};days=7` `` の行の `cache` を `SHORT` にし、`tag: \`sighting-date:${RECENT_START}\`,` を足す
- `` `/operation/table;calendar_id=${CALENDAR}` ``・`` `/timetable/station;calendar_id=…` ``・`` `/timetable/all-line;calendar_id=…` ``・`` `/train-diagram;calendar_id=…` `` の 4 行に `tag: \`calendar:${CALENDAR}\`,`
- `` `/operation/route-diagram;operation_id=${OPERATION}` `` の行に `tag: \`calendar:${CALENDAR}\`,`（01K は平日 2026-03-14 の運用。違うダイヤが付いたら、取った運用のダイヤが正しいかを API で確かめ、正しければ期待のほうを直す）

サンドボックスの外で:

```bash
npm run build:ssr-check
npm run ssr:check
```

Expected: 全行 OK（2 周とも）。パラメータの無い 4 ページは 200・サーバーで描いた骨組み・long。

- [ ] **Step 11: コミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-station/timetable-station.component.ts src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts src/app/pages/operation/operation-table/operation-table.component.ts src/app/pages/train-diagram/train-diagram.component.ts src/app/pages/operation/operation-route-diagram/operation-route-diagram.component.ts src/app/pages/operation/operation-past-time/operation-past-time.component.ts src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.ts src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.spec.ts scripts/ssr-check.mjs
git status --short
git add -u src/app scripts/ssr-check.mjs
git add src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.ts src/app/pages/operation/operation-past-time/utils/past-time-cache-hints.util.spec.ts
git commit -m "feat: :sparkles: サーバーでは URL を補わず、ダイヤと日付のキャッシュタグを付ける" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

（prettier は、spec を足したファイルにもかける）

---

### Task 6: 運用表のカードをサーバーでも描く（incremental hydration）

運用表のカードは `@defer (on viewport)` で、画面に入ったものだけ描く（104 枚を一度に描くと約 1 秒）。サーバーでは `@defer` は場所取りのまま描かれ、HTML にカードが入らない。incremental hydration の `hydrate on viewport` を足すと、サーバーはカードの中身まで描き、ブラウザは画面に入ったカードから引き継ぐ。サーバーの HTML が無い起動（Service Worker の殻）では今までどおり `on viewport` で描く。

**Files:**
- Modify: `src/app/app.config.ts`（`withNoIncrementalHydration` → `withIncrementalHydration`）
- Modify: `src/app/pages/operation/operation-table/operation-table.component.html`

- [ ] **Step 1: incremental hydration にする**

`src/app/app.config.ts`:

- import の `withNoIncrementalHydration` を `withIncrementalHydration` に替える
- `provideClientHydration(withNoIncrementalHydration()),` を次に替える:

```ts
        // 運用表のカードの @defer に hydrate の条件を付け、サーバーでは中身まで描き、
        // ブラウザは画面に入ったものから引き継ぐ（hydration 前の操作は再生される）
        provideClientHydration(withIncrementalHydration()),
```

- [ ] **Step 2: カードの `@defer` に hydrate の条件を足す**

`src/app/pages/operation/operation-table/operation-table.component.html` の

```html
                    @defer (on viewport; prefetch on idle) {
```

を次に替え、上のコメントの末尾に 1 行足す:

```html
                         サーバーでは中身まで描き（検索のため）、ブラウザは画面に入ったものから引き継ぐ（hydrate on viewport） -->
                    @defer (on viewport; prefetch on idle; hydrate on viewport) {
```

（コメントの閉じ `-->` は 1 つだけにする。元のコメントの最後の行の `-->` を消して、この行で閉じる）

- [ ] **Step 3: サーバーの HTML にカードが入ることを確かめる**

サンドボックスの外で:

```bash
npm run build:ssr-check
node /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/check-one.mjs "/operation/table;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb"
```

Expected: `200 …ms …B rendered`、ERROR 無し。大きさ（B）を `.context/ssr-plan/ssr-sizes-2a.txt` に書き留める。続けて HTML にカードの要素が入っていることを確かめる:

```bash
curl -s "http://localhost:4300/operation/table;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb" -o /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/operation-table.html
```

（`check-one.mjs` はサーバーを止めるので、curl の前に `PORT=4300 node dist/sotetsu-lab-v3-client/server/server.mjs` を別に起動しておき、終わったら止める）

```bash
grep -c "app-operation-table-card" /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/operation-table.html
```

Expected: 1 以上（カードがサーバーで描かれている）。0 なら hydrate の条件が効いていない。`provideClientHydration` の引数と `@defer` の書き方を angular.dev の incremental hydration の文書（context7）で確かめ直す。

- [ ] **Step 4: テストを流してコミット**

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-table`
Expected: PASS

```bash
npx prettier --write src/app/app.config.ts
git add src/app/app.config.ts src/app/pages/operation/operation-table/operation-table.component.html
git commit -m "feat: :sparkles: 運用表のカードをサーバーでも描き、画面に入ったものから引き継ぐ" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

（`operation-table.component.html` は prettier をかけない。SVG・テンプレートの整形で壊れることがある）

---

### Task 7: 題名・説明・OGP

spec 5.1: ページごとに題名・説明・`og:title`・`og:description`・`og:url` を入れる。`og:image` はサイト共通の 1 枚。題名に入れる名前は、そのページで取っているデータから作る（題名のためだけに API を叩かない）。

`TitleService` を `PageMeta` に置き換える（題名と OGP を 1 か所で入れる）。

**Files:**
- Create: `src/app/core/ssr/page-meta.ts`
- Create: `src/app/core/ssr/page-meta.spec.ts`
- Create: `src/app/core/utils/format-page-title.util.ts`
- Create: `src/app/core/utils/format-page-title.util.spec.ts`
- Delete: `src/app/core/services/title.service.ts`
- Modify: `src/app/core/resolvers/page.resolver.ts`・`page.resolver.spec.ts`
- Modify: `src/app/pages/library/library-vehicle/library-vehicle.component.ts`
- Modify: `src/environments/environment.ts`・`src/environments/environment.prod.ts`（`siteUrl`）
- Modify: 各ページの `*.route.ts`（`data.description`）
- Modify: 駅別時刻表・全線時刻表・運用表・運用行路図・ダイヤグラム・過去の運用情報の `*.component.ts`（題名を詳しくする）
- Modify: `scripts/ssr-check.mjs`（`title` を足す）

**Interfaces:**
- Produces: `PageMeta`（`set(params: { title?: string; description?: string; url?: string }): void`・`setTitle(title: string): void`）
- Produces: `formatPageTitle(base: string, details: readonly (string | null | undefined)[]): string`

- [ ] **Step 1: 題名の組み立てのテストを書く**

`src/app/core/utils/format-page-title.util.spec.ts`:

```ts
import { formatPageTitle } from './format-page-title.util';

describe('formatPageTitle', () => {
    it('詳しいところを括弧に「・」でつなぐ', () => {
        expect(
            formatPageTitle('二俣川駅 時刻表', ['下り', '2026/3/14改正 平日']),
        ).toBe('二俣川駅 時刻表（下り・2026/3/14改正 平日）');
    });

    it('空のところは落とす。全部空なら元の題名だけ', () => {
        expect(formatPageTitle('運用表', [null, undefined, ''])).toBe('運用表');
    });
});
```

Run: `npx jest --testPathPatterns=src/app/core/utils/format-page-title`
Expected: FAIL

- [ ] **Step 2: 題名の組み立てを書く**

`src/app/core/utils/format-page-title.util.ts`:

```ts
/** ページの題名。取ったデータで詳しくするところを括弧に入れる（例「二俣川駅 時刻表（下り・2026/3/14改正 平日）」） */
export function formatPageTitle(
    base: string,
    details: readonly (string | null | undefined)[],
): string {
    const parts = details.filter((part): part is string => !!part);
    return parts.length ? `${base}（${parts.join('・')}）` : base;
}
```

Run: `npx jest --testPathPatterns=src/app/core/utils/format-page-title`
Expected: PASS

- [ ] **Step 3: サイトの URL を environment に足す**

`src/environments/environment.prod.ts` の `backendUrl` の行の後に:

```ts
    /** 画面の URL の起点（OGP の og:url・og:image） */
    siteUrl: 'https://v3.sotetsu-lab.com',
```

`src/environments/environment.ts` の `backendUrl` の行の後に:

```ts
    /** 画面の URL の起点（OGP の og:url・og:image） */
    siteUrl: 'http://localhost:4200',
```

- [ ] **Step 4: `PageMeta` のテストを書く**

`src/app/core/ssr/page-meta.spec.ts`:

```ts
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { DEFAULT_DESCRIPTION, PageMeta } from './page-meta';

function meta(selector: string): string | null {
    return (
        TestBed.inject(DOCUMENT)
            .head.querySelector(`meta[${selector}]`)
            ?.getAttribute('content') ?? null
    );
}

describe('PageMeta', () => {
    let pageMeta: PageMeta;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        pageMeta = TestBed.inject(PageMeta);
    });

    it('題名・説明・OGP をそろえて入れる', () => {
        pageMeta.set({
            title: '運用表',
            description: '運用表の説明',
            url: '/operation/table;calendar_id=x',
        });

        expect(TestBed.inject(DOCUMENT).title).toBe('運用表 - Sotetsu Lab. v3');
        expect(meta('name="description"')).toBe('運用表の説明');
        expect(meta('property="og:title"')).toBe('運用表 - Sotetsu Lab. v3');
        expect(meta('property="og:description"')).toBe('運用表の説明');
        expect(meta('property="og:url"')).toBe(
            `${environment.siteUrl}/operation/table;calendar_id=x`,
        );
        expect(meta('property="og:image"')).toBe(
            `${environment.siteUrl}/assets/icons/android-chrome-512x512.png`,
        );
        expect(meta('property="og:type"')).toBe('website');
        expect(meta('property="og:site_name"')).toBe('Sotetsu Lab. v3');
        expect(meta('name="twitter:card"')).toBe('summary');
    });

    it('題名が空ならサイト名だけ・説明が無ければサイトの説明', () => {
        pageMeta.set({});

        expect(TestBed.inject(DOCUMENT).title).toBe('Sotetsu Lab. v3');
        expect(meta('name="description"')).toBe(DEFAULT_DESCRIPTION);
    });

    it('URL を渡さなければ og:url を外す', () => {
        pageMeta.set({ url: '/a' });
        pageMeta.set({ title: 'x' });

        expect(meta('property="og:url"')).toBeNull();
    });

    it('setTitle は題名と og:title だけ替える', () => {
        pageMeta.set({ title: '運用表', description: '説明' });
        pageMeta.setTitle('運用表（2026/3/14改正 平日）');

        expect(TestBed.inject(DOCUMENT).title).toBe(
            '運用表（2026/3/14改正 平日） - Sotetsu Lab. v3',
        );
        expect(meta('property="og:title"')).toBe(
            '運用表（2026/3/14改正 平日） - Sotetsu Lab. v3',
        );
        expect(meta('name="description"')).toBe('説明');
    });
});
```

Run: `npx jest --testPathPatterns=src/app/core/ssr/page-meta`
Expected: FAIL

- [ ] **Step 5: `PageMeta` を書く**

`src/app/core/ssr/page-meta.ts`:

```ts
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

const SITE_NAME = 'Sotetsu Lab. v3';

/** index.html の description と同じ。ページが説明を持たないときに使う */
export const DEFAULT_DESCRIPTION =
    '相模鉄道こと相鉄線に関する情報を提供する、相鉄ファンサイトです。運用目撃情報・運用表・時刻表等を公開しています。';

/** SNS のプレビューに出すサイト共通の 1 枚（spec 5.1。ページごとの画像は作らない） */
const OG_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';

/**
 * ページの題名・説明・OGP を入れる係（spec 5.1）。サーバーで描いた HTML に入り、検索と SNS のプレビューに使われる。
 * ページを開いたときに pageResolver が set を呼び、取ったデータで詳しくするページが setTitle を呼ぶ。
 */
@Injectable({ providedIn: 'root' })
export class PageMeta {
    readonly #title = inject(Title);
    readonly #meta = inject(Meta);

    set(params: { title?: string; description?: string; url?: string }): void {
        this.setTitle(params.title ?? '');
        const description = params.description ?? DEFAULT_DESCRIPTION;
        this.#meta.updateTag({ name: 'description', content: description });
        this.#meta.updateTag({
            property: 'og:description',
            content: description,
        });
        this.#meta.updateTag({ property: 'og:type', content: 'website' });
        this.#meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
        this.#meta.updateTag({ property: 'og:locale', content: 'ja_JP' });
        this.#meta.updateTag({
            property: 'og:image',
            content: environment.siteUrl + OG_IMAGE_PATH,
        });
        this.#meta.updateTag({ name: 'twitter:card', content: 'summary' });
        if (params.url === undefined) {
            this.#meta.removeTag('property="og:url"');
        } else {
            this.#meta.updateTag({
                property: 'og:url',
                content: environment.siteUrl + params.url,
            });
        }
    }

    /** 取ったデータで題名を詳しくするとき。題名と og:title だけ替える */
    setTitle(title: string): void {
        const full = title ? `${title} - ${SITE_NAME}` : SITE_NAME;
        this.#title.setTitle(full);
        this.#meta.updateTag({ property: 'og:title', content: full });
    }
}
```

Run: `npx jest --testPathPatterns=src/app/core/ssr/page-meta`
Expected: PASS（4 件）

- [ ] **Step 6: `pageResolver` を `PageMeta` にする**

`src/app/core/resolvers/page.resolver.ts`:

- `import { TitleService } from 'src/app/core/services/title.service';` を `import { PageMeta } from 'src/app/core/ssr/page-meta';` に替える
- コメントの「route.data.title でタイトルを付け」を「route.data の title・description で題名・説明・OGP を入れ」に替える
- `return (route) => {` を `return (route, state) => {` に替え、`inject(TitleService).setTitle(route.data.title);` を次に替える:

```ts
        inject(PageMeta).set({
            title: route.data.title,
            description: route.data.description,
            url: state.url,
        });
```

`src/app/core/resolvers/page.resolver.spec.ts`:

- `TitleService` の import を `PageMeta`（`src/app/core/ssr/page-meta`）に替え、`setTitle` の mock を `set` にする（`let set: jest.Mock;`・`set = jest.fn();`・`{ provide: PageMeta, useValue: { set } }`）
- `run` の route を `{ data: { title: '運用表', description: '説明' } }`、state を `{ url: '/operation/table' } as RouterStateSnapshot` にする
- 1 件目を次に替える:

```ts
    it('route.data と URL で題名・説明・OGP を入れる', () => {
        run(pageResolver()).subscribe();

        expect(set).toHaveBeenCalledWith({
            title: '運用表',
            description: '説明',
            url: '/operation/table',
        });
    });
```

Run: `npx jest --testPathPatterns=src/app/core/resolvers/page.resolver`
Expected: PASS

- [ ] **Step 7: 相鉄の車両のページを直し、`TitleService` を消す**

`src/app/pages/library/library-vehicle/library-vehicle.component.ts` の `TitleService` の import・フィールド・constructor を次に替える:

```ts
import { PageMeta } from 'src/app/core/ssr/page-meta';
```

```ts
    constructor() {
        // 取得データが無く resolver を持たないページなので、ここで題名・説明・OGP を入れる（audit M10）
        inject(PageMeta).set({
            title: '相鉄の車両',
            description: LIBRARY_VEHICLE_DESCRIPTION,
            url: '/library/vehicle',
        });
    }
```

同じファイルの `@Component` の前に:

```ts
const LIBRARY_VEHICLE_DESCRIPTION =
    '相鉄の車両の形式ごとの解説。編成・製造・装備の移り変わりを載せています。';
```

消す前に参照が残っていないことを確かめる:

```bash
grep -rn "title.service" src
```

Expected: 何も出ない（`library-vehicle` と `page.resolver` を替えた後）。出なければ消す:

```bash
git rm src/app/core/services/title.service.ts
```

- [ ] **Step 8: 各ページの説明を route に足す**

それぞれの `*.route.ts` の `data` に `description` を足す（文言はこのとおり）:

| ファイル | description |
|---|---|
| `pages/dashboard/dashboard.route.ts` | 足さない（サイトの説明を使う） |
| `pages/operation/operation-real-time/operation-real-time.route.ts` | `相鉄線の運用ごとに、いまどの編成が走っているかを目撃情報から一覧にします。` |
| `pages/operation/operation-past-time/operation-past-time.route.ts` | `相鉄線の過去の運用目撃情報を、日付ごと・編成ごとに一覧にします。` |
| `pages/operation/operation-table/operation-table.route.ts` | `相鉄線の運用表。ダイヤごとに、各運用が受け持つ列車を順に並べます。` |
| `pages/operation/operation-route-diagram/operation-route-diagram.route.ts` | `相鉄線の運用行路図。1 つの運用が 1 日に走る列車を路線図の上に描きます。` |
| `pages/timetable/timetable-station/timetable-station.route.ts` | `相鉄線と直通先の駅別時刻表。ダイヤ・方向ごとに、列車の種別・行先・運用番号を載せます。` |
| `pages/timetable/timetable-all-line/timetable-all-line.route.ts` | `相鉄線と直通先の全線時刻表。ダイヤ・方向ごとに、全列車の各駅の時刻を並べます。` |
| `pages/train-diagram/train-diagram.route.ts` | `相鉄線と直通先の列車ダイヤグラム。ダイヤごとに全列車の走りを線で描きます。` |
| `pages/train-location/train-location.route.ts` | `相鉄線の列車位置情報。時刻表と目撃情報から、いまの列車の位置を路線図に描きます。` |
| `pages/login/login.route.ts`・`pages/register/register.route.ts`・`timetable-edit-form.route.ts` | 足さない（ブラウザで描くページ） |

例（運用表）:

```ts
        data: {
            title: '運用表',
            description:
                '相鉄線の運用表。ダイヤごとに、各運用が受け持つ列車を順に並べます。',
        },
```

- [ ] **Step 9: 取ったデータで題名を詳しくする**

6 ページの root component で、import に `PageMeta`（`src/app/core/ssr/page-meta`）・`formatPageTitle`（`src/app/core/utils/format-page-title.util`）・`effect`（`@angular/core`。無ければ）・必要なら `formatCalendarSummaryLabel`（`src/app/core/utils/format-calendar-summary-label.util`）を足し、フィールドに `readonly #pageMeta = inject(PageMeta);` と次の `pageTitle` を足し、constructor の先頭に

```ts
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        effect(() => this.#pageMeta.setTitle(this.pageTitle()));
```

を足す。`pageTitle` はページごとに次のとおり:

駅別時刻表（`timetable-station.component.ts`。`stationOptions`・`stationId`・`selectedCalendar`・`tripDirection` は既にある）:

```ts
    readonly pageTitle = computed(() => {
        const stationName = this.stationOptions().find(
            (station) => station.stationId === this.stationId(),
        )?.stationName;
        const calendar = this.selectedCalendar();
        return formatPageTitle(
            stationName ? `${stationName}駅 時刻表` : '駅別時刻表',
            [
                tripDirectionLabel.get(this.tripDirection()),
                calendar ? formatCalendarSummaryLabel(calendar) : null,
            ],
        );
    });
```

全線時刻表（`timetable-all-line.component.ts`。`calendar`・`tripDirection` は既にある。`tripDirectionLabel` を `src/app/libs/trip/usecase/constants/trip.constant` から import）:

```ts
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('全線時刻表', [
            tripDirectionLabel.get(this.tripDirection()),
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });
```

運用表（`operation-table.component.ts`。`calendar` は既にある）:

```ts
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('運用表', [
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });
```

運用行路図（`operation-route-diagram.component.ts`。`operation`・`calendar` は既にある）:

```ts
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('運用行路図', [
            this.operation()?.operationNumber,
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });
```

ダイヤグラム（`train-diagram.component.ts`。`#calendars`・`calendarId` は既にある）:

```ts
    readonly pageTitle = computed(() => {
        const calendar = this.#calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        return formatPageTitle('ダイヤグラム', [
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });
```

過去の運用情報（`operation-past-time.component.ts`。`#referenceDate`・`#days` は既にある。`format`・`parse` を `date-fns` から import）:

```ts
    readonly pageTitle = computed(() => {
        const referenceDate = this.#referenceDate();
        const days = this.#days();
        return formatPageTitle('過去の運用情報', [
            referenceDate && days
                ? `${format(parse(referenceDate, 'yyyy-MM-dd', new Date()), 'yyyy/M/d')} から ${days} 日間`
                : null,
        ]);
    });
```

（`calendar` が `toSignal` の初期値 `undefined` を持つ型なら、そのまま三項で null にしてよい。`tripDirectionLabel.get` に `null` を渡すと `undefined` が返り、`formatPageTitle` が落とす）

各ページの spec を流す:

Run: `npx jest --testPathPatterns=src/app/pages src/app/core`
Expected: PASS。`TitleService` を provide していた spec があれば落ちるので、`PageMeta` の mock（`{ set: jest.fn(), setTitle: jest.fn() }`）に替える

- [ ] **Step 10: 手元の確かめで題名を見る**

`scripts/ssr-check.mjs` の `PATHS` に `title` を足す:

- 駅別時刻表（パラメータのそろった行）: `title: '二俣川駅 時刻表（上り・'`（`trip_direction=0` が上り。`tripDirectionLabel` で 0 が「下り」なら `'二俣川駅 時刻表（下り・'`）
- 全線時刻表（そろった行）: `title: '全線時刻表（'`
- 運用表（そろった行）: `title: '運用表（'`
- 運用行路図: `title: '運用行路図（01K・'`
- ダイヤグラム（そろった行）: `title: 'ダイヤグラム（'`
- `/operation/past-time;reference_date=2026-10-01;days=3`: `title: '過去の運用情報（2026/10/1 から 3 日間）'`
- `/library/vehicle`: `title: '相鉄の車両 - Sotetsu Lab. v3'`
- `/no-such-page`: `title: 'ページが見つかりません'`

サンドボックスの外で:

```bash
npm run build:ssr-check
npm run ssr:check
```

Expected: 全行 OK（2 周とも）

- [ ] **Step 11: コミット**

`git status --short` で触ったファイルを確かめ、変えた `.ts` を 1 つずつ prettier にかける（`npx prettier --write <file> <file> …`。html はかけない）。

```bash
git add -u src scripts/ssr-check.mjs
git add src/app/core/ssr/page-meta.ts src/app/core/ssr/page-meta.spec.ts src/app/core/utils/format-page-title.util.ts src/app/core/utils/format-page-title.util.spec.ts
git commit -m "feat: :sparkles: ページごとの題名・説明・OGP を入れる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

---

### Task 8: 通しの確かめと ADR

**Files:**
- Create: `docs/adr/0013-ssr-rendering-rules.md`
- 記録: `/home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/`（git 管理外）

この Task は実装役でなく、まとめ役（計画を回している側）が行う。Step 3〜5 は Playwright MCP を使う。

- [ ] **Step 1: 全体のテスト・lint・本番ビルド**

サンドボックスの外で:

```bash
npx jest > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/jest-2a.txt 2>&1
npm run lint
npm run build:prod
```

Expected: jest は全件 PASS（全線時刻表の spec が負荷で時間切れになったら、その spec だけ単独で流し直して PASS を確かめ、記録に残す）。lint 0。`build:prod` 成功、`dist/sotetsu-lab-v3-client/browser/index.html` と `ngsw.json` がある（`ssr: false` のままなので本番の配り方は変わらない）。

- [ ] **Step 2: 手元の SSR を通しで叩き、大きさを残す**

```bash
npm run build:ssr-check
npm run ssr:check > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/ssr-check-2a-final.txt
```

Expected: 全行 OK（2 周とも）。各行の大きさ（B）を見て、5,000,000 B を超えるページがあれば `ssr-sizes-2a.txt` に書き、2c（Lambda の応答は 6MB まで。圧縮で賄う）への持ち越しとして PR 本文に書く。

- [ ] **Step 3: ブラウザで引き継いだとき（hydration）に食い違いが出ないことを確かめる**

別のシェルで手元の SSR を起動する（サンドボックスの外）:

```bash
PORT=4300 TZ=Asia/Tokyo node dist/sotetsu-lab-v3-client/server/server.mjs
```

Playwright MCP の `browser_run_code_unsafe` で次を流す。本番の API・BFF は localhost からの CORS を許していない恐れがあるので、Playwright の側で取り次ぐ。GA の送信は止め、アプリのエラー（`ErrorHandlerService` が GA に送る `app_error`）を `dataLayer` から拾う:

```js
async (page) => {
    const CALENDAR = 'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb';
    const STATION = 'fb799a2e-c96c-4629-8a7d-e8b57f8e6930';
    const OPERATION = '8553e26c-38c0-4895-9ff5-b4f02572df99';
    const ROUTE = '2e22124f-04eb-475f-929a-7dba25561638';
    const PATHS = [
        '/',
        '/operation/real-time',
        '/operation/past-time;reference_date=2026-10-01;days=3',
        `/operation/table;calendar_id=${CALENDAR}`,
        `/operation/route-diagram;operation_id=${OPERATION}`,
        `/timetable/station;calendar_id=${CALENDAR};station_id=${STATION};trip_direction=0`,
        `/timetable/all-line;calendar_id=${CALENDAR};trip_direction=0`,
        `/train-diagram;calendar_id=${CALENDAR};route_ids=${ROUTE};time=0600`,
        `/train-location;route_id=${ROUTE}`,
        '/library/vehicle',
        '/no-such-page',
        '/timetable/station',
    ];
    const ORIGIN = 'http://localhost:4300';
    const cors = {
        'access-control-allow-origin': ORIGIN,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
    await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
    await page.route(/https:\/\/(api\.sotetsu-lab\.com|v3\.sotetsu-lab\.com\/api)\//, async (route) => {
        if (route.request().method() === 'OPTIONS') {
            return route.fulfill({ status: 204, headers: cors });
        }
        const response = await route.fetch();
        return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    });
    await page.addInitScript(() => {
        window.dataLayer = [];
    });
    const consoleErrors = [];
    page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(`${page.url()} ${m.text()}`);
    });
    const apiRequests = {};
    page.on('request', (req) => {
        if (req.url().startsWith('https://api.sotetsu-lab.com')) {
            const key = new URL(page.url()).pathname;
            (apiRequests[key] ??= []).push(req.url());
        }
    });
    const results = [];
    for (const path of PATHS) {
        await page.goto(ORIGIN + path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        const appErrors = await page.evaluate(() =>
            Array.from(window.dataLayer)
                .filter((e) => e[0] === 'event' && e[1] === 'app_error')
                .map((e) => e[2]?.error_message),
        );
        results.push({ path, finalUrl: page.url(), appErrors });
    }
    return { results, consoleErrors, apiRequests };
}
```

Expected:
- どのページも `appErrors` が空（`NG05xx` の hydration の食い違いが無い）。`consoleErrors` に hydration の文言（`NG0500`〜`NG0507`）が無い
- `/timetable/station`（パラメータ無し）は `finalUrl` がブラウザで補った URL になっている
- 中身まで描くページ（運用表・駅別時刻表・全線時刻表・運用行路図・ダイヤグラム・過去の運用情報）で、`apiRequests` にサーバーで取ったのと同じ取得が無い（HttpTransferCache が効いている）。今日のダイヤでない限り、駅別時刻表は目撃の断面も取らない

食い違いが出たら: エラーの文言と、どの要素で食い違ったかを `.context/ssr-plan/hydration-2a.txt` に残す。原因が「ブラウザの最初の描画だけ値が違う signal」なら、その signal を Task 4 と同じく `afterFirstRender` で包む実装役を 1 回だけ出す（同じ直しを 2 回試して直らなければ止めて、記録を持って計画を見直す）。

- [ ] **Step 4: 見た目を比べる**

同じく Playwright MCP で、駅別時刻表・全線時刻表・運用表について、(a) JavaScript を止めて開いた画面（サーバーの HTML だけ）と (b) 普通に開いた画面を、幅 390 と 1440 でスクリーンショットに撮り、並べて見る。(a) にもデータの表とカードが出ていること、(b) に移ったときに大きな跳ね（表が消えて骨組みに戻る・位置がずれる）が無いことを目で確かめる。撮った画像は `.context/ssr-plan/` に置く。

- [ ] **Step 5: ログインして開いても HTML に人の情報が入らないことを確かめる**

`curl` でクッキー無しに叩いた HTML（`ssr:check` と同じ）に、ヘッダーの挨拶が「ゲスト さん」で入り、全線時刻表に編集の行（`編集`・`コピー` のボタン）が無いことを確かめる:

```bash
curl -s "http://localhost:4300/timetable/all-line;calendar_id=de94e6b3-6d6c-445e-9c35-c8f39bacf3fb;trip_direction=0" -o /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/all-line.html
grep -c "ゲスト さん" /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/all-line.html
```

Expected: 1 以上。サーバーはクッキーを API に渡さないので、ブラウザでログインしていても同じ（spec 5.3）。

- [ ] **Step 6: ADR を書く**

`docs/adr/0013-ssr-rendering-rules.md`（ほかの ADR の見出しの形に合わせる）に次を書く:

- 背景: spec 4 章・5 章・6 章。SSR の HTML は CDN に置いて使い回すので、人・日・端末で変わるものを入れてはいけない。ブラウザの最初の描画はサーバーと同じ形でなければならない
- 決めたこと:
  - ページごとの描き方は `app.routes.server.ts`（Client・Server・404）。既定は long、ページが `SsrResponse` で短くしタグを足す
  - 枠だけのページは `ngSkipHydration` で引き継がず、サーバーでは取らない
  - 中身まで描くページで、ログイン状態・端末の保存で形が変わるところは `afterFirstRender`。属性の値だけ変わるところは包まない
  - サーバーはパラメータの足りない URL を補わない（今日・今を CDN に残さない）
  - API の取得やサーバーの描画に失敗したページは `no-store`
  - 運用表のカードは incremental hydration（`hydrate on viewport`）
  - 題名・説明・OGP は `PageMeta`。`TitleService` は無くした
  - CDN に置く長さの 3 つの値とタグの形（Global Constraints の値）
- 捨てた案: 各部品で `isPlatformServer` を見て分ける（数が多く漏れる）／枠だけのページを汎用の骨組みに差し替える（ページの骨組みとの差で跳ねる）／ストアを DI に移す（大工事。計画 1 で 1 プロセス 1 描画＋戻しにした）
- 残り: Lambda の応答の大きさ（2c）・圏外の保存（2b）・失効（api）

```bash
git add docs/adr/0013-ssr-rendering-rules.md
git commit -m "docs: :memo: SSR の描き分けの決まりを ADR に残す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git log --show-signature -1
```

---

## このあとの計画（2b・2c）

この計画が済んでから、それぞれ別の計画ファイルに書く。

- **2b 圏外の保存と Service Worker**（`ssr: false` のまま出せる）: Service Worker の dataGroups がデータの API（別オリジン）を保存しているかをネットワークの記録で確かめる → 広げる（件数・期間・待ち時間）／駅別時刻表・全線時刻表・運用行路図・過去の運用情報のストアを localforage に丸ごと保存・real-time はデータごと保存に戻す・取得に失敗しても読み込み中を解く・「○時○分時点」（spec 7.3）
- **2c Lambda と配信で SSR を有効にする**: `production` を `outputMode: server` に・Service Worker の殻（`index.csr.html`）と `ngsw-config.json` の `index`（spec 7.4）・`serverless.ts` に SSR の Lambda（arm64・`TZ=Asia/Tokyo`・メモリ・warmup）と Function URL＋OAC・振り分け（拡張子と `assets/*` は S3、ほかは Lambda）・キャッシュポリシー（最大 TTL）・`CacheTagConfig`（`Cache-Tag` が Lambda の応答で効くかを最初に試す）・Origin Shield（東京）・オリジングループで S3 の殻に切り替え・切り戻しの stage param・本番ホストの `allowedHosts` と Host の渡し方・応答の圧縮（6MB 対策）・ハッシュ付きファイルの `--delete` を外す（spec 6.6）・`express.static` の 1 年キャッシュを Lambda では使わない形に
- **api の失効**（api リポジトリの spec・ADR）: 書き込みの後に `#calendar:<id>`・`#sighting-date:<日付>` を失効・同じ calendarId を数分にまとめる・権限
