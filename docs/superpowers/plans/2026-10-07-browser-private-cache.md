# ブラウザ private キャッシュと画面内キャッシュの失効（クライアント側）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- 書き込みが成功したら、関係する画面内キャッシュを捨てる。
- 列車情報を書いた後の 10 分間は、時刻表系の GET を `cache: 'reload'` で取る。こうすると、API が付ける `private, max-age=600` の古い返答を本人が見ない。

**Architecture:**
- 12 個の query クラスの `#obs` を、共通の `QueryCache` にまとめる。
- `QueryInvalidator` が tag（`'timetable'` / `'sighting'`）を流し、query クラスがそれを購読して自分のキャッシュを捨てる。
- 列車情報を書いた時刻は `localStorage` に置き、時刻表系の取得の `cache` を決めるのに使う。

**Tech Stack:** Angular 20.3（standalone、`provideHttpClient(withFetch())`）/ RxJS 7 / Jest + `HttpTestingController`

**Spec:** `docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`（API 側は `sotetsu-lab-v3-api/docs/superpowers/specs/2026-10-07-browser-private-cache-design.md`）

## Global Constraints

- `localStorage` のキーは `sotetsu-lab:timetable-written-at`。読み書きはすべて try/catch で囲む。
- 窓の長さは 10 分（600,000 ms）。API の `CACHE_CONTROL.TIMETABLE`（`private, max-age=600`）と同じ値でなければならない。定数のそばに API の spec を指すコメントを書く。
- `'timetable'` で捨てるもの:
  - `TripBlockQuery` の全部。
  - `OperationQuery` の `findManyByCalendarId`、`findManyWithTrips`、`findOneWithTrips`、`findManyBySpecificPeriod`。
- `'sighting'` で捨てるもの:
  - `OperationSightingQuery` の全部。
  - `OperationQuery` の `findOneWithCurrentPosition`、`findManyWithCurrentPosition`。
- `cache: 'reload'` の対象は、`TripBlockQuery` の全取得と、`OperationQuery` の上の 4 メソッドだけ。
- マスタの query（agency, calendar, calendar-date, formation, route, service, station, trip, trip-class）は `QueryCache` へ移すだけで、失効の対象にしない。
- キャッシュの振る舞いは今と同じに保つ。
  - `http.get(...)` の直後に `shareReplay({ bufferSize: 1, refCount: true })` を置き、`map` はその後ろに付けて購読ごとに走らせる。
  - `forceReload` のときは作り直す。
  - エラーになったら次の購読で取り直す（`shareReplay` の既定）。
- 書き込みが失敗したときは知らせない。
- 使われていない `TripBlockQuery.invalidateAll()`、`#worldVersion`、`TripBlockService.invalidateAll()` は消す。
- private フィールドは `#`、注入は `inject()`。既存の `constructor(private readonly http: HttpClient)` はそのまま残してよい。
- テストは `npx jest --testPathPattern=<パス> > .context/<名前>.txt 2>&1` で走らせ、tail を読む（`npm test` は使わない）。
- prettier はファイル単位でかける（ディレクトリ単位は禁止）。
- ESLint はリポジトリ全体で壊れているので（ESLint 9 の flat config が無い）、走らせない。型は `npx tsc --noEmit -p tsconfig.app.json` で確かめる。
- コミットは Conventional Commits + 絵文字、署名つき。docs のコミットはコードより先。

## Review Focus

1. **別のタブ。**
   - 列車情報を保存したタブ A とは別に、時刻表系の画面を開いたままのタブ B があるとする。B の画面内キャッシュは、A の知らせを受け取れない。
   - spec の「別のタブでも 10 分の窓を引き継ぐ」を実のあるものにするため、`storage` イベントで B でも `'timetable'` を流す。→ Task 2 のテストで、`StorageEvent` を受けたら流すことを確かめる（**spec に書いていない追加。ruling として扱い、ユーザーに伝える**）。
2. **`localStorage` が投げる環境**（プライベートウィンドウやブロック設定）。そこでも書いたタブでは 10 分の窓が効き、例外で書き込みが失敗扱いにならないこと。→ Task 2 で、`setItem` / `getItem` が投げるケースを確かめる。
3. **`findManyByCalendarId` の中の `findManyByFilter`。** `'timetable'` の後に `findManyByCalendarId` を呼ぶと、上下 2 本が両方とも取り直され、2 本とも `cache: 'reload'` になること。→ Task 3 で確かめる。
4. **`'sighting'` を受けたとき。** `OperationQuery` の時刻表系（運用表の 3.5MB）は捨てずに、現在位置だけを捨てること。→ Task 4 で確かめる。
5. **書き込みの Observable が値を流さずに完了した場合や、エラーになった場合。** そのときは知らせないこと。→ Task 5 で、エラーのケースを確かめる。HTTP の POST は必ず 1 回値を流すので、値を流さない完了はテストしない。

---

### Task 1: ADR と CLAUDE.md

**Files:**
- Create: `docs/adr/0002-query-cache-and-invalidator.md`
- Modify: `CLAUDE.md`（「HTTP / 認証」節の最後の文）

- [ ] **Step 1: ADR を書く**

`docs/adr/0001-shared-sticky-control-band.md` と同じ見出しで書く。中身は次の 4 点。

- 背景:
  - API が v3 GET に `private, max-age` を付ける。CloudFront の共有キャッシュは認証を素通りするので不採用にした。
  - 画面内キャッシュは、書き込んでも捨てていなかった。
- 決定:
  - `QueryCache` に一本化する。
  - `QueryInvalidator` の tag で捨てる。
  - 列車情報を書いた後の 10 分は `cache: 'reload'` で取る。
  - 別のタブには `storage` イベントで知らせる。
- 対象外: マスタ。アプリから書かないので失効させない。
- 置き場と名前:
  - `QueryCache` と `QueryInvalidator` は `core/query-cache/` に置く。
  - `Service` を付けないのは、libs の `usecase/*.service.ts` と取り違えないため。
  - **方針として、`core/` の新しい部品は役目ごとのディレクトリに置き、`Service` を付けない。** 既存の `core/services/` の 6 個（`AppUpdateService`、`ErrorHandlerService`、`TitleService`、`NotificationService`、`GoogleAnalyticsService`、`SocketService`）は、別のリファクタで寄せる。名前の候補は `AppUpdater`、`AppErrorHandler`、`PageTitle`、`Notifier`、`PageViewTracker`、`SocketClient`（2026-10-07 ユーザー了承）。
- 結果: 書いた本人は、保存後の時刻表をすぐ見られる。他の利用者は最大 10 分遅れる。

- [ ] **Step 2: CLAUDE.md を直す**

「HTTP / 認証」節の次の文:

```
インフラクエリは `HttpParams` でクエリパラメータを構築し、`md5(JSON.stringify(params))` をキーに `shareReplay` でキャッシュし、`forceReload: true` でキャッシュを破棄できる。
```

を、次の文に置き換える。

