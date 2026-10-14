# 起動時の取得の並べ替えと Material Icons の自前配信 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホで、最初の表示がページのデータを取り始めるまでの往復を減らす。Material Icons のフォントを最初の波で取りに行かせる。あわせて、real-time で取得が失敗するとプログレスバーが消えなくなる不具合と、トークンの取り直しが 1 回の失敗で止まる不具合を直す。

**Architecture:** `QueryCache.get` に期限 `maxAgeMs` を足す。token・profile・maintenance は、期限を渡されたときだけキャッシュを使う。ガードと resolver が 5 秒の期限を渡すので、開いた直後の `replaceUrl` で同じ確認が二度走らなくなる。resolver は、今日の運用だけが今日のダイヤを待つ形に並べ直す。Material Icons は npm の `material-icons` を固定の場所に写し、先読みする。

**Tech Stack:** Angular 22・RxJS 7・Elf・jest 30（`npx jest`）・Sass・`material-icons@1.13.14`

**Spec:** `docs/superpowers/specs/2026-10-14-initial-fetch-and-icons-design.md`

## Global Constraints

- 作業ブランチは `perf/initial-fetch-and-icons`。master に直接コミットしない。
- コミットは Conventional Commits＋絵文字。コードの変更は `refactor: :recycle:`、依存の追加は `build: :package:`、ドキュメントは `docs: :memo:`。このリポジトリに `perf` の型は無い。不具合の修正（Task 7・Task 8）は `fix: :bug:`。
- コミットは署名付き。サンドボックスの外で `git commit` し、`git log --show-signature -1` で「正しい署名」を確かめる。
- コミットの末尾には次の 2 行を付ける。
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC
  ```
- テストは `npx jest --testPathPatterns=<path>`（`npm test` はサンドボックス内で全部落ちる）。件数は出力をファイルに書き、そこから `Tests:` の行を読む。
- prettier はファイル単位で `npx prettier --write <file>`。ディレクトリ単位では流さない。
- `npm run lint`・`npx eslint` はサンドボックスの外で流す。
- Bash でパイプはつながない（1 コマンド 1 目的）。
- 画面を移るたびの maintenance・token・profile の確認は**残す**（ユーザーの意図）。使い回すのは 5 秒（`ROUTE_CHECK_MAX_AGE_MS = 5_000`）だけ。
- ログイン・ログアウト（`login-dialog.component.ts`・`header.component.ts`）、`auth-interceptor.ts`、`app.component.ts` の `fetch()` の呼び方は変えない。この 4 つは引数なしで `fetch()` を呼び、必ず新しい値を取る（`app.component.ts` は Task 8 で失敗の扱いだけ直す）。
- `noMaintenanceGuard` は変えない（引数なしで呼ぶまま）。
- Quicksand は Google Fonts から読むまま残す。
- `@ngneat/elf` のストアの書き方、`inject()`、private の `#` は既存に合わせる。

## Review Focus

1. **ログインした直後の画面移動**: ログインのダイアログが `fetch()`（期限なし）で新しい token・profile を取る。その値は、続くガードと resolver の期限付きの呼び出しでも返されなければならない。ゲストの古い値が返ってはいけない → Task 2・Task 3 のテスト「渡さずに取った値は、続く maxAgeMs 付きの呼び出しで使い回される」で押さえる。
2. **ゲスト（401）の 2 回目**: 401 を失敗のままにすると、使い回しが効かない → Task 3 のテスト「401 は null になり、5 秒以内の 2 回目は要求を出さない」で押さえる。
3. **401 以外の失敗（500・通信断）**: 使い回してはいけない。次で必ず取り直す → Task 3 のテスト「500 は失敗のまま返し、次の呼び出しで取り直す」で押さえる。
4. **メンテナンス中の判定を使い回すとき**: 2 回目は要求を出さず、ストアに残った `isMaintenance` で `/maintenance` に飛ばす → Task 4 のテスト「メンテナンス中なら、使い回したときも /maintenance に飛ばす」で押さえる。
5. **届く前の時間を期限に数えないこと**: 遅い回線では、届くまでに 5 秒かかることがある。期限は届いた時刻から数える → Task 1 のテスト「期限は取り始めでなく、届いた時刻から数える」で押さえる。
6. **裏から戻った直後の連続した失敗**: 1 秒ごとの取得が何回失敗しても、読み込み中は残らない。毎秒の通知も出ない → Task 7 のテスト「1 秒ごとの現在位置の取得が続けて失敗しても、読み込み中が残らず、通知も出ない」と、Step 7 の再現スクリプトで押さえる。
7. **トークンの取り直しの失敗の後**: 1 回失敗しても、次の 10 秒でまた取り直す → Task 8 のテスト「トークンの取り直しが 1 回失敗しても、次の 10 秒でまた取り直す」で押さえる。

---

### Task 1: `QueryCache.get` に `maxAgeMs` を足す

**Files:**
- Modify: `src/app/core/query-cache/query-cache.ts`
- Test: `src/app/core/query-cache/query-cache.spec.ts`

**Interfaces:**
- Produces: `QueryCache.get<T>(options: { name: string; params: object; fetch: () => Observable<T>; forceReload?: boolean; maxAgeMs?: number }): Observable<T>`。`maxAgeMs` を省略すれば、今までどおり期限なし。

- [ ] **Step 1: 失敗するテストを書く**

`query-cache.spec.ts` の import を次に変える。

```ts
import { defer, of, Subject, throwError } from 'rxjs';
import { QueryCache } from './query-cache';
```

`describe('QueryCache', () => {` の最後（`clear() は全部捨てる` の後）に足す。

```ts
    describe('maxAgeMs', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('届いてから maxAgeMs 以内は取り直さない', () => {
            const cache = new QueryCache();
            const fetch = jest.fn(() => of(1));

            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();
            jest.advanceTimersByTime(5000);
            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('届いてから maxAgeMs を過ぎたら取り直す', () => {
            const cache = new QueryCache();
            const fetch = jest.fn(() => of(1));

            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();
            jest.advanceTimersByTime(5001);
            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();

            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('最中は maxAgeMs を過ぎても共有する', () => {
            const cache = new QueryCache();
            const subject = new Subject<number>();
            const fetch = jest.fn(() => subject);

            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();
            jest.advanceTimersByTime(10000);
            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('期限は取り始めでなく、届いた時刻から数える', () => {
            const cache = new QueryCache();
            const subject = new Subject<number>();
            const fetch = jest.fn(() => subject);

            cache.get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 }).subscribe();
            jest.advanceTimersByTime(10000);
            subject.next(1);
            subject.complete();
            jest.advanceTimersByTime(4000);
            let value: number | undefined;
            cache
                .get({ name: 'a', params: {}, fetch, maxAgeMs: 5000 })
                .subscribe((v) => (value = v));

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(value).toBe(1);
        });

        it('maxAgeMs を省略したら、時間がたっても取り直さない', () => {
            const cache = new QueryCache();
            const fetch = jest.fn(() => of(1));

            cache.get({ name: 'a', params: {}, fetch }).subscribe();
            jest.advanceTimersByTime(3_600_000);
            cache.get({ name: 'a', params: {}, fetch }).subscribe();

            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/query-cache/query-cache.spec.ts > .context/jest-t1.txt 2>&1` の後、`grep -E "✓|✕|Tests:" .context/jest-t1.txt`
Expected: 「届いてから maxAgeMs を過ぎたら取り直す」が FAIL（`fetch` が 1 回）。型エラー（`maxAgeMs` が無い）で全体が落ちてもよい。

- [ ] **Step 3: 実装する**

`query-cache.ts` を次にする。

