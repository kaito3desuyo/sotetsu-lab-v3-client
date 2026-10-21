# HTTP エラーを FetchError にそろえる 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** HttpClient の失敗を一番外側の interceptor で `FetchError`（`ts-custom-error`）に直し、GA の `page_load_error` と `app_error` に、ステータス・API の道筋・メッセージが残るようにする。

**Architecture:** `FetchErrorInterceptor` を `HTTP_INTERCEPTORS` の先頭に置く。内側の `AuthInterceptor` は今のまま `HttpErrorResponse` の 401 を見てトークンを取り直し、その外で `FetchError` に変わる。GA に送る文は `toErrorMessage` 1 つにまとめる。呼ぶ側は `HttpErrorResponse` を `FetchError` に読み替える。

**Tech Stack:** Angular 22・RxJS・ts-custom-error 3・Jest（jsdom）

**Spec:** `docs/superpowers/specs/2026-10-21-fetch-error-design.md`

## Global Constraints

- GA のイベントの値は 100 文字まで。
- 本文に `message` が無い時の文言は「不明なエラーが発生しました」（今の目撃の投稿と同じ）。
- 配列の `message` は `、` で結ぶ。
- `AuthInterceptor` は変えない。
- 変わってよい画面の振る舞いは、列車情報の入力画面で保存に失敗した時の通知の文言だけ。
- テストは `npx jest <パス>` で回す（sandbox の中で `npm test` は全 spec が落ちる）。`npm run lint` と、署名付きの `git commit` は sandbox の外で行う。
- コミットは Conventional Commits と絵文字の形式（例: `refactor: :recycle: …`）。末尾に次の 2 行を付ける。

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf
```

## Review Focus

1. 通信が切れた時（status 0、本文が `ProgressEvent`）に「不明なエラーが発生しました」になり、落ちないこと → Task 1 のテスト。
2. ゲストで開いた時、`/api/user/profile` の 401 が今までどおり `null`（ゲスト）になり、エラー表示が出ないこと → Task 4 の `user.query.spec.ts`（interceptor を通した形で回す）。
3. v3 API の 401 で、トークンの取り直しが今までどおり 1 回だけ走ること（interceptor の並び順） → Task 2 のテスト。
4. `url` が `null` の `FetchError`（テストや手で作った物）でも GA の文が組めること → Task 3 のテスト。
5. 登録で「ユーザー名が既に使用されています」の出し分けが残ること → Task 4 の `register-dialog.component.spec.ts`。

---

### Task 1: `FetchError` を広げる

**Files:**
- Modify: `src/app/core/classes/custom-error.ts`
- Create: `src/app/core/classes/custom-error.spec.ts`

**Interfaces:**
- Produces:
  - `new FetchError(statusCode: number, message: string, context?: Record<string, unknown>, url?: string | null, body?: unknown)`
  - `FetchError.fromHttpErrorResponse(error: HttpErrorResponse): FetchError`
  - プロパティ: `statusCode`・`message`・`context`・`url`・`body`・`name === 'FetchError'`

- [ ] **Step 1: 落ちるテストを書く**

`src/app/core/classes/custom-error.spec.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { FetchError } from './custom-error';