```
インフラクエリは `HttpParams` でクエリパラメータを構築し、`core/query-cache/query-cache.ts` の `QueryCache`（`md5` のキー + `shareReplay`）でキャッシュする。`forceReload: true` でそのキーを作り直す。書き込みが成功したら、libs の usecase service が `QueryInvalidator.invalidate('timetable' | 'sighting')` を呼び、関係する query がキャッシュを捨てる。列車情報を書いた後の 10 分は、時刻表系の GET に `cache: 'reload'` を付ける（API の `private, max-age=600` と対。docs/adr/0002）。
```

- [ ] **Step 3: コミット（docs だけであることを確かめてから）**

```bash
git add docs/adr/0002-query-cache-and-invalidator.md CLAUDE.md
git diff --cached --stat
git commit -S -m "docs: :memo: 画面内キャッシュの一本化と失効の ADR を追加する"
```

---

### Task 2: `QueryCache` と `QueryInvalidator`

**Files:**
- Create: `src/app/core/query-cache/query-cache.ts`
- Create: `src/app/core/query-cache/query-cache.spec.ts`
- Create: `src/app/core/query-cache/query-invalidator.ts`
- Create: `src/app/core/query-cache/query-invalidator.spec.ts`

**Interfaces:**
- Produces:
  - `class QueryCache { get<T>(options: { name: string; params: object; fetch: () => Observable<T>; forceReload?: boolean }): Observable<T>; clear(names?: readonly string[]): void }`
  - `type QueryInvalidationTag = 'timetable' | 'sighting'`
  - `const TIMETABLE_RELOAD_WINDOW_MS = 600_000`
  - `const TIMETABLE_WRITTEN_AT_KEY = 'sotetsu-lab:timetable-written-at'`
  - `class QueryInvalidator`（`providedIn: 'root'`）:
    - `readonly invalidated$: Observable<QueryInvalidationTag>`
    - `invalidate(tag: QueryInvalidationTag): void`
    - `timetableRequestCache(): RequestCache` は `'reload' | 'default'` を返す

- [ ] **Step 1: `QueryCache` の失敗するテストを書く**

`src/app/core/query-cache/query-cache.spec.ts`:

```ts
import { defer, of, throwError } from 'rxjs';
import { QueryCache } from './query-cache';

describe('QueryCache', () => {
    it('同じ name と params なら fetch を 1 回しか呼ばず、同じ Observable を返す', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        const a = cache.get({ name: 'find', params: { id: 'x' }, fetch });
        const b = cache.get({ name: 'find', params: { id: 'x' }, fetch });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(a).toBe(b);
    });

    it('params が違えば別に覚える', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        cache.get({ name: 'find', params: { id: 'x' }, fetch });
        cache.get({ name: 'find', params: { id: 'y' }, fetch });

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('購読を何回しても、元の取得は 1 回だけ走る', () => {
        const cache = new QueryCache();
        let runs = 0;
        const obs = cache.get({
            name: 'find',
            params: {},
            fetch: () => defer(() => of(++runs)),
        });

        const got: number[] = [];
        obs.subscribe((v) => got.push(v));
        obs.subscribe((v) => got.push(v));

        expect(runs).toBe(1);
        expect(got).toEqual([1, 1]);
    });

    it('forceReload なら作り直す', () => {
        const cache = new QueryCache();
        const fetch = jest.fn(() => of(1));

        cache.get({ name: 'find', params: { id: 'x' }, fetch });
        cache.get({
            name: 'find',
            params: { id: 'x' },
            fetch,
            forceReload: true,
        });

        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('エラーになったら、次の購読で取り直す', () => {
        const cache = new QueryCache();
        let runs = 0;
        const obs = cache.get({
            name: 'find',
            params: {},
            fetch: () =>
                defer(() =>
                    ++runs === 1 ? throwError(() => 'ng') : of(runs),
                ),
        });

        obs.subscribe({ error: () => undefined });
        let value: number | undefined;
        obs.subscribe((v) => (value = v));

        expect(runs).toBe(2);
        expect(value).toBe(2);
    });

    it('clear(names) はその name だけを捨てる', () => {
        const cache = new QueryCache();
        const fetchA = jest.fn(() => of('a'));
        const fetchB = jest.fn(() => of('b'));
        const load = () => {
            cache.get({ name: 'a', params: { id: 1 }, fetch: fetchA });
            cache.get({ name: 'a', params: { id: 2 }, fetch: fetchA });
            cache.get({ name: 'b', params: { id: 1 }, fetch: fetchB });
        };
        load();

        cache.clear(['a']);
        load();

        expect(fetchA).toHaveBeenCalledTimes(4);
        expect(fetchB).toHaveBeenCalledTimes(1);
    });

    it('clear() は全部捨てる', () => {
        const cache = new QueryCache();
        const fetchA = jest.fn(() => of('a'));
        const fetchB = jest.fn(() => of('b'));
        const load = () => {
            cache.get({ name: 'a', params: {}, fetch: fetchA });
            cache.get({ name: 'b', params: {}, fetch: fetchB });
        };
        load();

        cache.clear();
        load();

        expect(fetchA).toHaveBeenCalledTimes(2);
        expect(fetchB).toHaveBeenCalledTimes(2);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/core/query-cache/query-cache.spec.ts > .context/jest-query-cache.txt 2>&1; tail -30 .context/jest-query-cache.txt`
Expected: FAIL（`Cannot find module './query-cache'`）

- [ ] **Step 3: `QueryCache` を実装する**

`src/app/core/query-cache/query-cache.ts`:

```ts
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

/**
 * libs の query クラスが持つ画面内キャッシュ。
 * name と params の md5 をキーに、取得を shareReplay で使い回す（エラーになったら次の購読で取り直す）。
 * name ごとに捨てられるので、書き込みに関係するメソッドだけを失効できる（QueryInvalidator）。
 */
export class QueryCache {
    readonly #entries = new Map<
        string,
        { name: string; obs: Observable<unknown> }
    >();

    get<T>(options: {
        /** キャッシュを捨てる単位。query クラスのメソッド名を入れる */
        name: string;
        /** name の中でキーを分ける値（calendarId など） */
        params: object;
        /** キャッシュに無いときの取り方 */
        fetch: () => Observable<T>;
        forceReload?: boolean;
    }): Observable<T> {
        const { name, params, fetch, forceReload } = options;
        const key = md5(JSON.stringify({ name, ...params }));

        if (forceReload) {
            this.#entries.delete(key);
        }

        let entry = this.#entries.get(key);
        if (!entry) {
            entry = {
                name,
                obs: fetch().pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                ),
            };
            this.#entries.set(key, entry);
        }

        return entry.obs as Observable<T>;
    }

    clear(names?: readonly string[]): void {
        if (!names) {
            this.#entries.clear();
            return;
        }
        for (const [key, entry] of this.#entries) {
            if (names.includes(entry.name)) {
                this.#entries.delete(key);
            }
        }
    }
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/core/query-cache/query-cache.spec.ts > .context/jest-query-cache.txt 2>&1; tail -30 .context/jest-query-cache.txt`
Expected: PASS 7/7

- [ ] **Step 5: `QueryInvalidator` の失敗するテストを書く**

