# SSR の下ごしらえ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ssr: false` のまま、全ページをサーバーで描いたときに落ちず・終わり・前のリクエストの中身が混ざらないようにする。手元で SSR を起動して全ページを叩く確かめ方も作る。

**Architecture:** 本番のビルド（`production`）は変えない。`angular.json` に手元専用の `ssr-check` 構成を足し、Angular 22 の `AngularNodeAppEngine` の `server.ts` で起動して、スクリプトが主なページを順に叩く。サーバーで壊れるところ（GA・web-vitals・一定間隔のタイマー・Elf のストアの使い回し・重い起動時の取得・メンテ判定）を直す。

**Tech Stack:** Angular 22.2（`@angular/ssr` 22.2.2・`application` ビルダー）・Express 5・zone.js・@ngneat/elf 2・Jest 30

**Spec:** `docs/superpowers/specs/2026-10-12-ssr-design.md`（特に 5.2・5.3・13 章。リリースの分け方は 13.3 の 1）

## Global Constraints

- 作業場所は worktree `/home/seapolis/Projects/sotetsu-lab-v3/.context/wt-client-ssr`（branch `feature/ssr`）。main checkout（`sotetsu-lab-v3-client`）には触らない
- `angular.json` の `production` 構成と `"ssr": false`・`"prerender": false`（options）は変えない。利用者に届くビルドの中身を変えないリリース
- テストは `npx jest --testPathPatterns=<path>`（`npm test` はサンドボックスで全 spec が落ちる）。全体は `npx jest` をサンドボックスの外で
- コンポーネントは OnPush・standalone・`inject()`・private は `#`。新しい core の部品は役目のディレクトリに置き、名前に Service を付けない
- コミットは GPG 署名つき。署名はサンドボックスの中だと失敗するので、`git commit` はサンドボックスの外で行い、`git log --show-signature -1` で確かめる
- コミットの形: Conventional Commits＋絵文字（`fix: :bug: …`・`refactor: :recycle: …`・`build: :package: …`）。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Bash でパイプ（`|`）をつながない。1 コマンド 1 目的
- prettier はファイル単位で（ディレクトリ単位の `--write` をしない）
- push・PR・デプロイはしない

## Review Focus

- 前のリクエストで描いたページのストアの中身が、次のリクエストの HTML に出ること（Lambda の実行環境の使い回し）→ Task 4 のテストと、Task 6 で同じ URL を 2 回続けて叩く確かめ
- 一定間隔のタイマーがサーバーで張られ、描画が終わらないこと → Task 3 のテストと Task 6 の時間の確かめ
- サーバーで GA の `gtag`・`location` を呼んで落ちること（本番の environment で起きる）→ Task 2 のテスト
- サーバーで今日の運用・プロフィールを取りに行き、描画が重くなること → Task 5 のテスト
- ブラウザでの動き（タイマー・GA・起動時の取得・メンテ判定）が今までと変わること → 各 Task のブラウザ側のテストと Task 6 の `npx jest` 全体

---

### Task 1: 手元で SSR を起動して全ページを叩く仕組み

**Files:**
- Modify: `server.ts`（全体を書き換え）
- Create: `src/app/app.routes.server.ts`
- Modify: `src/app/app.config.server.ts`
- Modify: `angular.json`（`build.configurations` に `ssr-check` を足す・古い `server` ターゲットを消す）
- Delete: `tsconfig.server.json`（古い `server` ターゲットだけが使っている。消す前に確かめる）
- Create: `scripts/ssr-check.mjs`
- Modify: `package.json`（`scripts` に `ssr:check` と `build:ssr-check`）

**Interfaces:**
- Produces: `npm run build:ssr-check`（`dist/sotetsu-lab-v3-client/server/server.mjs` を作る）と `npm run ssr:check`（全ページを叩き、1 つでも FAIL なら終了コード 1）。Task 2〜6 はこれで確かめる
- Produces: `serverRoutes`（`src/app/app.routes.server.ts`）。この計画では全部 `RenderMode.Server`。描き分けは次の計画で決める

- [ ] **Step 1: 依存を入れる**

worktree には `node_modules` が無い。サンドボックスの外で:

```bash
npm ci
```

Expected: エラー無く終わる。

- [ ] **Step 2: `server.ts` を Angular 22 の形に書き換える**