```ts
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

type Entry = {
    name: string;
    obs: Observable<unknown>;
    /** 値が届いた時刻（Date.now()）。maxAgeMs はここから数える */
    receivedAt?: number;
};

/**
 * libs の query クラスが持つ画面内キャッシュ。
 * name と params の md5 をキーに、取得を shareReplay で使い回す（エラーになったら次の購読で取り直す）。
 * name ごとに捨てられるので、書き込みに関係するメソッドだけを失効できる（QueryInvalidator）。
 * maxAgeMs を渡した呼び出しは、届いてからその長さを過ぎた値を使わず取り直す（docs/adr/0007）。
 */
export class QueryCache {
    readonly #entries = new Map<string, Entry>();

    get<T>(options: {
        /** キャッシュを捨てる単位。query クラスのメソッド名を入れる */
        name: string;
        /** name の中でキーを分ける値（calendarId など） */
        params: object;
        /** キャッシュに無いときの取り方 */
        fetch: () => Observable<T>;
        forceReload?: boolean;
        /** 届いてからこの長さ（ms）を過ぎた値は使わず、取り直す。省略すれば期限なし */
        maxAgeMs?: number;
    }): Observable<T> {
        const { name, params, fetch, forceReload, maxAgeMs } = options;
        const key = md5(JSON.stringify({ name, ...params }));

        const cached = this.#entries.get(key);
        const isStale =
            maxAgeMs !== undefined &&
            cached?.receivedAt !== undefined &&
            Date.now() - cached.receivedAt > maxAgeMs;
        if (forceReload || isStale) {
            this.#entries.delete(key);
        }

        let entry = this.#entries.get(key);
        if (!entry) {
            const created: Entry = { name, obs: undefined };
            created.obs = fetch().pipe(
                tap(() => (created.receivedAt = Date.now())),
                shareReplay({ bufferSize: 1, refCount: true }),
            );
            entry = created;
            this.#entries.set(key, entry);
        }

        return entry.obs as Observable<T>;
    }
```

`clear` はそのまま残す。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/query-cache > .context/jest-t1.txt 2>&1` の後、`grep -E "Tests:" .context/jest-t1.txt`
Expected: `query-cache.spec.ts`・`query-invalidator.spec.ts` とも全部 PASS。

- [ ] **Step 5: 整形とコミット**

```bash
npx prettier --write src/app/core/query-cache/query-cache.ts
npx prettier --write src/app/core/query-cache/query-cache.spec.ts
git add src/app/core/query-cache/query-cache.ts src/app/core/query-cache/query-cache.spec.ts
git commit -m "refactor: :recycle: QueryCache に届いてからの期限 maxAgeMs を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 2: token の取得を `QueryCache` に通す

**Files:**
- Modify: `src/app/libs/auth/infrastructure/queries/token.query.ts`
- Modify: `src/app/libs/auth/usecase/auth.service.ts:23-25`
- Modify: `src/app/global-states/token.state.ts:24-32`
- Create (Test): `src/app/libs/auth/infrastructure/queries/token.query.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `QueryCache.get({ ..., maxAgeMs })`
- Produces:
  - `TokenQuery.getToken(options?: { maxAgeMs?: number }): Observable<TokenDetailsDto>`
  - `AuthService.getToken(options?: { maxAgeMs?: number }): Observable<TokenDetailsDto>`
  - `TokenStateStore.fetch(options?: { maxAgeMs?: number }): Observable<void>`

- [ ] **Step 1: 失敗するテストを書く**

`token.query.spec.ts` を作る。

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { TokenQuery } from './token.query';

const url = environment.backendUrl + '/auth/token';
const token = { accessToken: 'a', tokenType: 'Bearer', expiresAt: 1 };

function setup() {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
        query: TestBed.inject(TokenQuery),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('TokenQuery', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('maxAgeMs を渡すと、5 秒以内の 2 回目は要求を出さず同じ値を返す', () => {
        const { query, controller } = setup();

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(token);
        jest.advanceTimersByTime(4000);
        let got: unknown;
        query.getToken({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toEqual(token);
        controller.verify();
    });

    it('maxAgeMs を渡しても、5 秒を過ぎたら取り直す', () => {
        const { query, controller } = setup();

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(token);
        jest.advanceTimersByTime(5001);
        query.getToken({ maxAgeMs: 5000 }).subscribe();

        controller.expectOne(url).flush(token);
        controller.verify();
    });

    it('maxAgeMs を渡さないと、毎回要求を出す（ログイン・ログアウト・期限切れの取り直し）', () => {
        const { query, controller } = setup();

        query.getToken().subscribe();
        controller.expectOne(url).flush(token);
        query.getToken().subscribe();

        controller.expectOne(url).flush(token);
        controller.verify();
    });

    it('渡さずに取った値は、続く maxAgeMs 付きの呼び出しで使い回される（ログイン直後の画面移動）', () => {
        const { query, controller } = setup();
        const guest = { accessToken: null, tokenType: null, expiresAt: null };

        query.getToken({ maxAgeMs: 5000 }).subscribe();
        controller.expectOne(url).flush(guest);
        query.getToken().subscribe();
        controller.expectOne(url).flush(token);
        let got: unknown;
        query.getToken({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toEqual(token);
        controller.verify();
    });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/libs/auth/infrastructure/queries/token.query.spec.ts > .context/jest-t2.txt 2>&1` の後、`grep -E "✓|✕|Tests:|error TS" .context/jest-t2.txt`
Expected: FAIL（`getToken` が引数を受け取らない型エラー、または 2 回目の要求が出る）。

- [ ] **Step 3: 実装する**

`token.query.ts` を次にする。

```ts
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
```

`auth.service.ts` の `getToken` を次にする。

```ts
    getToken(options?: { maxAgeMs?: number }): Observable<TokenDetailsDto> {
        return this.#tokenQuery.getToken(options);
    }
```

`token.state.ts` の `fetch` を次にする。

```ts
    fetch(options?: { maxAgeMs?: number }): Observable<void> {
        return of(undefined).pipe(
            mergeMap(() => this.#authService.getToken(options)),
            tap((v) => {
                state.update(setProps(v));
            }),
            map(() => undefined),
        );
    }
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns="src/app/libs/auth|src/app/global-states/token|src/app/core/interceptors|src/app/layout/components/login-dialog" > .context/jest-t2.txt 2>&1` の後、`grep -E "Tests:|✕" .context/jest-t2.txt`
Expected: 全部 PASS。`token.state.spec.ts` は `getToken` を引数なしのモックで差し替えているので、そのまま通る。

- [ ] **Step 5: 整形とコミット**

```bash
npx prettier --write src/app/libs/auth/infrastructure/queries/token.query.ts
npx prettier --write src/app/libs/auth/infrastructure/queries/token.query.spec.ts
npx prettier --write src/app/libs/auth/usecase/auth.service.ts
npx prettier --write src/app/global-states/token.state.ts
git add src/app/libs/auth/infrastructure/queries/token.query.ts src/app/libs/auth/infrastructure/queries/token.query.spec.ts src/app/libs/auth/usecase/auth.service.ts src/app/global-states/token.state.ts
git commit -m "refactor: :recycle: token の取得を期限付きで使い回せるようにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 3: profile の取得を `QueryCache` に通し、ゲストの 401 を `null` にする

**Files:**
- Modify: `src/app/libs/user/infrastructure/queries/user.query.ts`
- Modify: `src/app/libs/user/usecase/user.service.ts:13-15`
- Modify: `src/app/global-states/user.state.ts:25-36`
- Create (Test): `src/app/libs/user/infrastructure/queries/user.query.spec.ts`
- Create (Test): `src/app/global-states/user.state.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `QueryCache.get({ ..., maxAgeMs })`
- Produces:
  - `UserQuery.getProfile(options?: { maxAgeMs?: number }): Observable<UserDetailsDto | null>`（ゲストは `null`）
  - `UserService.getProfile(options?: { maxAgeMs?: number }): Observable<UserDetailsDto | null>`
  - `UserStateStore.fetch(options?: { maxAgeMs?: number }): Observable<void>`