`src/app/core/query-cache/query-invalidator.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import {
    QueryInvalidator,
    QueryInvalidationTag,
    TIMETABLE_RELOAD_WINDOW_MS,
    TIMETABLE_WRITTEN_AT_KEY,
} from './query-invalidator';

describe('QueryInvalidator', () => {
    const setup = () => {
        TestBed.configureTestingModule({});
        const invalidator = TestBed.inject(QueryInvalidator);
        const tags: QueryInvalidationTag[] = [];
        invalidator.invalidated$.subscribe((t) => tags.push(t));
        return { invalidator, tags };
    };

    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('invalidate した tag をそのまま流す', () => {
        const { invalidator, tags } = setup();

        invalidator.invalidate('sighting');
        invalidator.invalidate('timetable');

        expect(tags).toEqual(['sighting', 'timetable']);
    });

    it('書き込みが無ければ時刻表の取得は default', () => {
        const { invalidator } = setup();

        expect(invalidator.timetableRequestCache()).toBe('default');
    });

    it("'timetable' から 10 分のあいだは reload、過ぎたら default", () => {
        const { invalidator } = setup();

        invalidator.invalidate('timetable');
        expect(invalidator.timetableRequestCache()).toBe('reload');

        jest.advanceTimersByTime(TIMETABLE_RELOAD_WINDOW_MS - 1);
        expect(invalidator.timetableRequestCache()).toBe('reload');

        jest.advanceTimersByTime(1);
        expect(invalidator.timetableRequestCache()).toBe('default');
    });

    it("'timetable' の時刻を localStorage に書き、読み込み直した後のサービスも引き継ぐ", () => {
        const { invalidator } = setup();
        invalidator.invalidate('timetable');

        expect(localStorage.getItem(TIMETABLE_WRITTEN_AT_KEY)).toBe(
            String(Date.now()),
        );

        TestBed.resetTestingModule();
        const { invalidator: reloaded } = setup();
        expect(reloaded.timetableRequestCache()).toBe('reload');
    });

    it("'sighting' では時刻を書かない", () => {
        const { invalidator } = setup();

        invalidator.invalidate('sighting');

        expect(localStorage.getItem(TIMETABLE_WRITTEN_AT_KEY)).toBeNull();
        expect(invalidator.timetableRequestCache()).toBe('default');
    });

    it('localStorage が投げても、そのタブでは 10 分の窓が効く', () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { invalidator, tags } = setup();

        expect(() => invalidator.invalidate('timetable')).not.toThrow();
        expect(tags).toEqual(['timetable']);
        expect(invalidator.timetableRequestCache()).toBe('reload');
    });

    it("別のタブが時刻を書いたら（storage イベント）、このタブでも 'timetable' を流して reload にする", () => {
        const { invalidator, tags } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', {
                key: TIMETABLE_WRITTEN_AT_KEY,
                newValue: String(Date.now()),
            }),
        );

        expect(tags).toEqual(['timetable']);
        expect(invalidator.timetableRequestCache()).toBe('reload');
    });

    it('関係ないキーの storage イベントでは流さない', () => {
        const { tags } = setup();

        window.dispatchEvent(
            new StorageEvent('storage', { key: 'other', newValue: '1' }),
        );

        expect(tags).toEqual([]);
    });
});
```

- [ ] **Step 6: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/core/query-cache/query-invalidator.spec.ts > .context/jest-query-invalidator.txt 2>&1; tail -30 .context/jest-query-invalidator.txt`
Expected: FAIL（`Cannot find module './query-invalidator'`）

- [ ] **Step 7: `QueryInvalidator` を実装する**

`src/app/core/query-cache/query-invalidator.ts`:

```ts
import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type QueryInvalidationTag = 'timetable' | 'sighting';

/**
 * 列車情報を書いた後、時刻表系の GET を `cache: 'reload'` で取る長さ。
 * API の CACHE_CONTROL.TIMETABLE（`private, max-age=600`）と同じでなければならない
 * （sotetsu-lab-v3-api の docs/superpowers/specs/2026-10-07-browser-private-cache-design.md）。
 */
export const TIMETABLE_RELOAD_WINDOW_MS = 600_000;

/** 列車情報を書いた時刻。読み込み直しても、別のタブでも 10 分の窓を引き継ぐために localStorage に置く。 */
export const TIMETABLE_WRITTEN_AT_KEY = 'sotetsu-lab:timetable-written-at';

/**
 * 書き込みが成功したことを query クラスに知らせ、関係する画面内キャッシュを捨てさせる。
 * 'timetable' は列車情報、'sighting' は目撃の書き込み。マスタはアプリから書かないので tag が無い。
 */
@Injectable({ providedIn: 'root' })
export class QueryInvalidator {
    readonly #invalidated = new Subject<QueryInvalidationTag>();
    readonly invalidated$: Observable<QueryInvalidationTag> =
        this.#invalidated.asObservable();

    /** localStorage が使えない環境のための、このタブだけの控え */
    #timetableWrittenAt: number | null = null;

    constructor() {
        const window = inject(DOCUMENT).defaultView;
        // 別のタブで列車情報が書かれたら、このタブの画面内キャッシュも捨てる
        const onStorage = (event: StorageEvent) => {
            if (event.key !== TIMETABLE_WRITTEN_AT_KEY || !event.newValue) {
                return;
            }
            this.#timetableWrittenAt = Number(event.newValue);
            this.#invalidated.next('timetable');
        };
        window?.addEventListener('storage', onStorage);
        inject(DestroyRef).onDestroy(() =>
            window?.removeEventListener('storage', onStorage),
        );
    }

    invalidate(tag: QueryInvalidationTag): void {
        if (tag === 'timetable') {
            const now = Date.now();
            this.#timetableWrittenAt = now;
            try {
                localStorage.setItem(TIMETABLE_WRITTEN_AT_KEY, String(now));
            } catch {
                // 覚えられなくても、このタブでは #timetableWrittenAt で窓が効く
            }
        }
        this.#invalidated.next(tag);
    }

    timetableRequestCache(): RequestCache {
        const writtenAt = this.#readTimetableWrittenAt();
        return writtenAt !== null &&
            Date.now() - writtenAt < TIMETABLE_RELOAD_WINDOW_MS
            ? 'reload'
            : 'default';
    }

    #readTimetableWrittenAt(): number | null {
        let stored: number | null = null;
        try {
            const value = localStorage.getItem(TIMETABLE_WRITTEN_AT_KEY);
            stored = value === null ? null : Number(value);
        } catch {
            stored = null;
        }
        const candidates = [stored, this.#timetableWrittenAt].filter(
            (v): v is number => v !== null && Number.isFinite(v),
        );
        return candidates.length > 0 ? Math.max(...candidates) : null;
    }
}
```

- [ ] **Step 8: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/core/query-cache/query-invalidator.spec.ts > .context/jest-query-invalidator.txt 2>&1; tail -30 .context/jest-query-invalidator.txt`
Expected: PASS 8/8

- [ ] **Step 9: 整形してコミット**