`server.ts` の中身を次に置き換える（`@schematics/angular` 22.2.2 の雛形 `ssr/files/application-builder/server.ts.template` と同じ形。ブラウザの出力先は `browser`）:

```ts
import {
    AngularNodeAppEngine,
    createNodeRequestHandler,
    isMainModule,
    writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
    express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }),
);

app.use((req, res, next) => {
    angularApp
        .handle(req)
        .then((response) =>
            response ? writeResponseToNodeResponse(response, res) : next(),
        )
        .catch(next);
});

if (isMainModule(import.meta.url)) {
    const port = process.env['PORT'] || 4000;
    app.listen(port, (error) => {
        if (error) {
            throw error;
        }
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

export const reqHandler = createNodeRequestHandler(app);
```

- [ ] **Step 3: サーバーの描き方の表を作る**

`src/app/app.routes.server.ts` を作る:

```ts
import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * ページごとのサーバーでの描き方。
 * 今は手元で全ページをサーバーで描けるか確かめるためだけに使う（angular.json の ssr-check 構成）。
 * ページごとの描き分けは spec 4 章に沿って次の計画で決める。
 */
export const serverRoutes: ServerRoute[] = [
    { path: '**', renderMode: RenderMode.Server },
];
```

- [ ] **Step 4: サーバーの設定に表と応答の上限を渡す**

`src/app/app.config.server.ts` を次に置き換える:

```ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
    providers: [
        provideServerRendering(
            // サーバーで受ける API の応答の上限。運用表の trips は 3.5MB ほどある。
            // API の Lambda は 6MB までしか返せないので、それより少し大きく取る
            { maxResponseBodySize: 8 * 1024 * 1024 },
            withRoutes(serverRoutes),
        ),
    ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

- [ ] **Step 5: `angular.json` に `ssr-check` 構成を足し、古い `server` ターゲットを消す**

`projects.sotetsu-lab-v3-client.architect.build.configurations` の `development` の後に足す:

```json
"ssr-check": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.prod.ts"
    }
  ],
  "outputHashing": "all",
  "outputMode": "server",
  "ssr": {
    "entry": "server.ts"
  }
}
```

`architect.server`（`"builder": "@angular-devkit/build-angular:server"` のブロック全体）を消す。

`tsconfig.server.json` を参照しているところを探す（Grep ツールで `tsconfig.server` をリポジトリ全体から。`node_modules`・`dist` を除く）。`angular.json` の消したブロック以外に無ければ `tsconfig.server.json` を消す。ほかにあれば消さずに報告に書く。

- [ ] **Step 6: 叩くスクリプトを作る**

`scripts/ssr-check.mjs` を作る。ID は本番 DB の実物（2026-10-24 時点の平日ダイヤ・二俣川・運用 01K・本線）:

```js
// 手元で SSR を起動し、主なページをサーバーで描けるか確かめる。
// 先に `npm run build:ssr-check`。サーバーは本番の API を読む（読むだけ）。
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4300;
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_MS = 20_000;

const CALENDAR = 'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb'; // 平日ダイヤ 2026-03-14
const STATION = 'fb799a2e-c96c-4629-8a7d-e8b57f8e6930'; // 二俣川
const OPERATION = '8553e26c-38c0-4895-9ff5-b4f02572df99'; // 01K
const ROUTE = '2e22124f-04eb-475f-929a-7dba25561638'; // 本線