- [ ] **Step 1: 失敗するテストを書く**

`user.query.spec.ts` を作る。

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { UserQuery } from './user.query';

const url = environment.backendUrl + '/user/profile';
const model = {
    userId: 'u1',
    username: 'kaito',
    password: 'x',
    displayName: 'K',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

function setup() {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
        query: TestBed.inject(UserQuery),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('UserQuery.getProfile', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('ログイン中は password を落とした DTO を返す', () => {
        const { query, controller } = setup();
        let got: unknown;

        query.getProfile().subscribe((v) => (got = v));
        controller.expectOne(url).flush(model);

        expect(got).toEqual({
            userId: 'u1',
            username: 'kaito',
            displayName: 'K',
            role: 'admin',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
        });
        controller.verify();
    });

    it('ゲストの 401 は null になり、maxAgeMs 以内の 2 回目は要求を出さない', () => {
        const { query, controller } = setup();
        const got: unknown[] = [];

        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => got.push(v));
        controller
            .expectOne(url)
            .flush(null, { status: 401, statusText: 'Unauthorized' });
        jest.advanceTimersByTime(4000);
        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => got.push(v));

        controller.expectNone(url);
        expect(got).toEqual([null, null]);
        controller.verify();
    });

    it('500 は失敗のまま返し、次の呼び出しで取り直す', () => {
        const { query, controller } = setup();
        let error: unknown;

        query
            .getProfile({ maxAgeMs: 5000 })
            .subscribe({ error: (e) => (error = e) });
        controller
            .expectOne(url)
            .flush(null, { status: 500, statusText: 'Server Error' });
        query.getProfile({ maxAgeMs: 5000 }).subscribe();

        expect(error).toBeTruthy();
        controller.expectOne(url).flush(model);
        controller.verify();
    });

    it('渡さずに取った値は、続く maxAgeMs 付きの呼び出しで使い回される（ログイン直後の画面移動）', () => {
        const { query, controller } = setup();
        let got: unknown;

        query.getProfile({ maxAgeMs: 5000 }).subscribe();
        controller
            .expectOne(url)
            .flush(null, { status: 401, statusText: 'Unauthorized' });
        query.getProfile().subscribe();
        controller.expectOne(url).flush(model);
        query.getProfile({ maxAgeMs: 5000 }).subscribe((v) => (got = v));

        controller.expectNone(url);
        expect(got).toMatchObject({ userId: 'u1' });
        controller.verify();
    });
});
```

`user.state.spec.ts` を作る。

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserService } from '../libs/user/usecase/user.service';
import { UserStateQuery, UserStateStore } from './user.state';

const user = {
    userId: 'u1',
    username: 'kaito',
    displayName: 'K',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

describe('UserStateStore.fetch', () => {
    let getProfile: jest.Mock;
    let store: UserStateStore;
    let query: UserStateQuery;

    beforeEach(() => {
        getProfile = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: UserService, useValue: { getProfile } }],
        });
        store = TestBed.inject(UserStateStore);
        query = TestBed.inject(UserStateQuery);
        store.reset();
    });

    it('ユーザーが来たら状態に入れる', () => {
        getProfile.mockReturnValue(of(user));

        store.fetch().subscribe();

        expect(query.userId).toBe('u1');
    });

    it('null（ゲスト）が来たら状態を空に戻す', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(of(null));

        store.fetch().subscribe();

        expect(query.userId).toBeNull();
    });

    it('失敗しても状態を空に戻し、エラーにしない', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(throwError(() => new Error('offline')));
        let failed = false;

        store.fetch().subscribe({ error: () => (failed = true) });

        expect(query.userId).toBeNull();
        expect(failed).toBe(false);
    });

    it('maxAgeMs をそのまま渡す', () => {
        getProfile.mockReturnValue(of(null));

        store.fetch({ maxAgeMs: 5000 }).subscribe();

        expect(getProfile).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns="src/app/libs/user/infrastructure/queries/user.query.spec.ts|src/app/global-states/user.state.spec.ts" > .context/jest-t3.txt 2>&1` の後、`grep -E "✓|✕|Tests:|error TS" .context/jest-t3.txt`
Expected: FAIL（401 がエラーになる、引数の型エラー、`null` で `setProps` が落ちる、のどれか）。

- [ ] **Step 3: 実装する**

`user.query.ts` を次にする。

```ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserDtoBuilder } from '../builders/user.dto.builder';
import { UserModel } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserQuery {
    readonly #http = inject(HttpClient);
    readonly #backendUrl = environment.backendUrl + '/user';
    readonly #cache = new QueryCache();

    /**
     * ログインしていなければ null。
     * maxAgeMs を渡したとき（resolver）だけ、届いてからその間は使い回す。
     * 渡さなければ（ログイン・ログアウト）必ず取りに行き、取った値はキャッシュにも入れる。
     */
    getProfile(options?: {
        maxAgeMs?: number;
    }): Observable<UserDetailsDto | null> {
        const { maxAgeMs } = options ?? {};

        return this.#cache.get({
            name: 'getProfile',
            params: {},
            fetch: () =>
                this.#http.get<UserModel>(`${this.#backendUrl}/profile`).pipe(
                    map((res) => UserDtoBuilder.buildFromModel(res)),
                    // ゲストは 401 になる。失敗にせず「ゲスト（null）」としてキャッシュに入れる
                    catchError((error: unknown) =>
                        error instanceof HttpErrorResponse &&
                        error.status === 401
                            ? of(null)
                            : throwError(() => error),
                    ),
                ),
            forceReload: maxAgeMs === undefined,
            maxAgeMs,
        });
    }
}
```

`user.service.ts` の `getProfile` を次にする。

```ts
    getProfile(options?: {
        maxAgeMs?: number;
    }): Observable<UserDetailsDto | null> {
        return this.#userQuery.getProfile(options);
    }
```

`user.state.ts` の `fetch` を次にする。

```ts
    fetch(options?: { maxAgeMs?: number }): Observable<void> {
        return this.#userService.getProfile(options).pipe(
            tap((user) => {
                if (user) {
                    state.update(setProps(user));
                } else {
                    state.reset();
                }
            }),
            map(() => undefined),
            catchError(() => {
                state.reset();
                return of(undefined);
            }),
        );
    }
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns="src/app/libs/user|src/app/global-states/user|src/app/layout" > .context/jest-t3.txt 2>&1` の後、`grep -E "Tests:|✕" .context/jest-t3.txt`
Expected: 全部 PASS。

- [ ] **Step 5: 整形とコミット**

```bash
npx prettier --write src/app/libs/user/infrastructure/queries/user.query.ts
npx prettier --write src/app/libs/user/infrastructure/queries/user.query.spec.ts
npx prettier --write src/app/libs/user/usecase/user.service.ts
npx prettier --write src/app/global-states/user.state.ts
npx prettier --write src/app/global-states/user.state.spec.ts
git add src/app/libs/user/infrastructure/queries/user.query.ts src/app/libs/user/infrastructure/queries/user.query.spec.ts src/app/libs/user/usecase/user.service.ts src/app/global-states/user.state.ts src/app/global-states/user.state.spec.ts
git commit -m "refactor: :recycle: profile の取得を期限付きで使い回し、ゲストの 401 を null にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 4: maintenance の取得を `QueryCache` に通し、ガードで 5 秒使い回す