```bash
npx prettier --write src/app/core/query-cache/query-cache.ts src/app/core/query-cache/query-cache.spec.ts src/app/core/query-cache/query-invalidator.ts src/app/core/query-cache/query-invalidator.spec.ts
git add src/app/core/query-cache/query-cache.ts src/app/core/query-cache/query-cache.spec.ts src/app/core/query-cache/query-invalidator.ts src/app/core/query-cache/query-invalidator.spec.ts
git commit -S -m "feat: :sparkles: 画面内キャッシュの共通部品と失効の知らせを追加する"
```

---

### Task 3: `TripBlockQuery` を `QueryCache` に移し、`'timetable'` で捨てる

**Files:**
- Modify: `src/app/libs/trip-block/infrastructure/queries/trip-block.query.ts`
- Modify: `src/app/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts`
- Modify: `src/app/libs/trip-block/usecase/trip-block.service.ts`（`invalidateAll` を消すだけ）

**Interfaces:**
- Consumes: `QueryCache`、`QueryInvalidator`（`invalidated$`、`invalidate`、`timetableRequestCache()`）
- Produces: `TripBlockQuery` の公開メソッドは今と同じ（`findManyByFilter`、`findManyByCalendarId`、`findOneById`）。`invalidateAll` は無くなる。

- [ ] **Step 1: spec を書き換える（失敗させる）**

`trip-block.query.spec.ts` を次のように変える。

1. `setup()` で query を `new TripBlockQuery(http)` ではなく `TestBed.inject(TripBlockQuery)` で取る（`inject()` を使うため）。あわせて `QueryInvalidator` も返す:

```ts
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
// …
function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
        ],
    });
    const controller = TestBed.inject(HttpTestingController);
    return {
        query: TestBed.inject(TripBlockQuery),
        controller,
        invalidator: TestBed.inject(QueryInvalidator),
    };
}
```

2. `describe` の先頭の `afterEach` の前に、時刻と localStorage を固定する:

```ts
    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });
```

（既存の `afterEach` はこれに置き換える）

3. 既存の `'invalidateAll causes subsequent calls to issue fresh requests'` を消し、次のテストを足す:

```ts
    it("'timetable' を受けたら、findManyByFilter と findOneById を取り直す", () => {
        const { query, controller, invalidator } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        query.findOneById({ id: 'b1' }).subscribe();
        controller.match(() => true).forEach((r) => r.flush(r.request.url.endsWith('/b1') ? { trips: [] } : []));

        invalidator.invalidate('timetable');

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        query.findOneById({ id: 'b1' }).subscribe();
        const again = controller.match(() => true);
        expect(again).toHaveLength(2);
        again.forEach((r) => r.flush(r.request.url.endsWith('/b1') ? { trips: [] } : []));
        controller.verify();
    });

    it("'sighting' では捨てない", () => {
        const { query, controller, invalidator } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        controller.expectOne((r) => r.url === v3ApiUrl).flush([]);

        invalidator.invalidate('sighting');
        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();

        controller.verify();
    });

    it('書き込みが無ければ cache は default', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        const req = controller.expectOne((r) => r.url === v3ApiUrl);

        expect(req.request.cache).toBe('default');
        req.flush([]);
    });

    it("'timetable' の後の findManyByCalendarId は、上下 2 本とも reload で取り直す", () => {
        const { query, controller, invalidator } = setup();
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        controller.match(() => true).forEach((r) => r.flush([]));

        invalidator.invalidate('timetable');
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();

        const reqs = controller.match((r) => r.url === v3ApiUrl);
        expect(reqs.map((r) => r.request.cache)).toEqual(['reload', 'reload']);
        reqs.forEach((r) => r.flush([]));
        controller.verify();
    });

    it('書き込みから 10 分を過ぎたら、取り直しても cache は default に戻る', () => {
        const { query, controller, invalidator } = setup();

        invalidator.invalidate('timetable');
        jest.advanceTimersByTime(600_000);
        query.findOneById({ id: 'b1' }).subscribe();
        const req = controller.expectOne(`${v3ApiUrl}/b1`);

        expect(req.request.cache).toBe('default');
        req.flush({ trips: [] });
    });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts > .context/jest-trip-block-query.txt 2>&1; tail -40 .context/jest-trip-block-query.txt`
Expected: FAIL（新しい 5 本のうち、`'timetable'` で取り直す、`cache` が `'default'` / `'reload'` の各テストが落ちる。`request.cache` は今 `undefined`）

- [ ] **Step 3: `TripBlockQuery` を書き換える**

`trip-block.query.ts` の全体を次のようにする。

```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockFields } from '../../usecase/trip-block-fields';
import { TripBlockDtoBuilder } from '../builders/trip-block.dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';
    readonly #cache = new QueryCache();
    readonly #invalidator = inject(QueryInvalidator);

    constructor(private readonly http: HttpClient) {
        // 列車情報が書かれたら全部捨てる（どのダイヤ・どの列車が変わったかは追わない）
        this.#invalidator.invalidated$
            .pipe(
                filter((tag) => tag === 'timetable'),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.#cache.clear());
    }

    findManyByFilter(params: {
        calendarId: string;
        tripDirection: number;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection, fields, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyByFilter',
                params: { calendarId, tripDirection, fields },
                fetch: () => {
                    const httpParams = new HttpParams({
                        fromObject: {
                            calendarId,
                            tripDirection: String(tripDirection),
                            ...Object.fromEntries(
                                Object.entries(fields ?? {}).map(
                                    ([resource, names]) => [
                                        `fields[${resource}]`,
                                        names.join(','),
                                    ],
                                ),
                            ),
                        },
                    });
                    return this.http.get<TripBlockModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                        cache: this.#invalidator.timetableRequestCache(),
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => TripBlockDtoBuilder.buildFromModel(o)),
                ),
            );
    }

    /**
     * 指定 calendarId の上下（tripDirection=0/1）バルクデータをまとめて取得する。
     * N1(ダイヤグラム)/N2(列車位置情報)/N3(ダッシュボード) が同じキーで呼べば
     * ページ遷移をまたいでも再取得しない（findManyByFilter のキャッシュに加え、
     * forkJoin した結果自体もキャッシュする）。
     */
    findManyByCalendarId(params: {
        calendarId: string;
        fields?: TripBlockFields;
        forceReload?: boolean;
    }): Observable<Record<number, TripBlockDetailsDto[]>> {
        const { calendarId, fields, forceReload } = params;

        return this.#cache.get({
            name: 'findManyByCalendarId',
            params: { calendarId, fields },
            fetch: () =>
                forkJoin({
                    0: this.findManyByFilter({
                        calendarId,
                        tripDirection: 0,
                        fields,
                        forceReload,
                    }),
                    1: this.findManyByFilter({
                        calendarId,
                        tripDirection: 1,
                        fields,
                        forceReload,
                    }),
                }),
            forceReload,
        });
    }

    findOneById(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        const { id, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneById',
                params: { id },
                fetch: () =>
                    this.http.get<TripBlockModel>(`${this.#v3ApiUrl}/${id}`, {
                        observe: 'response',
                        cache: this.#invalidator.timetableRequestCache(),
                    }),
                forceReload,
            })
            .pipe(map((res) => TripBlockDtoBuilder.buildFromModel(res.body)));
    }
}
```

`trip-block.service.ts` から `invalidateAll()` とその JSDoc を消す。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts > .context/jest-trip-block-query.txt 2>&1; tail -40 .context/jest-trip-block-query.txt`
Expected: PASS 11/11（既存 6 本 + 新しい 5 本）