const PATHS = [
    '/',
    '/operation/real-time',
    '/operation/past-time',
    `/operation/table;calendar_id=${CALENDAR}`,
    `/operation/route-diagram;operation_id=${OPERATION}`,
    `/timetable/station;calendar_id=${CALENDAR};station_id=${STATION};trip_direction=0`,
    `/timetable/all-line;calendar_id=${CALENDAR};trip_direction=0`,
    `/train-diagram;calendar_id=${CALENDAR}`,
    `/train-location;route_id=${ROUTE}`,
    '/library/vehicle',
    '/login',
    '/register',
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

async function check(path) {
    const logStart = log.length;
    const started = performance.now();
    const res = await fetch(BASE + path, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = await res.text();
    const ms = Math.round(performance.now() - started);
    // 描き終えたあとに出る ERROR も拾うため、少し待ってからログを見る
    await sleep(300);
    const errors = log.slice(logStart).match(/ERROR[^\n]*/g) ?? [];
    const redirected =
        res.status >= 300 && res.status < 400 && res.headers.has('location');
    const rendered = res.status === 200 && html.includes('ng-server-context');
    const ok = (redirected || rendered) && errors.length === 0;
    const note = redirected ? ` -> ${res.headers.get('location')}` : '';
    console.log(
        `${ok ? 'OK  ' : 'FAIL'} ${res.status} ${ms}ms ${html.length}B ${path}${note}`,
    );
    for (const error of errors) {
        console.log(`     ${error}`);
    }
    return ok;
}

let failed = 0;
try {
    await waitReady();
    // 2 周する。2 周目は同じ実行環境が前のリクエストの後に描く場合を真似る
    for (const round of [1, 2]) {
        console.log(`--- round ${round}`);
        for (const path of PATHS) {
            try {
                if (!(await check(path))) {
                    failed++;
                }
            } catch (error) {
                failed++;
                console.log(`FAIL ---       ${path} ${error.message}`);
            }
        }
    }
} finally {
    server.kill();
}
process.exit(failed > 0 ? 1 : 0);
```

`package.json` の `scripts` に足す（`build:prod` の次）:

```json
"build:ssr-check": "ng build -c ssr-check",
"ssr:check": "node scripts/ssr-check.mjs",
```

- [ ] **Step 7: ビルドして、直す前の結果を残す**

サンドボックスの外で:

```bash
npm run build:ssr-check
```

Expected: エラー無く終わり、`dist/sotetsu-lab-v3-client/server/server.mjs` ができる。

サンドボックスの外で（本番の API を読むため）:

```bash
npm run ssr:check > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/ssr-check-before.txt 2>&1
```

Expected: 終了コード 1。FAIL がある（直す前なので、タイマーのあるページ（`/`・`/operation/real-time`・`/train-diagram…`・`/train-location…`）が時間切れ、GA の ReferenceError などが出る見込み）。どの URL が何で FAIL したかを報告に書く。上の見込みと違う FAIL（例: 全ページが FAIL・サーバーが起動しない）は、ここで止めて報告する（BLOCKED）。

- [ ] **Step 8: 本番のビルドが変わっていないことを確かめる**

サンドボックスの外で:

```bash
npm run build:prod
```

Expected: エラー無く終わる。`dist/sotetsu-lab-v3-client/browser/index.html` と `dist/sotetsu-lab-v3-client/browser/ngsw.json` があり、`dist/sotetsu-lab-v3-client/server` が無い（`ls` で確かめる）。

- [ ] **Step 9: コミット**

```bash
git add server.ts src/app/app.routes.server.ts src/app/app.config.server.ts angular.json package.json scripts/ssr-check.mjs
git add -A tsconfig.server.json
git commit -m "build: :package: 手元で SSR を起動して全ページを叩く構成を足す"
```

（`tsconfig.server.json` を消さなかった場合は 2 行目を省く。`git commit` はサンドボックスの外で。メッセージ末尾に Co-Authored-By の行）

---

### Task 2: GA と web-vitals をサーバーで動かさない

**Files:**
- Modify: `src/app/core/services/google-analytics.service.ts:19`
- Modify: `src/app/core/web-vitals/web-vitals-reporter.ts`
- Test: `src/app/core/services/google-analytics.service.spec.ts`（無ければ作る。あれば足す）
- Test: `src/app/core/web-vitals/web-vitals-reporter.spec.ts`（無ければ作る。あれば足す）

**Interfaces:**
- Consumes: なし
- Produces: なし（中の振る舞いだけ）

- [ ] **Step 1: 落ちるテストを書く**

`google-analytics.service.spec.ts` に（既にファイルがあれば `describe` を足す）:

```ts
import { TestBed } from '@angular/core/testing';
import { LoggerTestingModule } from 'ngx-logger/testing';
import { environment } from 'src/environments/environment';
import { GoogleAnalyticsService } from './google-analytics.service';

describe('GoogleAnalyticsService（gtag が無い環境）', () => {
    const production = environment.production;

    beforeEach(() => {
        (environment as { production: boolean }).production = true;
        delete (globalThis as { gtag?: unknown }).gtag;
        TestBed.configureTestingModule({
            imports: [LoggerTestingModule],
        });
    });

    afterEach(() => {
        (environment as { production: boolean }).production = production;
    });

    it('本番でも gtag が無ければ何も送らず、投げない', () => {
        const ga = TestBed.inject(GoogleAnalyticsService);

        expect(() => ga.sendPageView('題名', '/timetable')).not.toThrow();
        expect(() => ga.sendEvent('x')).not.toThrow();
        expect(() =>
            ga.setUserProperties({ loggedIn: false, role: null }),
        ).not.toThrow();
    });
});
```

`ngx-logger/testing` が無い・`LoggerTestingModule` の名前が違う場合は、`{ provide: NGXLogger, useValue: { log: jest.fn() } }` を providers に入れる形に変えてよい。

`web-vitals-reporter.spec.ts` に:

```ts
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import { WebVitalsReporter } from './web-vitals-reporter';

jest.mock('web-vitals', () => ({
    onLCP: jest.fn(),
    onINP: jest.fn(),
    onCLS: jest.fn(),
}));

function setup(platformId: 'browser' | 'server') {
    TestBed.configureTestingModule({
        providers: [
            { provide: PLATFORM_ID, useValue: platformId },
            { provide: GoogleAnalyticsService, useValue: { sendEvent: jest.fn() } },
        ],
    });
    return TestBed.inject(WebVitalsReporter);
}

describe('WebVitalsReporter', () => {
    beforeEach(() => jest.clearAllMocks());

    it('サーバーでは測り始めない', () => {
        setup('server').start();

        expect(onLCP).not.toHaveBeenCalled();
        expect(onINP).not.toHaveBeenCalled();
        expect(onCLS).not.toHaveBeenCalled();
    });

    it('ブラウザでは LCP・INP・CLS を測り始める', () => {
        setup('browser').start();

        expect(onLCP).toHaveBeenCalledTimes(1);
        expect(onINP).toHaveBeenCalledTimes(1);
        expect(onCLS).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

```bash
npx jest --testPathPatterns=src/app/core/services/google-analytics.service.spec.ts
npx jest --testPathPatterns=src/app/core/web-vitals/web-vitals-reporter.spec.ts
```

Expected: GA は `ReferenceError: gtag is not defined` で FAIL。web-vitals は「サーバーでは測り始めない」が FAIL。

- [ ] **Step 3: 直す**

`google-analytics.service.ts` の `_useGA`:

```ts
    private _useGA(): boolean {
        // gtag は index.html のスクリプトが定める。サーバーには無い
        return typeof gtag !== 'undefined' && !!environment.production;
    }
```

`web-vitals-reporter.ts`:

```ts
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { type Metric, onCLS, onINP, onLCP } from 'web-vitals';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import { toWebVitalsEvent } from './to-web-vitals-event';

/**
 * Core Web Vitals（LCP・INP・CLS）を測って GA に送る係
 */
@Injectable({ providedIn: 'root' })
export class WebVitalsReporter {
    readonly #ga = inject(GoogleAnalyticsService);
    readonly #platformId = inject(PLATFORM_ID);

    start(): void {
        // 測るのはブラウザの描画。サーバーには PerformanceObserver が無い
        if (!isPlatformBrowser(this.#platformId)) {
            return;
        }

        const send = (metric: Metric) => {
            const { name, params } = toWebVitalsEvent(metric);
            this.#ga.sendEvent(name, params);
        };

        onLCP(send);
        onINP(send);
        onCLS(send);
    }
}
```

- [ ] **Step 4: 通ることを確かめる**

Step 2 の 2 つのコマンド。Expected: PASS。

- [ ] **Step 5: コミット**

```bash
git add src/app/core/services/google-analytics.service.ts src/app/core/services/google-analytics.service.spec.ts src/app/core/web-vitals/web-vitals-reporter.ts src/app/core/web-vitals/web-vitals-reporter.spec.ts
git commit -m "fix: :bug: GA と web-vitals をサーバーで動かさない"
```

---

### Task 3: 一定間隔のタイマーをブラウザでだけ張る

**Files:**
- Create: `src/app/core/utils/run-interval-in-browser.ts`
- Test: `src/app/core/utils/run-interval-in-browser.spec.ts`
- Modify: `src/app/pages/dashboard/components/dashboard-status-card/dashboard-status-card.component.ts`（constructor の `interval(1000)`）
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts`（`hookEvent` の `interval(1000 * 1)`）
- Modify: `src/app/pages/train-diagram/train-diagram.component.ts`（`#now` の `toSignal(interval(1000)…)`）
- Modify: `src/app/pages/train-location/train-location.component.ts`（constructor の `interval(CURRENT_TIME_REFRESH_MS)`）

**Interfaces:**
- Produces: `runIntervalInBrowser(periodMs: number, tick: () => void | Promise<void>): void` — 注入の文脈（constructor・フィールドの初期化）で呼ぶ。ブラウザで最初の描画の後に張り、呼んだ部品が壊れたら止まる。サーバーでは何もしない

- [ ] **Step 1: 落ちるテストを書く**

`run-interval-in-browser.spec.ts`:

```ts
import { ChangeDetectionStrategy, Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { runIntervalInBrowser } from './run-interval-in-browser';

@Component({
    selector: 'app-host',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
    ticks = 0;

    constructor() {
        runIntervalInBrowser(1000, () => {
            this.ticks++;
        });
    }
}

function render(platformId: 'browser' | 'server') {
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    TestBed.tick();
    return fixture;
}

describe('runIntervalInBrowser', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('ブラウザでは描画の後に張り、間隔ごとに呼ぶ', () => {
        const fixture = render('browser');

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(3);
    });

    it('部品が壊れたら止まる', () => {
        const fixture = render('browser');
        jest.advanceTimersByTime(1000);
        fixture.destroy();

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(1);
    });

    it('サーバーでは張らない', () => {
        const fixture = render('server');

        jest.advanceTimersByTime(3000);

        expect(fixture.componentInstance.ticks).toBe(0);
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

```bash
npx jest --testPathPatterns=src/app/core/utils/run-interval-in-browser.spec.ts
```

Expected: FAIL（`Cannot find module './run-interval-in-browser'`）。

- [ ] **Step 3: 部品を作る**

`run-interval-in-browser.ts`:

```ts
import { afterNextRender, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

/**
 * 一定間隔で tick を呼ぶ。ブラウザで最初の描画の後に張り、呼んだ部品が壊れたら止まる。
 * サーバーでは張らない（張ると zone.js がアプリを落ち着かせず、SSR が終わらない）。
 * 注入の文脈（constructor・フィールドの初期化）で呼ぶ。
 */
export function runIntervalInBrowser(
    periodMs: number,
    tick: () => void | Promise<void>,
): void {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
        interval(periodMs)
            .pipe(takeUntilDestroyed(destroyRef))
            .subscribe(() => void tick());
    });
}
```

- [ ] **Step 4: 通ることを確かめる**

Step 2 のコマンド。Expected: PASS（3 件）。

`TestBed.tick()` で `afterNextRender` が走らずブラウザの 2 件が落ちる場合は、`fixture.detectChanges()` の後に `await fixture.whenStable()` を足す（テストを `async` に）。部品の側は変えない。

- [ ] **Step 5: 4 か所を差し替える**

それぞれ、差し替えた後に使われなくなった import（`interval`・`takeUntilDestroyed`・`map`・`toSignal`）とフィールド（`#destroyRef`）を消す。ほかで使っていれば残す。

`dashboard-status-card.component.ts` の constructor:

```ts
    constructor() {
        runIntervalInBrowser(1000, () => {
            this.#now.set(new Date());
        });
    }
```

`operation-real-time.component.ts` の `hookEvent` の中で、`interval(1000 * 1).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(async () => { … })` の部分だけを次に替える（中の処理はそのまま。`hookEvent` のほかの部分は触らない）:

```ts
        runIntervalInBrowser(1000, async () => {
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
```

（`async () => { … }` の中身は今のファイルにあるものを写す。上は 2026-10-24 時点の中身。違っていたら今のファイルのほうを使う）

`hookEvent` が constructor 以外からも呼ばれていないか Grep で確かめる。constructor 以外から呼ばれていたら、`runIntervalInBrowser` は注入の文脈でしか呼べないので、止めて報告する（BLOCKED）。

`train-diagram.component.ts` の `#now`:

```ts
    /** 1 秒ごとの時計（今日のダイヤのときの現在時刻の線と「今」ボタン用） */
    readonly #now = signal(new Date());
```

constructor の先頭に:

```ts
        runIntervalInBrowser(1000, () => this.#now.set(new Date()));
```

`#now` を読んでいるところ（`this.#now()`）は signal の呼び出しのままなので変えない。

`train-location.component.ts` の constructor:

```ts
        runIntervalInBrowser(CURRENT_TIME_REFRESH_MS, () =>
            this.#now.set(new Date()),
        );
```

- [ ] **Step 6: 4 つのページのテストを流す**

```bash
npx jest --testPathPatterns=src/app/pages/dashboard
npx jest --testPathPatterns=src/app/pages/operation/operation-real-time
npx jest --testPathPatterns=src/app/pages/train-diagram
npx jest --testPathPatterns=src/app/pages/train-location
```

Expected: すべて PASS。時計が進むことを前提にしたテストが落ちたら、そのテストの中で描画（`fixture.detectChanges()`）の後に時間を進めるよう直す。部品の側は変えない。

- [ ] **Step 7: コミット**

```bash
git add src/app/core/utils/run-interval-in-browser.ts src/app/core/utils/run-interval-in-browser.spec.ts src/app/pages/dashboard/components/dashboard-status-card/dashboard-status-card.component.ts src/app/pages/operation/operation-real-time/operation-real-time.component.ts src/app/pages/train-diagram/train-diagram.component.ts src/app/pages/train-location/train-location.component.ts
git commit -m "fix: :bug: 一定間隔のタイマーをブラウザでだけ張る"
```

（Step 6 でテストを直したら、その spec も add する）

---

### Task 4: サーバーで描く前に Elf のストアを空にする

**Files:**
- Create: `src/app/core/utils/reset-elf-stores.ts`
- Test: `src/app/core/utils/reset-elf-stores.spec.ts`
- Modify: `src/app/app.config.server.ts`

**Interfaces:**
- Consumes: `serverConfig`（Task 1 の `app.config.server.ts`）
- Produces: `resetElfStores(): void` — Elf の登録簿にある全ストアを `reset()` する

- [ ] **Step 1: 落ちるテストを書く**

`reset-elf-stores.spec.ts`:

```ts
import { createStore, setProp, withProps } from '@ngneat/elf';
import { resetElfStores } from './reset-elf-stores';

describe('resetElfStores', () => {
    it('登録されたストアを作ったときの中身に戻す', () => {
        const store = createStore(
            { name: 'ResetElfStoresSpec' },
            withProps<{ stationName: string | null }>({ stationName: null }),
        );
        store.update(setProp('stationName', '二俣川'));

        resetElfStores();

        expect(store.getValue().stationName).toBeNull();
    });
});
```

- [ ] **Step 2: 落ちることを確かめる**

```bash
npx jest --testPathPatterns=src/app/core/utils/reset-elf-stores.spec.ts
```

Expected: FAIL（`Cannot find module './reset-elf-stores'`）。

- [ ] **Step 3: 作る**

`reset-elf-stores.ts`:

```ts
import { getRegistry } from '@ngneat/elf';

/**
 * Elf の全ストアを作ったときの中身に戻す。
 * ストアはファイルの中で 1 つだけ作られ、Lambda の実行環境は前のリクエストのまま次を描く。
 * サーバーで描き始める前に呼び、前のページの中身が次の HTML に出ないようにする。
 */
export function resetElfStores(): void {
    getRegistry().forEach((store) => store.reset());
}
```

- [ ] **Step 4: 通ることを確かめる**

Step 2 のコマンド。Expected: PASS。

- [ ] **Step 5: サーバーの起動ごとに呼ぶ**

`app.config.server.ts` の `serverConfig.providers` に足す（`provideServerRendering(...)` の後）:

```ts
        // サーバーはリクエストごとにアプリを起動し直す。そのたびに前のリクエストのストアを捨てる
        provideAppInitializer(() => resetElfStores()),
```

import に `provideAppInitializer`（`@angular/core`）と `resetElfStores`（`./core/utils/reset-elf-stores`）を足す。

- [ ] **Step 6: コミット**

```bash
git add src/app/core/utils/reset-elf-stores.ts src/app/core/utils/reset-elf-stores.spec.ts src/app/app.config.server.ts
git commit -m "fix: :bug: サーバーで描く前に Elf のストアを作ったときの中身に戻す"
```

---

### Task 5: サーバーでは今日のデータ・プロフィール・メンテ判定を取らない

**Files:**
- Modify: `src/app/core/resolvers/initial-data.resolver.ts`
- Test: `src/app/core/resolvers/initial-data.resolver.spec.ts`
- Modify: `src/app/core/guards/maintenance.guard.ts`（`maintenanceGuard` だけ。`noMaintenanceGuard` は変えない）
- Test: `src/app/core/guards/maintenance.guard.spec.ts`

**Interfaces:**
- Consumes: なし
- Produces: なし（サーバーでの振る舞いだけ。ブラウザは今のまま）

spec 5.2・5.3・13.2: サーバーはゲストとして描き、「今日」で変わるものとメンテ判定は CDN に残さない。トークン（API の認証ヘッダーに要る）と、改正でしか変わらないもの（agencies・calendars・routeStations・services・featureFlags）は取る。

- [ ] **Step 1: 落ちるテストを書く**

`initial-data.resolver.spec.ts` に、今のテストの書き方（`stub()`・`done()`・`flush()`）にそろえて `describe` を足す。今のファイルの `beforeEach` の `TestBed.configureTestingModule` の providers に `{ provide: PLATFORM_ID, useValue: 'server' }` を足した版を、この describe の中で作る:

```ts
describe('initialDataResolver（サーバー）', () => {
    // 今のファイルの beforeEach と同じ stub を作り、providers に
    // { provide: PLATFORM_ID, useValue: 'server' } を足して TestBed を組む

    it('プロフィールと今日のものは取らず、トークンと改正でしか変わらないものは取る', async () => {
        const result = TestBed.runInInjectionContext(() =>
            initialDataResolver(
                {} as ActivatedRouteSnapshot,
                { root: {} } as RouterStateSnapshot,
            ),
        ) as Promise<boolean>;

        await flush();
        done(token);
        await flush();
        [agency, calendar, routeStation, service, featureFlag].forEach(done);

        expect(await result).toBe(true);
        expect(user.fetch).not.toHaveBeenCalled();
        expect(todaysCalendar.fetch).not.toHaveBeenCalled();
        expect(todaysOperation.fetch).not.toHaveBeenCalled();
        expect(todaysFormation.fetch).not.toHaveBeenCalled();
        expect(token.fetch).toHaveBeenCalledTimes(1);
        expect(markInitialized).toHaveBeenCalledTimes(1);
    });
});
```

`state` の形（`{ root: {} }`）は今のファイルが `preloadRouteComponents` に渡している形に合わせる。今のファイルが別の形を使っていれば、そちらを写す。

`maintenance.guard.spec.ts` に足す:

```ts
describe('maintenanceGuard（サーバー）', () => {
    it('サーバーでは maintenance を取らずに通す', async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: 'server' },
            ],
        });
        const controller = TestBed.inject(HttpTestingController);

        expect(await run()).toBe(true);
        controller.expectNone(url);
        controller.verify();
    });
});
```

（`PLATFORM_ID` を `@angular/core` から import に足す）

- [ ] **Step 2: 落ちることを確かめる**

```bash
npx jest --testPathPatterns=src/app/core/resolvers/initial-data.resolver.spec.ts
npx jest --testPathPatterns=src/app/core/guards/maintenance.guard.spec.ts
```

Expected: 足した 2 件が FAIL（resolver は `user.fetch` が呼ばれる・返らない。guard は maintenance を取りに行く）。

- [ ] **Step 3: 直す**

`initial-data.resolver.ts`:

import に `PLATFORM_ID`（`@angular/core`）と `isPlatformServer`（`@angular/common`）を足し、`initializeStateStore` の inject の後に:

```ts
    // サーバーはゲストとして描き、HTML を CDN に置く。プロフィールと「今日」のものは
    // 人や日で変わるので取らない（spec 5.2・5.3）。ブラウザで起動した後に取る
    const isServer = isPlatformServer(inject(PLATFORM_ID));
```

1 つ目の `Promise.all` を:

```ts
    await Promise.all([
        lastValueFrom(
            tokenStateStore.fetch({ maxAgeMs: ROUTE_CHECK_MAX_AGE_MS }),
        ),
        ...(isServer
            ? []
            : [
                  lastValueFrom(
                      userStateStore.fetch({
                          maxAgeMs: ROUTE_CHECK_MAX_AGE_MS,
                      }),
                  ),
              ]),
    ]);
```

2 つ目の `Promise.all` を:

```ts
    await Promise.all([
        lastValueFrom(agencyListStateStore.fetch()),
        lastValueFrom(calendarListStateStore.fetch()),
        lastValueFrom(routeStationListStateStore.fetch()),
        lastValueFrom(serviceListStateStore.fetch()),
        // 失敗しても止まらない（FeatureFlagStateStore が飲む）。60 秒は query が使い回す
        lastValueFrom(featureFlagStateStore.fetch()),
        ...(isServer
            ? []
            : [
                  lastValueFrom(todaysFormationListStateStore.fetch()),
                  (async () => {
                      await lastValueFrom(todaysCalendarListStateStore.fetch());
                      await lastValueFrom(
                          todaysOperationListStateStore.fetch(),
                      );
                  })(),
              ]),
    ]);
```

（`inject(...)` はすべて関数の先頭、最初の `await` より前に置く。今の並びのまま `isServer` の行を inject 群の最後に足せばよい）

`maintenance.guard.ts` の `maintenanceGuard`:

```ts
export const maintenanceGuard: CanActivateFn = async (route, state) => {
    // サーバーで描いた HTML は CDN に置くので、メンテ中かどうかは入れない。ブラウザで判定する
    if (isPlatformServer(inject(PLATFORM_ID))) {
        return true;
    }

    const router = inject(Router);
    const maintenanceStateStore = inject(MaintenanceStateStore);
    const maintenanceStateQuery = inject(MaintenanceStateQuery);
    // 以下は今のまま
```

import に `PLATFORM_ID`（`@angular/core`）と `isPlatformServer`（`@angular/common`）を足す。

- [ ] **Step 4: 通ることを確かめる**

Step 2 の 2 つのコマンド。Expected: すべて PASS（今あるブラウザ側のテストも）。

- [ ] **Step 5: コミット**

```bash
git add src/app/core/resolvers/initial-data.resolver.ts src/app/core/resolvers/initial-data.resolver.spec.ts src/app/core/guards/maintenance.guard.ts src/app/core/guards/maintenance.guard.spec.ts
git commit -m "refactor: :recycle: サーバーではプロフィール・今日のデータ・メンテ判定を取らない"
```

---

### Task 6: 全ページがサーバーで描けることを確かめる

**Files:**
- なし（確かめるだけ。直しが要れば報告する）

- [ ] **Step 1: SSR を叩く**

サンドボックスの外で:

```bash
npm run build:ssr-check
npm run ssr:check > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/ssr-check-after.txt 2>&1
```

Expected: 終了コード 0。2 周とも全 URL が `OK`（200 で描けた、または 3xx の移動）、ERROR の行が無い、1 本 20 秒以内。

FAIL が残ったら、URL・状態コード・ERROR の行を報告に書いて止める（DONE_WITH_CONCERNS）。この計画の範囲（落ちない・終わる・混ざらない）を超える直し（例: param の足りない URL の移動・`@defer` の中身・ログインで変わる表示）はしない。次の計画で扱う。

- [ ] **Step 2: 2 周目に 1 周目の中身が混ざっていないこと**

`ssr-check-after.txt` の round 1 と round 2 で、同じ URL の HTML の大きさ（`…B`）を比べる。大きく違う（1 割以上）URL があれば報告に書く。

- [ ] **Step 3: 全体のテスト・lint・本番ビルド**

サンドボックスの外で:

```bash
npx jest > /home/seapolis/Projects/sotetsu-lab-v3/.context/ssr-plan/jest-groundwork.txt 2>&1
npm run lint
npm run build:prod
```

Expected: jest の `Tests:` 行に failed が無い（ファイルの末尾を読む）。lint はエラー 0。本番ビルドは Task 1 Step 8 と同じく `server` ディレクトリが無い。

- [ ] **Step 4: 報告**

`ssr-check-before.txt` と `ssr-check-after.txt` の要約（URL ごとの OK/FAIL と時間）、jest の `Tests:` 行、lint の結果を報告に書く。コミットは無い。