**Files:**
- Create: `src/app/core/query-cache/route-check-max-age.ts`
- Modify: `src/app/global-states/maintenance.state.ts:22-36`
- Modify: `src/app/core/guards/maintenance.guard.ts:9-23`（`maintenanceGuard` だけ。`noMaintenanceGuard` は変えない）
- Create (Test): `src/app/core/guards/maintenance.guard.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `QueryCache.get({ ..., maxAgeMs })`
- Produces:
  - `ROUTE_CHECK_MAX_AGE_MS: number`（= `5_000`。`src/app/core/query-cache/route-check-max-age.ts` から export）
  - `MaintenanceStateStore.fetch(options?: { maxAgeMs?: number }): Observable<void>`

- [ ] **Step 1: 失敗するテストを書く**

`maintenance.guard.spec.ts` を作る。

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { environment } from 'src/environments/environment';
import { maintenanceGuard } from './maintenance.guard';

const url = environment.backendUrl + '/maintenance';

function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
        ],
    });
    return {
        controller: TestBed.inject(HttpTestingController),
        router: TestBed.inject(Router),
    };
}

function run(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
        maintenanceGuard(
            {} as ActivatedRouteSnapshot,
            {} as RouterStateSnapshot,
        ),
    ) as Promise<boolean | UrlTree>;
}

describe('maintenanceGuard', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('5 秒以内に 2 回続けて通っても、maintenance は 1 回しか取らない', async () => {
        const { controller } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: false });
        expect(await first).toBe(true);
        jest.advanceTimersByTime(4000);
        const second = run();

        controller.expectNone(url);
        expect(await second).toBe(true);
        controller.verify();
    });

    it('5 秒を過ぎたら取り直す（画面を移るたびの確認は残す）', async () => {
        const { controller } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: false });
        await first;
        jest.advanceTimersByTime(5001);
        const second = run();

        controller.expectOne(url).flush({ isMaintenance: false });
        expect(await second).toBe(true);
        controller.verify();
    });

    it('メンテナンス中なら、使い回したときも /maintenance に飛ばす', async () => {
        const { controller, router } = setup();

        const first = run();
        controller.expectOne(url).flush({ isMaintenance: true });
        const firstResult = await first;
        const second = run();
        controller.expectNone(url);
        const secondResult = await second;

        expect(router.serializeUrl(firstResult as UrlTree)).toBe('/maintenance');
        expect(router.serializeUrl(secondResult as UrlTree)).toBe(
            '/maintenance',
        );
        controller.verify();
    });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/guards/maintenance.guard.spec.ts > .context/jest-t4.txt 2>&1` の後、`grep -E "✓|✕|Tests:|error TS" .context/jest-t4.txt`
Expected: 「1 回しか取らない」と「使い回したときも」が FAIL（2 回目の要求が出る）。

- [ ] **Step 3: 実装する**

`route-check-max-age.ts` を作る。

```ts
/**
 * 画面を移るたびの確認（maintenance・token・profile）を使い回す長さ。
 * 開いた直後の replaceUrl で同じ確認が二度走るのを 1 回にする。
 * 画面を移るたびの確認そのものは残す（使っている途中のメンテナンス入り・ログイン切れに気づくため。docs/adr/0007）。
 */
export const ROUTE_CHECK_MAX_AGE_MS = 5_000;
```

`maintenance.state.ts` の import と `MaintenanceStateStore` を次にする（`MaintenanceStateQuery` は変えない）。

```ts
import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { createStore, select, setProps, withProps } from '@ngneat/elf';
import { map, Observable, tap } from 'rxjs';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
```

```ts
@Injectable({ providedIn: 'root' })
export class MaintenanceStateStore {
    readonly #handler = inject(HttpBackend);
    readonly #http = new HttpClient(this.#handler);
    readonly #cache = new QueryCache();

    /**
     * maxAgeMs を渡したとき（maintenanceGuard）だけ、届いてからその間は使い回す。
     * 渡さなければ必ず取りに行く。
     */
    fetch(options?: { maxAgeMs?: number }): Observable<void> {
        const { maxAgeMs } = options ?? {};

        return this.#cache
            .get({
                name: 'fetch',
                params: {},
                fetch: () =>
                    this.#http.get<State>(
                        environment.backendUrl + '/maintenance',
                    ),
                forceReload: maxAgeMs === undefined,
                maxAgeMs,
            })
            .pipe(
                tap((v) => {
                    state.update(setProps(v));
                }),
                map(() => undefined),
            );
    }
}
```

元のファイルの `toObservable` の import は使われていない。消してよいのは、元から未使用の場合だけだ。`grep -n "toObservable" src/app/global-states/maintenance.state.ts` で 1 行（import）しか出なければ消す。

`maintenance.guard.ts` の `maintenanceGuard` の取得の行を次にする。import に `ROUTE_CHECK_MAX_AGE_MS` を足す。

```ts
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
```

```ts
    await lastValueFrom(
        maintenanceStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
    );
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns="src/app/core/guards|src/app/global-states|src/app/pages/maintenance" > .context/jest-t4.txt 2>&1` の後、`grep -E "Tests:|✕" .context/jest-t4.txt`
Expected: 全部 PASS（maintenance のページに spec が無ければ、そのパターンは 0 件で構わない）。

- [ ] **Step 5: 整形とコミット**

```bash
npx prettier --write src/app/core/query-cache/route-check-max-age.ts
npx prettier --write src/app/global-states/maintenance.state.ts
npx prettier --write src/app/core/guards/maintenance.guard.ts
npx prettier --write src/app/core/guards/maintenance.guard.spec.ts
git add src/app/core/query-cache/route-check-max-age.ts src/app/global-states/maintenance.state.ts src/app/core/guards/maintenance.guard.ts src/app/core/guards/maintenance.guard.spec.ts
git commit -m "refactor: :recycle: メンテナンスの確認を 5 秒だけ使い回す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 5: resolver の段を詰め、token・profile に期限を渡す

**Files:**
- Modify: `src/app/core/resolvers/initial-data.resolver.ts:27-46`
- Create (Test): `src/app/core/resolvers/initial-data.resolver.spec.ts`

**Interfaces:**
- Consumes:
  - Task 2 の `TokenStateStore.fetch(options?: { maxAgeMs?: number })`
  - Task 3 の `UserStateStore.fetch(options?: { maxAgeMs?: number })`
  - Task 4 の `ROUTE_CHECK_MAX_AGE_MS`
- Produces: 並べ直した `initialDataResolver`（シグネチャは変えない）

- [ ] **Step 1: 失敗するテストを書く**

`initial-data.resolver.spec.ts` を作る。

```ts
import { TestBed } from '@angular/core/testing';
import type {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
} from '@angular/router';
import { Subject } from 'rxjs';
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
import { AgencyListStateStore } from 'src/app/global-states/agency-list.state';
import { CalendarListStateStore } from 'src/app/global-states/calendar-list.state';
import { InitializeStateStore } from 'src/app/global-states/initialize.state';
import { RouteStationListStateStore } from 'src/app/global-states/route-station-list.state';
import { ServiceListStateStore } from 'src/app/global-states/service-list.state';
import { TodaysCalendarListStateStore } from 'src/app/global-states/todays-calendar-list.state';
import { TodaysFormationListStateStore } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListStateStore } from 'src/app/global-states/todays-operation-list.state';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { UserStateStore } from 'src/app/global-states/user.state';
import { initialDataResolver } from './initial-data.resolver';

type Stub = { fetch: jest.Mock; subject: Subject<void> };

function stub(): Stub {
    const subject = new Subject<void>();
    return { subject, fetch: jest.fn(() => subject) };
}

function done(s: Stub): void {
    s.subject.next();
    s.subject.complete();
}