- [ ] **Step 5: 呼び出し元が壊れていないことを確かめる**

Run: `npx tsc --noEmit -p tsconfig.app.json > .context/tsc-trip-block.txt 2>&1; tail -20 .context/tsc-trip-block.txt`
Expected: エラーなし（`invalidateAll` の呼び出し元は 0 件）

- [ ] **Step 6: 整形してコミット**

```bash
npx prettier --write src/app/libs/trip-block/infrastructure/queries/trip-block.query.ts src/app/libs/trip-block/infrastructure/queries/trip-block.query.spec.ts src/app/libs/trip-block/usecase/trip-block.service.ts
git add src/app/libs/trip-block
git commit -S -m "refactor: :recycle: 列車情報の query を共通キャッシュに移し、書き込み後に捨てる"
```

---

### Task 4: `OperationQuery` と `OperationSightingQuery` を移し、tag ごとに捨てる

**Files:**
- Modify: `src/app/libs/operation/infrastructure/queries/operation.query.ts`
- Create: `src/app/libs/operation/infrastructure/queries/operation.query.spec.ts`
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`
- Create: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.spec.ts`

**Interfaces:**
- Consumes: `QueryCache`、`QueryInvalidator`
- Produces: 公開メソッドは今と同じ。

- [ ] **Step 1: `OperationQuery` の失敗するテストを書く**

`operation.query.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { OperationQuery } from './operation.query';

const url = environment.apiUrl + '/v3/operations';

describe('OperationQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        return {
            query: TestBed.inject(OperationQuery),
            controller: TestBed.inject(HttpTestingController),
            invalidator: TestBed.inject(QueryInvalidator),
        };
    };

    /** 時刻表系 4 本と現在位置 1 本を一度ずつ取って返答する */
    const loadAll = (
        query: OperationQuery,
        controller: HttpTestingController,
    ) => {
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query.findOneWithTrips({ operationId: 'op-1' }).subscribe();
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();
        controller.match(() => true).forEach((r) => {
            r.flush(
                r.request.url.endsWith('/op-1/trips')
                    ? { operation: {}, trips: [] }
                    : [],
            );
        });
    };

    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('2 回目はキャッシュから返す', () => {
        const { query, controller } = setup();
        loadAll(query, controller);

        loadAll(query, controller);

        controller.verify();
    });

    it("'timetable' では時刻表系 4 本だけを reload で取り直し、現在位置は捨てない", () => {
        const { query, controller, invalidator } = setup();
        loadAll(query, controller);

        invalidator.invalidate('timetable');
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query.findOneWithTrips({ operationId: 'op-1' }).subscribe();
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();

        const reqs = controller.match(() => true);
        expect(reqs.map((r) => r.request.url).sort()).toEqual(
            [
                `${url}/calendar/cal-1`,
                `${url}/calendar/cal-1/trips`,
                `${url}/op-1/trips`,
                `${url}/from/2026-10-07/to/2026-10-07`,
            ].sort(),
        );
        expect(reqs.every((r) => r.request.cache === 'reload')).toBe(true);
        reqs.forEach((r) =>
            r.flush(
                r.request.url.endsWith('/op-1/trips')
                    ? { operation: {}, trips: [] }
                    : [],
            ),
        );
        controller.verify();
    });

    it("'sighting' では現在位置だけを取り直し、時刻表系は捨てない", () => {
        const { query, controller, invalidator } = setup();
        loadAll(query, controller);

        invalidator.invalidate('sighting');
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();

        const req = controller.expectOne(
            (r) => r.url === `${url}/current-positions`,
        );
        expect(req.request.cache).toBeUndefined();
        req.flush([]);
        controller.verify();
    });

    it('現在位置と運用群の取得には cache を付けない', () => {
        const { query, controller, invalidator } = setup();
        invalidator.invalidate('timetable');

        query.findOneWithCurrentPosition({ operationId: 'op-1' }).subscribe();
        query.findManyGroups().subscribe();

        const reqs = controller.match(() => true);
        expect(reqs.map((r) => r.request.cache)).toEqual([
            undefined,
            undefined,
        ]);
        reqs.forEach((r) => r.flush(r.request.url.endsWith('/groups') ? [] : {}));
    });

    it('calendarId が無ければ取得せず空配列を返す', () => {
        const { query, controller } = setup();
        let result: unknown;

        query
            .findManyByCalendarId({ calendarId: '' })
            .subscribe((r) => (result = r));

        expect(result).toEqual([]);
        controller.verify();
    });
});
```

注意: 返答の builder が空のオブジェクトで落ちる場合は、そのテストだけ `flush` する本文を builder が受け付ける最小の形にする（`OperationCurrentPositionDtoBuilder.buildFromModel` に要る項目を読んで合わせる）。テストの主張（何本取り直すか、`cache` の値）は変えない。

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/libs/operation/infrastructure/queries/operation.query.spec.ts > .context/jest-operation-query.txt 2>&1; tail -40 .context/jest-operation-query.txt`
Expected: FAIL（`'timetable'` と `'sighting'` のテストが、取り直しが起きない・`cache` が `undefined` で落ちる）

- [ ] **Step 3: `OperationQuery` を書き換える**

ファイルの先頭とクラスの頭を次のようにする（import は使わなくなる `md5`、`shareReplay` を消し、`takeUntilDestroyed`、`inject`、`QueryCache`、`QueryInvalidator` を足す）。

```ts
/** 列車情報が書かれたら捨てる取得（時刻表系。cache: 'reload' の対象） */
const TIMETABLE_METHODS = [
    'findManyByCalendarId',
    'findManyWithTrips',
    'findOneWithTrips',
    'findManyBySpecificPeriod',
] as const;

/** 目撃が書かれたら捨てる取得 */
const SIGHTING_METHODS = [
    'findOneWithCurrentPosition',
    'findManyWithCurrentPosition',
] as const;

@Injectable({ providedIn: 'root' })
export class OperationQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operations';
    readonly #cache = new QueryCache();
    readonly #invalidator = inject(QueryInvalidator);

    constructor(private readonly http: HttpClient) {
        this.#invalidator.invalidated$
            .pipe(takeUntilDestroyed())
            .subscribe((tag) =>
                this.#cache.clear(
                    tag === 'timetable' ? TIMETABLE_METHODS : SIGHTING_METHODS,
                ),
            );
    }