describe('FetchError.fromHttpErrorResponse', () => {
    it('ステータス・本文の message・url・本文を持つ Error になる', () => {
        const body = { message: '編成が見つかりません', statusCode: 400 };
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 400,
                url: 'https://api.example.com/v3/operation-sightings',
                error: body,
            }),
        );

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(FetchError);
        expect(error.name).toBe('FetchError');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('編成が見つかりません');
        expect(error.url).toBe(
            'https://api.example.com/v3/operation-sightings',
        );
        expect(error.body).toBe(body);
    });

    it('入力検証の message が配列なら「、」で結ぶ', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 400,
                error: { message: ['時刻が無い', '運番が無い'] },
            }),
        );

        expect(error.message).toBe('時刻が無い、運番が無い');
    });

    it('本文に message が無ければ「不明なエラーが発生しました」', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({ status: 502, error: 'Bad Gateway' }),
        );

        expect(error.message).toBe('不明なエラーが発生しました');
        expect(error.body).toBe('Bad Gateway');
    });

    it('通信が切れた（status 0）ときも「不明なエラーが発生しました」', () => {
        const error = FetchError.fromHttpErrorResponse(
            new HttpErrorResponse({
                status: 0,
                error: new ProgressEvent('error'),
            }),
        );

        expect(error.statusCode).toBe(0);
        expect(error.message).toBe('不明なエラーが発生しました');
        expect(error.url).toBeNull();
    });
});

describe('FetchError', () => {
    it('今までどおり ステータスとメッセージだけでも作れる', () => {
        const error = new FetchError(400, '編成が見つかりません');

        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('編成が見つかりません');
        expect(error.url).toBeNull();
        expect(error.body).toBeNull();
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/core/classes/custom-error.spec.ts`
Expected: FAIL（`FetchError.fromHttpErrorResponse is not a function`、型エラーで `url`・`body` が無い）

- [ ] **Step 3: 実装する**

`src/app/core/classes/custom-error.ts` を次の内容にする:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { CustomError } from 'ts-custom-error';

const UNKNOWN_ERROR_MESSAGE = '不明なエラーが発生しました';

export class FetchError extends CustomError {
    constructor(
        readonly statusCode: number,
        readonly message: string,
        readonly context: Record<string, unknown> = {},
        readonly url: string | null = null,
        readonly body: unknown = null,
    ) {
        super(message);
        Object.defineProperty(this, 'name', { value: 'FetchError' });
    }

    /**
     * HttpClient の失敗を Error の仲間に直す。
     * HttpErrorResponse は Error を implements しているだけなので instanceof Error が偽になり、
     * GA にも ErrorHandler にも中身が残らなかった
     */
    static fromHttpErrorResponse(error: HttpErrorResponse): FetchError {
        return new FetchError(
            error.status,
            toMessage(error.error),
            {},
            error.url,
            error.error,
        );
    }
}

/** API の本文の message を取り出す。入力検証（NestJS）では配列で来る */
function toMessage(body: unknown): string {
    const message =
        typeof body === 'object' && body !== null && 'message' in body
            ? body.message
            : undefined;

    if (typeof message === 'string' && message !== '') {
        return message;
    }
    if (Array.isArray(message) && message.length > 0) {
        return message.join('、');
    }
    return UNKNOWN_ERROR_MESSAGE;
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/app/core/classes/custom-error.spec.ts src/app/core/services/error-handler.service.spec.ts src/app/shared/operation-post-card`
Expected: PASS（今ある `new FetchError(400, …)` の使い方も通る）

- [ ] **Step 5: コミットする**（sandbox の外）

```bash
git add src/app/core/classes/custom-error.ts src/app/core/classes/custom-error.spec.ts
git commit -m "refactor: :recycle: FetchError に url・本文と HttpErrorResponse からの作り方を足す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 2: `FetchErrorInterceptor` を一番外側に置く

**Files:**
- Create: `src/app/core/interceptors/fetch-error.interceptor.ts`
- Create: `src/app/core/interceptors/fetch-error.interceptor.spec.ts`
- Modify: `src/app/app.config.ts`（import と `HTTP_INTERCEPTORS` の並び。今の 67 行目 `AuthInterceptor` の前）

**Interfaces:**
- Consumes: `FetchError.fromHttpErrorResponse`（Task 1）
- Produces: `FetchErrorInterceptor`（`@Injectable()`・`HttpInterceptor`）。HttpClient を使う側には `FetchError` が届く。

- [ ] **Step 1: 落ちるテストを書く**

`src/app/core/interceptors/fetch-error.interceptor.spec.ts`。アプリと同じ並び（FetchError → Auth）で 2 つ重ねる:

```ts
import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
    TokenStateQuery,
    TokenStateStore,
} from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';
import { FetchError } from '../classes/custom-error';
import { AuthInterceptor } from './auth-interceptor';
import { FetchErrorInterceptor } from './fetch-error.interceptor';

const apiUrl = `${environment.apiUrl}/v3/agencies`;
const unauthorized = { status: 401, statusText: 'Unauthorized' };

function setup() {
    const tokenQuery = {
        isExpired: false,
        accessToken: 'stale-token',
        tokenType: 'Bearer',
    };
    const fetchMock = jest.fn(() =>
        of(undefined).pipe(tap(() => (tokenQuery.accessToken = 'fresh-token'))),
    );
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withXhr(), withInterceptorsFromDi()),
            provideHttpClientTesting(),
            // app.config.ts と同じ並び。先に登録した方が外側
            {
                provide: HTTP_INTERCEPTORS,
                useClass: FetchErrorInterceptor,
                multi: true,
            },
            { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
            { provide: TokenStateQuery, useValue: tokenQuery },
            { provide: TokenStateStore, useValue: { fetch: fetchMock } },
        ],
    });
    return {
        http: TestBed.inject(HttpClient),
        controller: TestBed.inject(HttpTestingController),
        fetchMock,
    };
}