/** await の続きを流す */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('initialDataResolver', () => {
    let token: Stub;
    let user: Stub;
    let agency: Stub;
    let calendar: Stub;
    let routeStation: Stub;
    let service: Stub;
    let todaysCalendar: Stub;
    let todaysOperation: Stub;
    let todaysFormation: Stub;
    let markInitialized: jest.Mock;

    beforeEach(() => {
        [
            token,
            user,
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysOperation,
            todaysFormation,
        ] = Array.from({ length: 9 }, stub);
        markInitialized = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: TokenStateStore, useValue: token },
                { provide: UserStateStore, useValue: user },
                { provide: AgencyListStateStore, useValue: agency },
                { provide: CalendarListStateStore, useValue: calendar },
                { provide: RouteStationListStateStore, useValue: routeStation },
                { provide: ServiceListStateStore, useValue: service },
                {
                    provide: TodaysCalendarListStateStore,
                    useValue: todaysCalendar,
                },
                {
                    provide: TodaysOperationListStateStore,
                    useValue: todaysOperation,
                },
                {
                    provide: TodaysFormationListStateStore,
                    useValue: todaysFormation,
                },
                { provide: InitializeStateStore, useValue: { markInitialized } },
            ],
        });
    });

    function run(): Promise<boolean> {
        return TestBed.runInInjectionContext(() =>
            initialDataResolver(
                {} as ActivatedRouteSnapshot,
                {} as RouterStateSnapshot,
            ),
        ) as Promise<boolean>;
    }

    it('token・profile には ROUTE_CHECK_MAX_AGE_MS を渡す', () => {
        run();

        expect(token.fetch).toHaveBeenCalledWith({
            maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
        });
        expect(user.fetch).toHaveBeenCalledWith({
            maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
        });
    });

    it('2 段目は token・profile が終わるまで呼ばれない', async () => {
        run();
        done(token);
        await flush();

        expect(agency.fetch).not.toHaveBeenCalled();
        expect(todaysCalendar.fetch).not.toHaveBeenCalled();
    });

    it('token・profile の後、今日の運用以外は今日のダイヤを待たずに同時に呼ばれる', async () => {
        run();
        done(token);
        done(user);
        await flush();

        for (const s of [
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysFormation,
        ]) {
            expect(s.fetch).toHaveBeenCalledTimes(1);
        }
        expect(todaysOperation.fetch).not.toHaveBeenCalled();
    });

    it('今日の運用は、今日のダイヤが届いたら呼ばれる', async () => {
        run();
        done(token);
        done(user);
        await flush();
        done(todaysCalendar);
        await flush();

        expect(todaysOperation.fetch).toHaveBeenCalledTimes(1);
    });

    it('全部そろったら markInitialized して true を返す', async () => {
        const result = run();
        done(token);
        done(user);
        await flush();
        for (const s of [
            agency,
            calendar,
            routeStation,
            service,
            todaysCalendar,
            todaysFormation,
        ]) {
            done(s);
        }
        await flush();
        expect(markInitialized).not.toHaveBeenCalled();
        done(todaysOperation);

        expect(await result).toBe(true);
        expect(markInitialized).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/resolvers/initial-data.resolver.spec.ts > .context/jest-t5.txt 2>&1` の後、`grep -E "✓|✕|Tests:" .context/jest-t5.txt`
Expected: 「ROUTE_CHECK_MAX_AGE_MS を渡す」「今日のダイヤを待たずに同時に」が FAIL。

- [ ] **Step 3: 実装する**

`initial-data.resolver.ts` の import に次を足す。

```ts
import { ROUTE_CHECK_MAX_AGE_MS } from 'src/app/core/query-cache/route-check-max-age';
```

27〜46 行目（最初の `await Promise.all` から `initializeStateStore.markInitialized();` の前まで）を次にする。

```ts
    // 画面を移るたびに確かめる（使っている途中のログイン切れに気づくため）。
    // 開いた直後の replaceUrl で二度走らないよう、ROUTE_CHECK_MAX_AGE_MS の間は使い回す。
    // トークンは保存されないので、API の要求より先に取る（認証ヘッダーのため）
    await Promise.all([
        lastValueFrom(
            tokenStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
        lastValueFrom(
            userStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
    ]);

    // 順番待ちが要るのは今日の運用だけ（今日のダイヤの ID で引く）。ほかは同時に投げる
    await Promise.all([
        lastValueFrom(agencyListStateStore.fetch()),
        lastValueFrom(calendarListStateStore.fetch()),
        lastValueFrom(routeStationListStateStore.fetch()),
        lastValueFrom(serviceListStateStore.fetch()),
        lastValueFrom(todaysFormationListStateStore.fetch()),
        (async () => {
            await lastValueFrom(todaysCalendarListStateStore.fetch());
            await lastValueFrom(todaysOperationListStateStore.fetch());
        })(),
    ]);
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core > .context/jest-t5.txt 2>&1` の後、`grep -E "Tests:|✕" .context/jest-t5.txt`
Expected: 全部 PASS。

- [ ] **Step 5: 全体・型・lint を確かめる**

Run（サンドボックス内）: `npx jest > .context/jest-all.txt 2>&1` の後、`grep -E "^Tests:|^Test Suites:" .context/jest-all.txt`
Expected: 全部 PASS（このブランチの前は 1426 件）。

Run（サンドボックス内）: `npx tsc -p tsconfig.app.json --noEmit`
Expected: エラー 0。

Run（サンドボックス外）: `npx eslint src/app/core src/app/global-states src/app/libs/auth src/app/libs/user`
Expected: エラー 0。

- [ ] **Step 6: 整形とコミット**

```bash
npx prettier --write src/app/core/resolvers/initial-data.resolver.ts
npx prettier --write src/app/core/resolvers/initial-data.resolver.spec.ts
git add src/app/core/resolvers/initial-data.resolver.ts src/app/core/resolvers/initial-data.resolver.spec.ts
git commit -m "refactor: :recycle: 起動時の取得を、今日の運用だけが今日のダイヤを待つ並びにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 6: Material Icons を自前配信し、先読みする

**Files:**
- Modify: `package.json`・`package-lock.json`（`npm install` で）
- Modify: `angular.json:25-31`（build の `assets`）
- Modify: `src/styles.scss:1-8`・`src/styles.scss:80`
- Modify: `src/index.html:22-25`

**Interfaces:**
- Consumes: なし（Task 1〜5 とは独立）
- Produces: `/assets/fonts/material-icons.woff2`・`/assets/fonts/material-icons.woff`（ハッシュの付かない固定の URL）

- [ ] **Step 1: 依存を足してコミットする（サンドボックスの外）**

```bash
npm_config_cache=/tmp/claude-1000/npm-cache npm install material-icons@^1.13.14
git add package.json package-lock.json
git commit -m "build: :package: material-icons を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

Expected: `package.json` の dependencies に `"material-icons": "^1.13.14"` が入る（ほかの依存と同じく `^` 付き）。

- [ ] **Step 2: フォントを固定の場所に写す**

`angular.json` の build の `assets`（`"src/assets",` の次の行）に足す。

```json
              {
                "glob": "material-icons.woff*",
                "input": "node_modules/material-icons/iconfont",
                "output": "assets/fonts"
              },
```

- [ ] **Step 3: styles.scss で読み込む**

`src/styles.scss` の 7 行目 `@use '@angular/material' as mat;` の次の行に足す。

```scss
// Material Icons は自前で配る。先読み（index.html の preload）と同じ URL になるよう、ハッシュの付かない /assets/fonts/ を指す（docs/adr/0007）
@use 'material-icons/iconfont/filled' with (
    $material-icons-font-path: '/assets/fonts/'
);
```

80 行目のコメントアウト済みの行 `// @import url('https://fonts.googleapis.com/css?family=Material+Icons');` を消す。79 行目の Quicksand のコメントは残す。

- [ ] **Step 4: index.html を変える**

`src/index.html` の 22〜25 行目（Material Icons の `<link rel="stylesheet" ...Material+Icons&display=swap" />`）を、次に置き換える。

```html
        <link
            rel="preload"
            href="/assets/fonts/material-icons.woff2"
            as="font"
            type="font/woff2"
            crossorigin
        />
```

- [ ] **Step 5: ビルドして、出力を確かめる**

Run: `npx ng build --configuration development --optimization --source-map=false --named-chunks=false --output-path=.context/measure/dist-branch`

ビルドが Sass のエラーで止まった場合（例: `This variable was not declared with !default` や `with` が使えない旨）は、Step 3 で足した `@use ... with (...)` の 4 行を消す。代わりに、同じ場所に次を書いてからもう一度ビルドする（中身はパッケージの `filled.css` と同じで、パスだけ違う）。

```scss
// Material Icons は自前で配る。先読み（index.html の preload）と同じ URL になるよう、ハッシュの付かない /assets/fonts/ を指す（docs/adr/0007）
@font-face {
    font-family: 'Material Icons';
    font-style: normal;
    font-weight: 400;
    font-display: block;
    src:
        url('/assets/fonts/material-icons.woff2') format('woff2'),
        url('/assets/fonts/material-icons.woff') format('woff');
}

.material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: 'liga';
}
```

ビルドが通ったら、次の 4 つを確かめる。

Run: `ls .context/measure/dist-branch/browser/assets/fonts`
Expected: `material-icons.woff` と `material-icons.woff2` がある。

Run: `grep -o "url([^)]*material-icons[^)]*)" -r .context/measure/dist-branch/browser --include="*.css"`
Expected: `url(/assets/fonts/material-icons.woff2)` と `url(/assets/fonts/material-icons.woff)` だけが出る（`media/` などハッシュ付きの別の場所を指していない）。

Run: `grep -c "font-display:block" -r .context/measure/dist-branch/browser --include="*.css"`
Expected: 1 以上。

Run: `grep -c "Material+Icons" .context/measure/dist-branch/browser/index.html`
Expected: 0。

- [ ] **Step 6: テストを確かめる**

Run: `npx jest > .context/jest-all.txt 2>&1` の後、`grep -E "^Tests:|^Test Suites:" .context/jest-all.txt`
Expected: 全部 PASS。

- [ ] **Step 7: 整形とコミット**

`angular.json` と `index.html` と `styles.scss` は、差分の行の書式が周りと合っていることを `git diff` で目で確かめる。prettier を流すなら `styles.scss` だけにする（`angular.json`・`index.html` に流すと、関係ない行まで変わることがある）。

```bash
git add angular.json src/styles.scss src/index.html
git commit -m "refactor: :recycle: Material Icons を自前で配り、先読みして font-display を block にする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

---

### Task 7: real-time の読み込み中を、取得が失敗しても必ず下ろす

spec の「追加: real-time のプログレスバーが消えなくなる」と「設計 4」を実装する。Task 1〜6 とは独立していて、どの順でもよい。

**Files:**
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts`（`hookEvent()` の 3 か所）
- Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.ts`（`reload()`・`NotificationService` の注入）
- Test: `src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts`
- Test: `src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.spec.ts`

**Interfaces:**
- Consumes: なし（他のタスクの部品は使わない）
- Produces: なし（公開の形は変えない。controller が `NotificationService` を注入するようになるだけ）

- [ ] **Step 1: 失敗するテストを書く（real-time）**

`operation-real-time.component.spec.ts` の末尾（今の `describe` の外）に、次の `describe` を足す。サービスは本物でなく、全部の取得を `of(undefined)` で返す偽物にする。import は、ファイル先頭の既存の import に足す（`Subject`・`of`・`throwError`・`firstValueFrom` は `rxjs` から、`OperationRealTimeStore` は `./stores/operation-real-time.store` から）。

```ts
describe('OperationRealTimeComponent の取得の失敗', () => {
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    let service: Record<string, jest.Mock>;
    let notification: { open: jest.Mock };
    let socket$: Subject<void>;
    let submit$: Subject<void>;

    const isLoading = () =>
        firstValueFrom(OperationRealTimeStore.isLoading$);
    const finalUpdateTime = () =>
        firstValueFrom(OperationRealTimeStore.finalUpdateTime$);
    const fail = () => throwError(() => new Error('offline'));

    beforeEach(async () => {
        jest.useFakeTimers();
        const ok = () => jest.fn(() => of(undefined));
        service = {
            fetchOperationGroups: ok(),
            fetchRoutes: ok(),
            fetchStations: ok(),
            fetchTripClasses: ok(),
            fetchCalendar: ok(),
            fetchOperations: ok(),
            fetchItineraryLinks: ok(),
            fetchFormations: ok(),
            fetchCurrentPositions: ok(),
            fetchOperationSightingTimeCrossSections: ok(),
            fetchFormationSightingTimeCrossSections: ok(),
            fetchSightingHistories: ok(),
            fetchCurrentPositionThatShouldUpdate: ok(),
        };
        notification = { open: jest.fn() };
        socket$ = new Subject<void>();
        submit$ = new Subject<void>();

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: OperationRealTimeService, useValue: service },
                { provide: SocketService, useValue: { on: () => socket$ } },
                { provide: NotificationService, useValue: notification },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: submit$ },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.resetLoading();
        OperationRealTimeStore.setIsEnableAutoReload(true);
        fixture = TestBed.createComponent(OperationRealTimeComponent);
        fixture.detectChanges();
        // 開いたときの fetchData() を終わらせる
        await jest.advanceTimersByTimeAsync(0);
        OperationRealTimeStore.setFinalUpdateTime(0);
        notification.open.mockClear();
    });

    afterEach(() => {
        fixture.destroy();
        jest.useRealTimers();
    });

    it('1 秒ごとの現在位置の取得が続けて失敗しても、読み込み中が残らず、通知も出ない', async () => {
        service['fetchCurrentPositionThatShouldUpdate'].mockImplementation(
            fail,
        );

        await jest.advanceTimersByTimeAsync(3000);

        expect(
            service['fetchCurrentPositionThatShouldUpdate'],
        ).toHaveBeenCalledTimes(3);
        expect(await isLoading()).toBe(false);
        expect(notification.open).not.toHaveBeenCalled();
    });

    it('投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、最終更新時刻は進めない', async () => {
        service['fetchFormationSightingTimeCrossSections'].mockImplementation(
            fail,
        );

        submit$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、更新できたとは言わない', async () => {
        service['fetchSightingHistories'].mockImplementation(fail);

        socket$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(notification.open).not.toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが成功したら、更新できたと知らせ、最終更新時刻を進める', async () => {
        socket$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBeGreaterThan(0);
    });
});
```

`setupZoneTestEnv` の下で `jest.useFakeTimers()` の `interval` が進まないときは、`fakeAsync`・`tick(1000)`・`flushMicrotasks()` に書き換える。それでも `await` の先が流れないときは、そこで止めてコントローラーに報告する（偽の時計をやめて、本物の 1 秒を待つテストにはしない）。

- [ ] **Step 2: 失敗するテストを書く（controller）**

`operation-real-time-controller.component.spec.ts` を次のように変える。

1. import に `NotificationService`（`src/app/core/services/notification.service`）と、`rxjs` の `throwError` を足す。
2. `describe` の中に `let notification: { open: jest.Mock };` と `let service: Record<string, jest.Mock>;` を足す。
3. `beforeEach` で、偽のサービスを `service` に入れてから渡し、`NotificationService` の偽物も渡す。

```ts
        notification = { open: jest.fn() };
        service = {
            fetchOperationSightingTimeCrossSections: fetcher('operation'),
            fetchFormationSightingTimeCrossSections: fetcher('formation'),
            fetchSightingHistories: fetcher('histories'),
        };

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeControllerComponent],
            providers: [
                provideNoopAnimations(),
                { provide: OperationRealTimeService, useValue: service },
                { provide: NotificationService, useValue: notification },
            ],
        }).compileComponents();