```

各メソッドは、次の形に書き換える。キーに入れる params は、今の `JSON.stringify` に入っている `name` 以外の項目そのまま。

```ts
    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { calendarId, forceReload } = params;

        // calendarId 未指定では /v3/operations/calendar/null を叩かず空配列を返す。
        if (!calendarId) {
            return of([]);
        }

        return this.#cache
            .get({
                name: 'findManyByCalendarId',
                params: { calendarId },
                fetch: () =>
                    this.http.get<OperationModel[]>(
                        `${this.#v3ApiUrl}/calendar/${calendarId}`,
                        {
                            observe: 'response',
                            cache: this.#invalidator.timetableRequestCache(),
                        },
                    ),
                forceReload,
            })
            .pipe(map((res) => OperationsDtoBuilder.buildFromModels(res.body)));
    }
```

メソッドごとの対応（`map` の中身は今のものをそのまま移す）:

| メソッド | name | params | URL とオプション | `cache` |
|---|---|---|---|---|
| `findManyByCalendarId` | `'findManyByCalendarId'` | `{ calendarId }` | 上の例のとおり | 付ける |
| `findManyBySpecificPeriod` | `'findManyBySpecificPeriod'` | `{ from, to }` | `${url}/from/${from}/to/${to}`、`observe: 'response'` | 付ける |
| `findOneWithCurrentPosition` | `'findOneWithCurrentPosition'` | `{ operationId, searchTime }` | `${url}/${operationId}/current-position`、`params: httpParams`（今と同じ `omitBy` で作る）、`observe: 'response'` | 付けない |
| `findManyWithCurrentPosition` | `'findManyWithCurrentPosition'` | `{ operationIds }` | `${url}/current-positions`、`params: { operationIds: operationIds.join(',') }`、`observe: 'response'` | 付けない |
| `findManyWithTrips` | `'findManyWithTrips'` | `{ calendarId }` | `${url}/calendar/${calendarId}/trips`、`observe: 'response'` | 付ける |
| `findOneWithTrips` | `'findOneWithTrips'` | `{ operationId }` | `${url}/${operationId}/trips`、`observe: 'response'` | 付ける |
| `findManyGroups` | `'findManyGroups'` | `{}` | `${url}/groups`、`observe: 'response'` | 付けない |

「付ける」は、オプションに `cache: this.#invalidator.timetableRequestCache()` を足すこと。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/libs/operation/infrastructure/queries/operation.query.spec.ts > .context/jest-operation-query.txt 2>&1; tail -40 .context/jest-operation-query.txt`
Expected: PASS 5/5

- [ ] **Step 5: `OperationSightingQuery` の失敗するテストを書く**

`operation-sighting.query.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingQuery } from './operation-sighting.query';

describe('OperationSightingQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        return {
            query: TestBed.inject(OperationSightingQuery),
            controller: TestBed.inject(HttpTestingController),
            invalidator: TestBed.inject(QueryInvalidator),
        };
    };

    const load = (
        query: OperationSightingQuery,
        controller: HttpTestingController,
    ) => {
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: ['01'],
            })
            .subscribe();
        return controller.match(() => true);
    };

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('2 回目はキャッシュから返す', () => {
        const { query, controller } = setup();
        load(query, controller).forEach((r) => r.flush(r.request.url.includes('time-cross-section') ? {} : []));

        expect(load(query, controller)).toHaveLength(0);
    });

    it("'sighting' を受けたら全部取り直す", () => {
        const { query, controller, invalidator } = setup();
        load(query, controller).forEach((r) => r.flush(r.request.url.includes('time-cross-section') ? {} : []));

        invalidator.invalidate('sighting');

        const again = load(query, controller);
        expect(again).toHaveLength(2);
        again.forEach((r) => r.flush(r.request.url.includes('time-cross-section') ? {} : []));
    });

    it("'timetable' では捨てない", () => {
        const { query, controller, invalidator } = setup();
        load(query, controller).forEach((r) => r.flush(r.request.url.includes('time-cross-section') ? {} : []));

        invalidator.invalidate('timetable');

        expect(load(query, controller)).toHaveLength(0);
    });
});
```

- [ ] **Step 6: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.spec.ts > .context/jest-sighting-query.txt 2>&1; tail -40 .context/jest-sighting-query.txt`
Expected: FAIL（`'sighting'` で取り直さず、0 本で落ちる）

- [ ] **Step 7: `OperationSightingQuery` を書き換える**

クラスの頭:

```ts
@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';
    readonly #cache = new QueryCache();

    constructor(private readonly http: HttpClient) {
        inject(QueryInvalidator)
            .invalidated$.pipe(
                filter((tag) => tag === 'sighting'),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.#cache.clear());
    }
```

各メソッドは `OperationQuery` と同じ形（`this.#cache.get({ name, params, fetch: () => this.http.get(...), forceReload }).pipe(map(...))`）に書き換える。`cache` オプションはどれにも付けない。

| メソッド | name | params |
|---|---|---|
| `findManyBySpecificPeriod` | `'findManyBySpecificPeriod'` | `{ from, to, includeInvalidated }` |
| `#findManyTimeCrossSections` | `` `findManyTimeCrossSections:${path}` `` | `{ numbers }` |
| `findOneTimeCrossSectionByOperationNumber` | `'findOneTimeCrossSectionByOperationNumber'` | `{ operationNumber }` |
| `findOneTimeCrossSectionByFormationNumber` | `'findOneTimeCrossSectionByFormationNumber'` | `{ formationNumber }` |

URL・`params`・`map` の中身は今のものをそのまま移す。

- [ ] **Step 8: 通ることを確かめる**

Run: `npx jest --testPathPattern="src/app/libs/(operation|operation-sighting)/infrastructure/queries" > .context/jest-op-queries.txt 2>&1; tail -40 .context/jest-op-queries.txt`
Expected: PASS 8/8

- [ ] **Step 9: 整形してコミット**

```bash
npx prettier --write src/app/libs/operation/infrastructure/queries/operation.query.ts src/app/libs/operation/infrastructure/queries/operation.query.spec.ts src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.spec.ts
git add src/app/libs/operation/infrastructure/queries src/app/libs/operation-sighting/infrastructure/queries
git commit -S -m "refactor: :recycle: 運用と目撃の query を共通キャッシュに移し、書き込みの種類ごとに捨てる"
```

---

### Task 5: 書き込みが成功したら知らせる

**Files:**
- Modify: `src/app/libs/trip-block/usecase/trip-block.service.ts`
- Create: `src/app/libs/trip-block/usecase/trip-block.service.spec.ts`
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts`
- Create: `src/app/libs/operation-sighting/usecase/operation-sighting.service.spec.ts`

**Interfaces:**
- Consumes: `QueryInvalidator.invalidate`

- [ ] **Step 1: 失敗するテストを書く**

`trip-block.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { TripBlockCommand } from '../infrastructure/commands/trip-block.command';
import { TripBlockQuery } from '../infrastructure/queries/trip-block.query';
import { TripBlockService } from './trip-block.service';

describe('TripBlockService の書き込み', () => {
    const setup = (result: 'ok' | 'ng') => {
        const reply = () =>
            result === 'ok' ? of({}) : throwError(() => new Error('ng'));
        const command = {
            createMany: jest.fn(() => (result === 'ok' ? of([]) : reply())),
            replaceOne: jest.fn(reply),
            addTripToTripBlock: jest.fn(reply),
            deleteTripFromTripBlock: jest.fn(reply),
        };
        const invalidator = { invalidate: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: TripBlockCommand, useValue: command },
                { provide: TripBlockQuery, useValue: {} },
                { provide: QueryInvalidator, useValue: invalidator },
            ],
        });
        return { service: TestBed.inject(TripBlockService), invalidator };
    };

    afterEach(() => TestBed.resetTestingModule());

    const writes: [string, (s: TripBlockService) => ReturnType<TripBlockService['replaceOne']> | ReturnType<TripBlockService['createMany']>][] = [
        ['createMany', (s) => s.createMany([])],
        ['replaceOne', (s) => s.replaceOne('b1', {} as never)],
        ['addTripToTripBlock', (s) => s.addTripToTripBlock('b1', {} as never)],
        ['deleteTripFromTripBlock', (s) => s.deleteTripFromTripBlock('b1', {} as never)],
    ];

    it.each(writes)("%s が成功したら 'timetable' を 1 回知らせる", (_name, call) => {
        const { service, invalidator } = setup('ok');

        call(service).subscribe();

        expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
        expect(invalidator.invalidate).toHaveBeenCalledWith('timetable');
    });

    it.each(writes)('%s が失敗したら知らせない', (_name, call) => {
        const { service, invalidator } = setup('ng');

        call(service).subscribe({ error: () => undefined });

        expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
});
```

`operation-sighting.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { OperationSightingService } from './operation-sighting.service';