describe('FetchErrorInterceptor', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('失敗を FetchError にして返す', () => {
        const { http, controller } = setup();
        let error: unknown;

        http.get(apiUrl).subscribe({ error: (e) => (error = e) });
        controller
            .expectOne(apiUrl)
            .flush(
                { message: '止まっています' },
                { status: 503, statusText: 'Service Unavailable' },
            );

        expect(error).toBeInstanceOf(FetchError);
        expect(error).toMatchObject({
            statusCode: 503,
            message: '止まっています',
            url: apiUrl,
        });
        controller.verify();
    });

    it('成功はそのまま返す', () => {
        const { http, controller } = setup();
        let body: unknown;

        http.get(apiUrl).subscribe((v) => (body = v));
        controller.expectOne(apiUrl).flush({ ok: true });

        expect(body).toEqual({ ok: true });
        controller.verify();
    });

    it('内側の AuthInterceptor は今までどおり 401 でトークンを取り直してやり直す', () => {
        const { http, controller, fetchMock } = setup();
        let body: unknown;

        http.get(apiUrl).subscribe((v) => (body = v));
        controller.expectOne(apiUrl).flush(null, unauthorized);
        const retry = controller.expectOne(apiUrl);

        expect(fetchMock).toHaveBeenCalledWith({ bypassHttpCache: true });
        expect(retry.request.headers.get('x-sotetsu-lab-authorization')).toBe(
            'Bearer fresh-token',
        );
        retry.flush({ ok: true });
        expect(body).toEqual({ ok: true });
        controller.verify();
    });

    it('やり直しも 401 なら、FetchError の 401 を返す', () => {
        const { http, controller } = setup();
        let error: unknown;

        http.get(apiUrl).subscribe({ error: (e) => (error = e) });
        controller.expectOne(apiUrl).flush(null, unauthorized);
        controller.expectOne(apiUrl).flush(null, unauthorized);

        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).statusCode).toBe(401);
        controller.verify();
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/core/interceptors/fetch-error.interceptor.spec.ts`
Expected: FAIL（`Cannot find module './fetch-error.interceptor'`）

- [ ] **Step 3: 実装する**

`src/app/core/interceptors/fetch-error.interceptor.ts`:

```ts
import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FetchError } from '../classes/custom-error';

/**
 * HttpClient の失敗を FetchError に直す係。
 * 一番外側に置く（app.config.ts で先頭に登録する）。内側の AuthInterceptor は
 * HttpErrorResponse の 401 を見てトークンを取り直すので、それが済んでから直す
 */