```

4. 次のテストを足す。

```ts
    it('再読み込みが失敗したら、読み込み中が残らず失敗を知らせ、最終更新時刻は進めない', async () => {
        service['fetchFormationSightingTimeCrossSections'].mockImplementation(
            () => throwError(() => new Error('offline')),
        );

        await component.reload();

        expect(await firstValueFrom(OperationRealTimeStore.isLoading$)).toBe(
            false,
        );
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(component.finalUpdateTime()).toBe(0);
    });
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-real-time > .context/jest-task7.txt 2>&1` の後、`grep -E "^Tests:|✕" .context/jest-task7.txt`
Expected: 足したテストのうち、失敗の 4 件が FAIL（読み込み中が `true` のまま、または `reload()` が例外で落ちる）。成功の 1 件と既存のテストは PASS。

- [ ] **Step 4: 実装する（real-time）**

`operation-real-time.component.ts` の `hookEvent()` を、次のように書き換える。コメントアウト済みの `isStable` の 2 行は残す。

```ts
    hookEvent(): void {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象がある場合は更新する
        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        interval(1000 * 1)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                try {
                    await lastValueFrom(
                        this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate(),
                    );
                } catch {
                    // 毎秒通知しないよう黙って捨て、次の 1 秒で取り直す
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });
        // });

        // 自分が運用目撃情報を投稿したとき
        this.#operationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });

        // 他人が運用目撃情報を投稿したとき
        this.#socketService
            .on()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                if (!OperationRealTimeStore.isEnableAutoReload) return;

                this.#notification.open('更新中...', 'OK');
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                    this.#notification.open('データが更新されました', 'OK');
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });
    }

    /** 目撃の断面と履歴を、キャッシュを使わず取り直す */
    async #reloadSightings(): Promise<void> {
        await lastValueFrom(
            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchSightingHistories({
                forceReload: true,
            }),
        );
    }