describe('OperationSightingService の書き込み', () => {
    const setup = (result: 'ok' | 'ng') => {
        const reply = () =>
            result === 'ok'
                ? of(undefined)
                : throwError(() => new Error('ng'));
        const command = {
            post: jest.fn(reply),
            invalidate: jest.fn(reply),
            restore: jest.fn(reply),
        };
        const invalidator = { invalidate: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: OperationSightingCommand, useValue: command },
                { provide: OperationSightingQuery, useValue: {} },
                { provide: QueryInvalidator, useValue: invalidator },
            ],
        });
        return {
            service: TestBed.inject(OperationSightingService),
            invalidator,
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    const writes: [string, (s: OperationSightingService) => Observable<void>][] = [
        ['post', (s) => s.post({} as never)],
        ['invalidate', (s) => s.invalidate({} as never)],
        ['restore', (s) => s.restore({} as never)],
    ];

    it.each(writes)("%s が成功したら 'sighting' を 1 回知らせる", (_name, call) => {
        const { service, invalidator } = setup('ok');

        call(service).subscribe();

        expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
        expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
    });

    it.each(writes)('%s が失敗したら知らせない', (_name, call) => {
        const { service, invalidator } = setup('ng');

        call(service).subscribe({ error: () => undefined });

        expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern="src/app/libs/(trip-block|operation-sighting)/usecase" > .context/jest-usecase-invalidate.txt 2>&1; tail -40 .context/jest-usecase-invalidate.txt`
Expected: FAIL（「成功したら知らせる」7 本が `toHaveBeenCalledTimes(1)` で落ちる。「失敗したら知らせない」7 本は PASS）

- [ ] **Step 3: 実装する**

`trip-block.service.ts`: import に `inject`、`tap`（`rxjs`）、`QueryInvalidator` を足し、フィールドと 4 つの書き込みを次のようにする。

```ts
    readonly #queryInvalidator = inject(QueryInvalidator);

    // …

    createMany(body: CreateTripBlockDto[]): Observable<TripBlockDetailsDto[]> {
        return this.tripBlockCommand
            .createMany(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    replaceOne(
        tripBlockId: string,
        body: ReplaceTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .replaceOne(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    addTripToTripBlock(
        tripBlockId: string,
        body: AddTripToTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .addTripToTripBlock(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }

    deleteTripFromTripBlock(
        tripBlockId: string,
        body: DeleteTripFromTripBlockDto,
    ): Observable<TripBlockDetailsDto> {
        return this.tripBlockCommand
            .deleteTripFromTripBlock(tripBlockId, body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('timetable')));
    }
```

`operation-sighting.service.ts` も同じように書き換える。

```ts
    readonly #queryInvalidator = inject(QueryInvalidator);

    // …

    post(body: PostOperationSightingDto): Observable<void> {
        return this.operationSightingCommand
            .post(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        return this.operationSightingCommand
            .invalidate(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        return this.operationSightingCommand
            .restore(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern="src/app/libs/(trip-block|operation-sighting)/usecase" > .context/jest-usecase-invalidate.txt 2>&1; tail -40 .context/jest-usecase-invalidate.txt`
Expected: PASS 14/14

- [ ] **Step 5: 列車情報の入力の spec が通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form > .context/jest-edit-form.txt 2>&1; tail -20 .context/jest-edit-form.txt`
Expected: `Tests:` 行に failed が無い（`TripBlockService` をモックしているので、影響は無いはず）

- [ ] **Step 6: 整形してコミット**

```bash
npx prettier --write src/app/libs/trip-block/usecase/trip-block.service.ts src/app/libs/trip-block/usecase/trip-block.service.spec.ts src/app/libs/operation-sighting/usecase/operation-sighting.service.ts src/app/libs/operation-sighting/usecase/operation-sighting.service.spec.ts
git add src/app/libs/trip-block/usecase src/app/libs/operation-sighting/usecase
git commit -S -m "feat: :sparkles: 列車情報と目撃の書き込みが成功したら画面内キャッシュを捨てる"
```

---

### Task 6: マスタの query 9 個を `QueryCache` に移す

**Files:**
- Modify:
  - `src/app/libs/agency/infrastructure/queries/agency.query.ts`
  - `src/app/libs/calendar/infrastructure/queries/calendar.query.ts`
  - `src/app/libs/calendar/infrastructure/queries/calendar-date.query.ts`
  - `src/app/libs/formation/infrastructure/queries/formation.query.ts`
  - `src/app/libs/route/infrastructure/queries/route.query.ts`
  - `src/app/libs/service/infrastructure/queries/service.query.ts`
  - `src/app/libs/station/infrastructure/queries/station.query.ts`
  - `src/app/libs/trip/infrastructure/queries/trip.query.ts`
  - `src/app/libs/trip-class/infrastructure/queries/trip-class.query.ts`
- Create: `src/app/libs/route/infrastructure/queries/route.query.spec.ts`

**Interfaces:**
- Consumes: `QueryCache`
- Produces: 公開メソッドは今と同じ。失効の購読は付けない。

- [ ] **Step 1: 代表として `RouteQuery` のテストを書く（今の振る舞いを固定する）**

`route.query.spec.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { RouteQuery } from './route.query';

const url = environment.apiUrl + '/v3/routes';

describe('RouteQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        return {
            query: TestBed.inject(RouteQuery),
            controller: TestBed.inject(HttpTestingController),
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    it('serviceName ごとに 1 回だけ取り、forceReload で取り直す', () => {
        const { query, controller } = setup();

        query.findMany({ serviceName: 'a' }).subscribe();
        controller.expectOne((r) => r.url === url).flush([]);
        query.findMany({ serviceName: 'a' }).subscribe();
        controller.verify();

        query.findMany({ serviceName: 'a', forceReload: true }).subscribe();
        controller.expectOne((r) => r.url === url).flush([]);
        controller.verify();
    });

    it('マスタなので、どの書き込みの知らせでも捨てない', () => {
        const { query, controller } = setup();
        query.findOneWithStations({ routeId: 'r1' }).subscribe();
        controller.expectOne(`${url}/r1/stations`).flush({ stations: [] });

        TestBed.inject(QueryInvalidator).invalidate('timetable');
        TestBed.inject(QueryInvalidator).invalidate('sighting');
        query.findOneWithStations({ routeId: 'r1' }).subscribe();

        controller.verify();
    });

    it('取得には cache を付けない', () => {
        const { query, controller } = setup();

        query.findMany().subscribe();
        const req = controller.expectOne((r) => r.url === url);

        expect(req.request.cache).toBeUndefined();
        req.flush([]);
    });
});
```

（`RouteStationsDtoBuilder.buildFromModel` が `{ stations: [] }` で落ちる場合は、builder が受け付ける最小の形に直す。主張は変えない）

- [ ] **Step 2: 今のコードで通ることを確かめる（移す前の基準）**

Run: `npx jest --testPathPattern=src/app/libs/route/infrastructure/queries/route.query.spec.ts > .context/jest-route-query.txt 2>&1; tail -20 .context/jest-route-query.txt`
Expected: PASS 3/3（振る舞いを固定するテストなので、移す前から通る）

- [ ] **Step 3: 9 個を書き換える**

どのファイルも、次の規則で機械的に書き換える。

1. `#obs: Record<string, Observable<any>> = {};` を `readonly #cache = new QueryCache();` に置き換える。
2. `md5` と `shareReplay` の import を消し、`import { QueryCache } from 'src/app/core/query-cache/query-cache';` を足す。
3. 各メソッドの次の塊を書き換える。
   - 書き換える塊: `const key = md5(JSON.stringify({ name: 'X', ...項目 }))` → `if (forceReload) …` → `if (!this.#obs[key]) { …; this.#obs[key] = http.get(…).pipe(shareReplay(…), map(…)); }` → `return this.#obs[key];`
   - 書き換え後の形:

```ts
return this.#cache
    .get({
        name: 'X',
        params: { ...項目 },
        fetch: () => {
            /* HttpParams の組み立てがあればここ */
            return http.get(…);
        },
        forceReload,
    })
    .pipe(map(…));
```

   - `X` と項目は、今の `JSON.stringify` に入っているものをそのまま使う（`name` 以外の全項目）。
4. `cache` オプションは付けない。`QueryInvalidator` も使わない。

例（`route.query.ts` の `findMany`）:

```ts
    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<RouteDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: { serviceName },
                fetch: () => {
                    const httpParams = new HttpParams(
                        serviceName ? { fromObject: { serviceName } } : {},
                    );
                    return this.#http.get<RouteModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => RouteDtoBuilder.buildFromModel(o)),
                ),
            );
    }
```

`shareReplay` と `map` のあいだに別の operator があるメソッドを見つけたら、それは `map` と一緒に `.pipe(...)` 側へ移す。1 つのキーに 2 つの取得をまとめているなど、規則に当てはまらないメソッドがあれば、今の振る舞いを保つ形を選んで ledger に `Ruling:` を書く。

- [ ] **Step 4: 型と全テスト**

Run: `npx tsc --noEmit -p tsconfig.app.json > .context/tsc-master-queries.txt 2>&1; tail -20 .context/tsc-master-queries.txt`
Expected: エラーなし

Run: `grep -rn "#obs\|shareReplay\|from 'js-md5'" src/app/libs`
Expected: `src/app/libs` の query クラスに `#obs` は残っていない。`shareReplay` と `js-md5` は query クラスから消えている（libs のほかの場所で使っていれば残ってよい）。

Run: `npx jest > .context/jest-all.txt 2>&1; grep -n "^Tests:" .context/jest-all.txt`
Expected: failed が 0。もし落ちたら、master で同じ spec が落ちるかを `git stash` で確かめ、元から落ちていたものなら ledger に書く。

- [ ] **Step 5: 整形してコミット**

```bash
npx prettier --write src/app/libs/agency/infrastructure/queries/agency.query.ts src/app/libs/calendar/infrastructure/queries/calendar.query.ts src/app/libs/calendar/infrastructure/queries/calendar-date.query.ts src/app/libs/formation/infrastructure/queries/formation.query.ts src/app/libs/route/infrastructure/queries/route.query.ts src/app/libs/route/infrastructure/queries/route.query.spec.ts src/app/libs/service/infrastructure/queries/service.query.ts src/app/libs/station/infrastructure/queries/station.query.ts src/app/libs/trip/infrastructure/queries/trip.query.ts src/app/libs/trip-class/infrastructure/queries/trip-class.query.ts
git diff --stat
git add src/app/libs/*/infrastructure/queries
git commit -S -m "refactor: :recycle: マスタの query を共通キャッシュに移す"
```

---

### Task 7: 実データで確かめる

**Files:** なし（確認だけ。結果は ledger と最終報告に書く）

- [ ] **Step 1: 本番 DB に書く前に、ユーザーの了承を取る**

ローカルの API（`:3000`）は本番の Supabase を読み書きする。保存テストは「渋谷工事臨時ダイヤ（2021 年 10 月版）」で、列車番号は `9999T` などにする。後始末の SQL はユーザーに流してもらう。了承が無ければ Step 2 は飛ばし、Step 3 だけ行う。

- [ ] **Step 2: 同じタブで保存が反映されることを確かめる（Playwright）**

1. `npm run dev` で開き、渋谷工事臨時ダイヤの運用表を一度開く。trip-blocks と `operations/calendar/…/trips` が取られることを `browser_network_requests` で見る。
2. 同じタブで列車情報の入力に移り、テスト列車を 1 本保存する。
3. 同じタブで運用表に戻る。trip-blocks と `operations/calendar/…/trips` がもう一度取られ、保存した列車が出ることを、スクリーンショットで見る。
4. 同じタブで駅別時刻表と全線時刻表を開き、保存した列車が出ることを見る。

- [ ] **Step 3: 保存しない画面の取得回数が変わっていないことを確かめる**

ダッシュボード → real-time → 運用表 → ダッシュボードの順に移り、`browser_network_requests` で、マスタ（stations / routes / trip-classes など）が 2 回目以降に取られていないことを見る（移す前と同じ）。

- [ ] **Step 4: 結果を ledger に書く**

Step 2 で反映されない画面があれば、その画面が使っている query メソッドを調べ、`'timetable'` の対象に足すかどうかを ruling にする。足すなら Task 4 と同じ形でテストを足して直す。

---

## 出す順番

- このクライアントを先にデプロイし、API（`sotetsu-lab-v3-api/docs/superpowers/plans/2026-10-07-browser-private-cache.md`）はその後に出す。
- 本番でブラウザキャッシュとの組み合わせ（10 分以内の取得が `(disk cache)` にならないこと）を見られるのは、API が出た後になる。