@Injectable()
export class FetchErrorInterceptor implements HttpInterceptor {
    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: unknown) =>
                throwError(() =>
                    error instanceof HttpErrorResponse
                        ? FetchError.fromHttpErrorResponse(error)
                        : error,
                ),
            ),
        );
    }
}
```

`src/app/app.config.ts`: import を足し、`AuthInterceptor` の行の前に入れる:

```ts
import { FetchErrorInterceptor } from './core/interceptors/fetch-error.interceptor';
```

```ts
        // 先に登録した方が外側。失敗を FetchError に直すのは、AuthInterceptor が 401 で取り直した後
        {
            provide: HTTP_INTERCEPTORS,
            useClass: FetchErrorInterceptor,
            multi: true,
        },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/app/core/interceptors`
Expected: PASS（`auth-interceptor.spec.ts` は単独で組んでいるので変わらず通る）

- [ ] **Step 5: コミットする**（sandbox の外）

```bash
git add src/app/core/interceptors/fetch-error.interceptor.ts src/app/core/interceptors/fetch-error.interceptor.spec.ts src/app/app.config.ts
git commit -m "refactor: :recycle: HttpClient の失敗を一番外側の interceptor で FetchError に直す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

注意: このコミットの時点では、呼ぶ側（Task 4）はまだ `HttpErrorResponse` を見ている。ブランチの途中の状態としては許すが、Task 4 までを 1 つの PR で出す。

---

### Task 3: GA に送る文を `toErrorMessage` にまとめる

**Files:**
- Create: `src/app/core/errors/to-error-message.ts`
- Create: `src/app/core/errors/to-error-message.spec.ts`
- Modify: `src/app/core/services/error-handler.service.ts`
- Modify: `src/app/core/services/error-handler.service.spec.ts`
- Modify: `src/app/app.component.ts:103-111`
- Modify: `src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: `FetchError`（Task 1）
- Produces: `toErrorMessage(error: unknown): string`（100 文字以内）

- [ ] **Step 1: 落ちるテストを書く**

`src/app/core/errors/to-error-message.spec.ts`:

```ts
import { FetchError } from '../classes/custom-error';
import { toErrorMessage } from './to-error-message';

describe('toErrorMessage', () => {
    it('FetchError はステータスと道筋（クエリは落とす）を付ける', () => {
        const error = new FetchError(
            500,
            '止まっています',
            {},
            'https://api.example.com/v3/trip-blocks?calendar_id=1&fields=a',
        );

        expect(toErrorMessage(error)).toBe(
            'FetchError 500 /v3/trip-blocks: 止まっています',
        );
    });

    it('url の無い FetchError は道筋を省く', () => {
        expect(toErrorMessage(new FetchError(400, '編成が見つかりません'))).toBe(
            'FetchError 400: 編成が見つかりません',
        );
    });

    it('ほかの Error は「名前: メッセージ」', () => {
        expect(toErrorMessage(new TypeError('壊れた'))).toBe(
            'TypeError: 壊れた',
        );
    });

    it('Error でないものは文字列にする', () => {
        expect(toErrorMessage('文字列')).toBe('文字列');
    });

    it('100 文字までに切る', () => {
        expect(toErrorMessage(new Error('あ'.repeat(150)))).toBe(
            `Error: ${'あ'.repeat(150)}`.slice(0, 100),
        );
    });
});
```

`src/app/core/services/error-handler.service.spec.ts` の最初のテストを差し替え、1 つ足す:

```ts
    it('エラーの名前とメッセージを app_error で GA に送る', () => {
        service.handleError(new FetchError(400, '編成が見つかりません'));

        expect(sendEvent).toHaveBeenCalledWith('app_error', {
            error_message: 'FetchError 400: 編成が見つかりません',
        });
    });

    it('HTTP の失敗はステータスと道筋つきで送る', () => {
        service.handleError(
            new FetchError(
                503,
                '止まっています',
                {},
                'https://api.example.com/v3/agencies',
            ),
        );

        expect(sendEvent).toHaveBeenCalledWith('app_error', {
            error_message: 'FetchError 503 /v3/agencies: 止まっています',
        });
    });