```

- [ ] **Step 5: 実装する（controller）**

`operation-real-time-controller.component.ts` に `NotificationService` を注入し、`reload()` を書き換える。

```ts
import { NotificationService } from 'src/app/core/services/notification.service';
```

```ts
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #notification = inject(NotificationService);
```

```ts
    async reload(): Promise<void> {
        OperationRealTimeStore.enableLoading();
        try {
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(
                    {
                        forceReload: true,
                    },
                ),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(
                    {
                        forceReload: true,
                    },
                ),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchSightingHistories({
                    forceReload: true,
                }),
            );
            OperationRealTimeStore.setFinalUpdateTime();
        } catch (error) {
            console.error(error);
            this.#notification.open('データの取得に失敗しました', 'OK');
        } finally {
            OperationRealTimeStore.disableLoading();
        }
    }
```

- [ ] **Step 6: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/pages/operation/operation-real-time > .context/jest-task7.txt 2>&1` の後、`grep -E "^Tests:|^Test Suites:" .context/jest-task7.txt`
Expected: 全部 PASS。

- [ ] **Step 7: 手元で再現しなくなったことを確かめる（コントローラーが行う・サンドボックスの外）**

開発サーバー（4200）がこのブランチのコードで動いていることを確かめてから、次を流す。

```bash
PUPPETEER_CORE=/tmp/claude-1000/npm-cache/_npx/ffe2131771d88588/node_modules/puppeteer-core FAIL_MS=30000 node .context/measure/fail-positions-repro.mjs
```

Expected: 「戻して 10 秒: bar = false」。30・60 秒も `false`（直す前は 3 つとも `true` だった）。

- [ ] **Step 8: 整形とコミット**

```bash
npx prettier --write src/app/pages/operation/operation-real-time/operation-real-time.component.ts
npx prettier --write src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts
npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.ts
npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.spec.ts
git add src/app/pages/operation/operation-real-time/operation-real-time.component.ts src/app/pages/operation/operation-real-time/operation-real-time.component.spec.ts src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.ts src/app/pages/operation/operation-real-time/components/operation-real-time-controller/operation-real-time-controller.component.spec.ts
git diff --cached --stat
git commit -m "fix: :bug: real-time の取得が失敗してもプログレスバーが残らないようにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

Expected: `--stat` に出るのは 4 ファイルだけ。prettier で関係ない行が変わっていたら、その行は戻す。

---

### Task 8: トークンの取り直しを、1 回の失敗で止めない

spec の「設計 5」を実装する。Task 2 で `TokenStateStore.fetch(options?)` になるが、ここでは引数なしで呼ぶので、Task 2 の前でも後でもよい。

**Files:**
- Modify: `src/app/app.component.ts`（10 秒ごとのトークンの取り直し）
- Test: `src/app/app.component.spec.ts`

**Interfaces:**
- Consumes: `TokenStateStore.fetch(): Observable<void>`・`TokenStateQuery.isExpired: boolean`（どちらも既存）
- Produces: なし

- [ ] **Step 1: 失敗するテストを書く**

`app.component.spec.ts` を次のように変える。

1. import に `of`・`throwError`（`rxjs`）と、`TokenStateQuery`・`TokenStateStore`（`./global-states/token.state`）を足す。
2. `describe` の中に `let tokenFetch: jest.Mock;` を足し、`beforeEach` の頭で `tokenFetch = jest.fn(() => of(undefined));` を入れる。
3. `providers` に次の 2 つを足す。既存のテストは本物の時計で動くので、10 秒の `interval` は鳴らず、振る舞いは変わらない。

```ts
                { provide: TokenStateStore, useValue: { fetch: tokenFetch } },
                {
                    provide: TokenStateQuery,
                    useValue: { isExpired: true },
                },