```

`src/app/app.component.spec.ts`: `provideRouter` の `broken` の次にルートを足す:

```ts
                    {
                        path: 'broken-http',
                        canActivate: [
                            () => {
                                throw new FetchError(
                                    503,
                                    '止まっています',
                                    {},
                                    'https://api.example.com/v3/agencies',
                                );
                            },
                        ],
                        children: [],
                    },
```

import に `import { FetchError } from './core/classes/custom-error';` を足し、`page_load_error` のテストの後にテストを足す:

```ts
    it('API の失敗で読み込めなければ、ステータスと道筋を送る', async () => {
        TestBed.createComponent(AppComponent);

        await TestBed.inject(Router)
            .navigateByUrl('/broken-http')
            .catch(() => {});

        expect(sendEvent).toHaveBeenCalledWith('page_load_error', {
            error_message: 'FetchError 503 /v3/agencies: 止まっています',
        });
    });
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/core/errors src/app/core/services/error-handler.service.spec.ts src/app/app.component.spec.ts`
Expected: FAIL（`to-error-message` が無い。app_error と page_load_error は `FetchError: …` の形で届いて一致しない）

- [ ] **Step 3: 実装する**

`src/app/core/errors/to-error-message.ts`:

```ts
import { FetchError } from '../classes/custom-error';

/** GA のイベントの値は 100 文字まで */
const GA_VALUE_MAX_LENGTH = 100;

/** page_load_error・app_error に載せるエラーの文 */
export function toErrorMessage(error: unknown): string {
    return describe(error).slice(0, GA_VALUE_MAX_LENGTH);
}

function describe(error: unknown): string {
    if (error instanceof FetchError) {
        const path = error.url
            ? ` ${new URL(error.url, 'http://localhost').pathname}`
            : '';
        return `${error.name} ${error.statusCode}${path}: ${error.message}`;
    }
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
}
```

`src/app/core/services/error-handler.service.ts`: `HttpErrorResponse` の import と出し分けを消し、`#sendToGA` で `toErrorMessage` を使う:

```ts
import { ErrorHandler, Injectable, inject } from '@angular/core';
import ErrorStackParser from 'error-stack-parser';
import { NGXLogger } from 'ngx-logger';
import { toErrorMessage } from '../errors/to-error-message';
import { GoogleAnalyticsService } from './google-analytics.service';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService implements ErrorHandler {
    readonly #logger = inject(NGXLogger);
    readonly #ga = inject(GoogleAnalyticsService);
    /** 同じエラーで GA のイベントを埋めないよう、送ったものを覚えておく */
    readonly #sentErrorMessages = new Set<string>();

    handleError<T extends Error>(error: T): void {
        this.#sendToGA(error);

        if (error instanceof Error) {
            this.#logger.error(error.name, error.message, {
                ...error,
                stack: ErrorStackParser.parse(error),
            });
        }
    }

    #sendToGA(error: unknown): void {
        if (!(error instanceof Error)) {
            return;
        }

        const message = toErrorMessage(error);
        if (this.#sentErrorMessages.has(message)) {
            return;
        }
        this.#sentErrorMessages.add(message);

        this.#ga.sendEvent('app_error', { error_message: message });
    }
}
```

`src/app/app.component.ts` の `page_load_error`:

```ts
                this.#gaService.sendEvent('page_load_error', {
                    error_message: toErrorMessage(ev.error),
                });
```

import に `import { toErrorMessage } from './core/errors/to-error-message';` を足す。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest src/app/core/errors src/app/core/services/error-handler.service.spec.ts src/app/app.component.spec.ts`
Expected: PASS（今ある `Error: 壊れた` のテストも通る）

- [ ] **Step 5: コミットする**（sandbox の外）

```bash
git add src/app/core/errors src/app/core/services/error-handler.service.ts src/app/core/services/error-handler.service.spec.ts src/app/app.component.ts src/app/app.component.spec.ts
git commit -m "fix: :bug: page_load_error と app_error に HTTP の失敗のステータスと道筋を残す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 4: 呼ぶ側を `FetchError` に読み替える

**Files:**
- Modify: `src/app/libs/user/infrastructure/queries/user.query.ts`・`user.query.spec.ts`
- Modify: `src/app/layout/components/login-dialog/login-dialog.component.ts`・`.spec.ts`
- Modify: `src/app/layout/components/register-dialog/register-dialog.component.ts`・`.spec.ts`
- Modify: `src/app/layout/components/header/header.component.ts`
- Modify: `src/app/shared/operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.component.ts`・`.spec.ts`
- Modify: `src/app/shared/operation-sighting-restoration-dialog/operation-sighting-restoration-dialog.component.ts`・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.ts`
- Modify: `src/app/libs/operation-sighting/infrastructure/commands/operation-sighting.command.ts`

**Interfaces:**
- Consumes: `FetchError`（`statusCode`・`message`・`body`）、`FetchErrorInterceptor`（Task 2）

- [ ] **Step 1: テストを先に読み替える**

`user.query.spec.ts` の `setup()` を、アプリと同じく interceptor を通す形にする:

```ts
import {
    HTTP_INTERCEPTORS,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { FetchErrorInterceptor } from 'src/app/core/interceptors/fetch-error.interceptor';
```

```ts
function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
            {
                provide: HTTP_INTERCEPTORS,
                useClass: FetchErrorInterceptor,
                multi: true,
            },
        ],
    });
    ...
```

`500 は失敗のまま返し、…` のテストの `expect(error).toBeTruthy();` を次にする:

```ts
        expect(error).toBeInstanceOf(FetchError);
```

（import に `import { FetchError } from 'src/app/core/classes/custom-error';`）

`login-dialog.component.spec.ts`・`operation-sighting-invalidation-dialog.component.spec.ts`・`operation-sighting-restoration-dialog.component.spec.ts`: `import { HttpErrorResponse } from '@angular/common/http';` を `import { FetchError } from 'src/app/core/classes/custom-error';` にし、失敗の作り方を置き換える:

```ts
// login-dialog
            throwError(() => new FetchError(401, '不明なエラーが発生しました')),
// invalidation / restoration
            throwError(() => new FetchError(500, '不明なエラーが発生しました')),
```

`register-dialog.component.spec.ts` も同じく import を替え、`failWith` を:

```ts
    const failWith = (message: string) =>
        registerUser.mockReturnValue(
            throwError(
                () => new FetchError(400, message, {}, null, { message }),
            ),
        );
```

- [ ] **Step 2: 落ちることを確かめる**

Run: `npx jest src/app/libs/user src/app/layout/components/login-dialog src/app/layout/components/register-dialog src/app/shared/operation-sighting-invalidation-dialog src/app/shared/operation-sighting-restoration-dialog`
Expected: FAIL は `user.query.spec.ts` の「ゲストの 401 は null」と「渡さずに取った値は…」（`instanceof HttpErrorResponse` が偽になり 401 が失敗のまま返る）と、`register-dialog` の「ユーザー名が使われていたら」（`result.error.error` が無い）。ほかは通ってよい（キャストしているだけなので）。

- [ ] **Step 3: 実装する**

`user.query.ts`: import の `HttpErrorResponse` を外し、`FetchError` を足して:

```ts
                    catchError((error: unknown) =>
                        error instanceof FetchError && error.statusCode === 401
                            ? of(null)
                            : throwError(() => error),
                    ),