```

4. 次のテストを足す。

```ts
    it('トークンの取り直しが 1 回失敗しても、次の 10 秒でまた取り直す', async () => {
        jest.useFakeTimers();
        try {
            tokenFetch.mockImplementationOnce(() =>
                throwError(() => new Error('offline')),
            );
            TestBed.createComponent(AppComponent);

            await jest.advanceTimersByTimeAsync(10_000);
            expect(tokenFetch).toHaveBeenCalledTimes(1);

            await jest.advanceTimersByTimeAsync(10_000);
            expect(tokenFetch).toHaveBeenCalledTimes(2);
        } finally {
            jest.useRealTimers();
        }
    });
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx jest --testPathPatterns=src/app/app.component.spec.ts > .context/jest-task8.txt 2>&1` の後、`grep -E "^Tests:|✕" .context/jest-task8.txt`
Expected: 足したテストだけが FAIL（2 回目が呼ばれず、`toHaveBeenCalledTimes(2)` で 1 回のまま）。既存の 4 件は PASS。

- [ ] **Step 3: 実装する**

`app.component.ts` の import を変える。

```ts
import { combineLatest, EMPTY, interval } from 'rxjs';
import { catchError, filter, first, map, switchMap } from 'rxjs/operators';
```

10 秒ごとの流れの `switchMap` を、次に置き換える。コメントアウト済みの `isStable` の 2 行は残す。

```ts
        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        interval(1000 * 10)
            .pipe(
                map(() => this.#tokenStateQuery.isExpired),
                filter((bool) => !!bool),
                // 1 回の失敗で流れごと止まらないよう、その回だけ捨てて次の 10 秒で取り直す
                switchMap(() =>
                    this.#tokenStateStore
                        .fetch()
                        .pipe(catchError(() => EMPTY)),
                ),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe();
        // });
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/app.component.spec.ts > .context/jest-task8.txt 2>&1` の後、`grep -E "^Tests:|^Test Suites:" .context/jest-task8.txt`
Expected: 全部 PASS。

- [ ] **Step 5: 整形とコミット**

```bash
npx prettier --write src/app/app.component.ts
npx prettier --write src/app/app.component.spec.ts
git add src/app/app.component.ts src/app/app.component.spec.ts
git diff --cached --stat
git commit -m "fix: :bug: トークンの取り直しが 1 回失敗しても止まらないようにする" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

Expected: `--stat` に出るのは 2 ファイルだけ。prettier で関係ない行が変わっていたら、その行は戻す。

---

### Task 9: ADR-0007 を書き、ADR-0002 と CLAUDE.md に一言足す

**Files:**
- Create: `docs/adr/0007-initial-fetch-and-icons.md`
- Modify: `docs/adr/0002-query-cache-and-invalidator.md`（末尾に追記）
- Modify: `CLAUDE.md`（「HTTP / 認証」の段落）

**Interfaces:**
- Consumes: Task 1〜8 の結果。Task 10 の計測の数字は、Task 10 で表に足す。

- [ ] **Step 1: ADR-0007 を書く**

`docs/adr/0006-remove-class-transformer.md` の見出しの立て方（背景・決定・理由・影響・見送った案）に合わせる。次の内容を入れる。

- 作業日 2026-10-14、Agent モデル名 Claude Opus 5.5。
- 背景:
  - v2.11.0 の後もスマホの LCP が 5.6〜7.4 秒のままだったこと。
  - spec「背景」の通信の並び。
  - 本当の順番待ちは今日の運用だけだったこと。
  - `replaceUrl` による二度目の確認があったこと。
  - アイコン名が文字のまま LCP の要素になっていたこと。
- 決定:
  - resolver の並べ方（spec の図）。
  - `QueryCache.get` の `maxAgeMs`。
  - 期限付きで使うのは、呼ぶ側が指定したときだけであること。
  - `ROUTE_CHECK_MAX_AGE_MS = 5_000`。
  - 画面を移るたびの確認は残すというユーザーの意図。
  - ゲストの 401 を `null` としてキャッシュすること。
  - `material-icons` を固定の場所に写し、`preload` すること。`font-display: block` にすること。
- 見送った案:
  - ページの描き始めを取得の完了から切り離す案（案 C）。
  - 新しい部品 `RecentCheck` を作る案（似た仕組みを 2 つ持たないため、`QueryCache` に寄せた）。
  - Google のまま `preconnect` だけ足す案。
- 計測: 見出しだけ作り、「Task 10 で埋める」とは書かない。表は Task 10 で足す。

- [ ] **Step 2: ADR-0002 に追記する**

`docs/adr/0002-query-cache-and-invalidator.md` の末尾に足す。

```markdown
## 追記（2026-10-14）: 期限 maxAgeMs

`QueryCache.get` に `maxAgeMs` を足した。届いてからその長さを過ぎた値は使わず取り直す。省略すれば今までどおり期限なしで、既存の query の振る舞いは変わらない。今は token・profile・maintenance だけが使い、それも呼ぶ側が指定したとき（ガードと resolver が 5 秒）に限る。経緯は ADR-0007。
```

- [ ] **Step 3: CLAUDE.md に一言足す**

`CLAUDE.md` の「HTTP / 認証」の段落で、`forceReload: true` でそのキーを作り直す。` の直後に次の 1 文を足す。

```markdown
`maxAgeMs` を渡すと、届いてからその長さを過ぎた値を取り直す（token・profile・maintenance をガードと resolver が 5 秒だけ使い回す。docs/adr/0007）。
```

- [ ] **Step 4: コミット**

```bash
git add docs/adr/0007-initial-fetch-and-icons.md docs/adr/0002-query-cache-and-invalidator.md CLAUDE.md
git diff --cached --stat
git commit -m "docs: :memo: 起動時の取得と Material Icons の自前配信の ADR-0007 を書く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

Expected: `--stat` に出るのは 3 ファイルだけ。

---

### Task 10: 計測と目視（コントローラーが行う）

**Files:**
- Modify: `docs/adr/0007-initial-fetch-and-icons.md`（計測の表を足す）
- 作業場所: `.context/measure/`（git 管理外）

**Interfaces:**
- Consumes: Task 1〜9 の全部

- [ ] **Step 1: master と branch を同じ条件でビルドする**

master は worktree を作ってビルドする（サンドボックスの外）。

```bash
git worktree add .context/measure/master-tree master
```

worktree の中で `npm_config_cache=/tmp/claude-1000/npm-cache npm ci` を流す。そのあと、次でビルドする。

```bash
npx ng build --configuration development --optimization --source-map=false --named-chunks=false --output-path=../dist-master
```

branch は Task 6 Step 5 と同じコマンドで `.context/measure/dist-branch` にビルドし直す。

- [ ] **Step 2: 配信して Lighthouse を回す（サンドボックスの外）**

```bash
node .context/measure/serve.mjs .context/measure/dist-master/browser 4300
node .context/measure/serve.mjs .context/measure/dist-branch/browser 4301
google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333 --user-data-dir=/tmp/claude-1000/lh-profile about:blank
bash .context/measure/run.sh master 4300
bash .context/measure/run.sh branch 4301
```

上の 3 つの常駐プロセス（配信 2 つと Chrome）は、裏で起動する。

- [ ] **Step 3: 比べる**

- `node .context/measure/compare.mjs` で、ページごとにスマホの FCP・LCP・TBT の中央値を比べる。
- `node /home/seapolis/Projects/sotetsu-lab-v3/.context/lighthouse/waterfall.mjs .context/measure/out/branch/train-location.mobile.1.json` で、`/api/maintenance` と `/api/auth/token` が 1 回ずつしか出ないことを見る。master 側は 2 回ずつ出る。
- ページのデータ（trip-blocks）を取り始める時刻を、master と branch で比べる。

Expected:
- branch では、maintenance・token・profile が 1 回ずつになる。
- 今日の編成が、今日のダイヤと同じ段で出る。
- Material Icons の woff2 が、ページの JS と同じ最初の波で取られる。
- スマホの LCP は、トップ・列車位置情報・駅別時刻表・運用表・ダイヤグラムで下がるか、悪くならない。

悪くなったページがあれば、そこで止めて原因を調べる。

- [ ] **Step 4: 目視**

- 開発サーバー（4200）は docker の別ボリュームの node_modules を使う。`docker exec` でコンテナの中に入って `npm ci` を流し、`docker restart` する（サンドボックスの外）。
- `SKIP_ERRORS=1` を付けずに `.context/measure/visual.mjs` を回す。master（4300）と branch（4200）を、スマホと PC の 10 ページずつ並べて撮る。
- 見ること:
  - アイコンが全ページで同じ形で出ること。
  - アイコン名が文字のまま出ていないこと。
  - `visual/errors.json` に、フォントの 404 やページのエラーが無いこと。

- [ ] **Step 5: 計測の表を ADR-0007 に足してコミットする**

```bash
git add docs/adr/0007-initial-fetch-and-icons.md
git commit -m "docs: :memo: ADR-0007 に計測の結果を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019KaNCYsq4jwnSVyj9XaQrC"
git log --show-signature -1
```

- [ ] **Step 6: 後片付け**

- 配信 2 つと Chrome を止める。
- サンドボックスの外で `git worktree remove .context/measure/master-tree` を流す。