```

`login-dialog.component.ts`:

```ts
        const result = await tryCatchAsync<void, FetchError>(
```

```ts
            console.error('Login failed:', result.error.body);
```

`register-dialog.component.ts`:

```ts
        const result = await tryCatchAsync<void, FetchError>(
```

```ts
            console.error('Registration failed:', result.error.body);

            if (result.error.message === 'User already exists.') {
```

`header.component.ts`・`operation-sighting-invalidation-dialog.component.ts`・`operation-sighting-restoration-dialog.component.ts`:

```ts
            (e) => e as FetchError,
```

```ts
            console.error('Logout failed:', result.error.body);   // header
            console.error('Invalidate failed:', result.error.body); // 2 つのダイアログ（今の文言のまま）
```

`timetable-edit-form.component.ts`:

```ts
            (e) => e as FetchError,
```

（`this.#notification.open(e.message, 'OK')` はそのまま。API の日本語のメッセージが出るようになる）

どのファイルも `import { HttpErrorResponse } from '@angular/common/http';` を消し、`import { FetchError } from 'src/app/core/classes/custom-error';` を足す。

`operation-sighting.command.ts` の `post()` から自前の変換を消す:

```ts
    post(body: PostOperationSightingDto): Observable<void> {
        return this.#http
            .post(`${this.#v3ApiUrl}`, body)
            .pipe(map(() => undefined));
    }
```

使わなくなった `throwError`・`catchError`・`FetchError` の import を消す。

- [ ] **Step 4: 残りが無いことと、通ることを確かめる**

Run: `grep -rn "HttpErrorResponse" src/app`
Expected: 出るのは `core/classes/custom-error.ts`・`core/classes/custom-error.spec.ts`・`core/interceptors/auth-interceptor.ts`・`core/interceptors/auth-interceptor.spec.ts`・`core/interceptors/fetch-error.interceptor.ts` だけ。

Run: `npx jest src/app/libs src/app/layout src/app/shared src/app/pages/timetable`
Expected: PASS

- [ ] **Step 5: コミットする**（sandbox の外）

```bash
git add src/app/libs src/app/layout src/app/shared src/app/pages/timetable
git diff --cached --stat
git commit -m "refactor: :recycle: HTTP の失敗を FetchError で受け取る

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf"
```

---

### Task 5: 全体の確認

**Files:** 変更なし（落ちたら該当 Task に戻って直す）

- [ ] **Step 1: 全テスト**

Run: `npx jest > .context/jest-all.txt 2>&1; grep -E "^Tests:|^Test Suites:" .context/jest-all.txt`
Expected: `Test Suites: … failed` が 0、`Tests: … failed` が 0。

- [ ] **Step 2: lint**（sandbox の外）

Run: `npm run lint`
Expected: エラー 0。

- [ ] **Step 3: build**

Run: `npm run build`
Expected: 成功。

- [ ] **Step 4: 手元の画面で目で見る**（開発コンテナの client。API はローカル :3000 で本番 DB を読む）

1. ログアウトした状態で `/operation/real-time` を開く。「ページの読み込みに失敗しました」が出ず、表が出る（ゲストの 401 が `null` になる）。
2. 違うパスワードでログインする。「ログインに失敗しました」が出て、ダイアログは閉じない。
3. 正しくログインして、ログアウトする。両方とも成功の表示が出る。
4. 列車情報の入力画面で、API が断る内容で保存する（例: 保存テスト用の渋谷工事臨時ダイヤで、必須の時刻を空にする）。通知が英語の「Http failure response for …」でなく、API の日本語のメッセージになる。
5. ブラウザの DevTools で `gtag` の送信を見て、4 のときの `app_error` が `FetchError 4xx /v3/…: …` の形になっている。

- [ ] **Step 5: 結果を報告する**

テストの `Tests:` 行・lint・build の結果と、Step 4 の 1〜5 で見たものをそのまま書く。
