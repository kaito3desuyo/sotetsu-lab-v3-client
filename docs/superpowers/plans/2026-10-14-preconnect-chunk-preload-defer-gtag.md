# 接続の前倒し・ページの chunk の先読み・gtag の後回し 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 起動時に直列で待っている「API への接続」「ページの chunk」「gtag の実行」を、前倒しするか後回しにする。それでスマホの LCP と TBT を縮める。

**Architecture:** 3 つは互いに独立している。
- `index.html` に preconnect を足す。
- `initialDataResolver` の先頭で、行き先のルートの `loadComponent()` を投げっぱなしで呼ぶ。Angular の router は、resolver が全部終わってから `loadComponent` を呼ぶからだ（`node_modules/@angular/router/fesm2022/_router-chunk.mjs` 3945〜3974 行）。
- gtag.js の `<script async>` を、`load` の後の idle に差し込む形に替える。

**Tech Stack:** Angular 22・jest 30（`setupZoneTestEnv`）・Angular の esbuild ビルド・Service Worker（ngsw）

**Spec:** なし。ユーザーの合意で計画から始めた（2026-10-14）。根拠は、本番 v2.12.0 の Lighthouse の要求の時系列（`.context/measure/out/prod-v2.12.0/table.mobile.1.json`）と、GA の web vitals。memory の `project_field_lcp_and_sw` にまとめてある。

## Global Constraints

- 案 2（maintenance の確認を token・profile と同時に投げる）は**やらない**（ユーザー判断 2026-10-14）。`maintenanceGuard` には触らない。
- コミットは Conventional Commits＋絵文字（例: `perf: :zap: …`）。署名付きで、サンドボックスの外で行う。コミットのたびに `git log --show-signature -1` で確かめる。
- prettier はファイル単位で流す（`npx prettier --write <file>`）。ディレクトリ単位では流さない。
- jest は `npx jest --testPathPatterns=<path>` で流す。
- Bash ではパイプでつながない。複数行のスクリプトはファイルに書いてから実行する。
- 一時ファイルは `.context/` に置く。

## Review Focus

- 行き先のルートに `loadComponent` が無い（`component` 直書き・`loadChildren` だけ）→ 先読みは何もせず、例外も出さない。
- `loadComponent()` が reject する（chunk の取得失敗・オフライン）→ 未処理の Promise の拒否にしない。router が自分で取り直し、いつもどおりのエラーになる。
- `runGuardsAndResolvers: 'always'` で、同じページに何度も戻る → 2 回目以降の `import()` はモジュールのキャッシュから返る。要求は増えない。
- gtag.js の読み込み前に積まれた `gtag('event', …)`（page_view・LCP 等）→ 読み込み後にまとめて送られ、消えない。
- `load` がすでに終わった後にスクリプトが走る場合 → この inline script は body の末尾にあって `load` より前に走るので、起きない。ただし、念のため `document.readyState === 'complete'` も扱う。

---

### Task 1: v3 API と Google Fonts への preconnect

**Files:**
- Modify: `src/index.html`（`<link rel="stylesheet" href="https://fonts.googleapis.com/…">` の直前）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: preconnect を足す**

`src/index.html` の Quicksand の `<link rel="stylesheet" …>` の直前に、次を入れる。

```html
        <!-- 別 origin への接続（DNS・TCP・TLS）を JS の起動と重ねる。docs/adr/0008 -->
        <!-- v3 API は認証ヘッダー付きの CORS の fetch なので crossorigin が要る（無いと作った接続が使われない） -->
        <link rel="preconnect" href="https://api.sotetsu-lab.com" crossorigin />
        <!-- Quicksand の CSS はビルドで index.html に埋め込まれる。woff2 はヘッダーを描くまで取りに行かないので、接続だけ先に作る -->
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

- [ ] **Step 2: 本番ビルドで残っていることを確かめる**

Run: `npm run build:prod`
次に Run: `grep -c 'rel="preconnect"' dist/sotetsu-lab-v3-client/browser/index.html`
Expected: `2`（ビルドの出力先が違えば `angular.json` の `outputPath` を見て合わせる）

- [ ] **Step 3: コミット**

```bash
npx prettier --check src/index.html
git add src/index.html
git commit -m "perf: :zap: v3 API と Google Fonts に preconnect を足す"
git log --show-signature -1 --oneline
```

---

### Task 2: 行き先のページの chunk を resolver と同時に取り始める

**Files:**
- Create: `src/app/core/resolvers/preload-route-components.ts`
- Create: `src/app/core/resolvers/preload-route-components.spec.ts`
- Modify: `src/app/core/resolvers/initial-data.resolver.ts`（先頭で呼ぶ）
- Modify: `src/app/core/resolvers/initial-data.resolver.spec.ts`（`run()` に state を渡す・1 件足す）

**Interfaces:**
- Consumes: なし
- Produces: `export function preloadRouteComponents(snapshot: ActivatedRouteSnapshot | null | undefined): void`

- [ ] **Step 1: 失敗するテストを書く**

`src/app/core/resolvers/preload-route-components.spec.ts`:

```ts
import type { ActivatedRouteSnapshot, Route } from '@angular/router';
import { preloadRouteComponents } from './preload-route-components';

function snapshot(
    routeConfig: Route | null,
    children: ActivatedRouteSnapshot[] = [],
): ActivatedRouteSnapshot {
    return { routeConfig, children } as unknown as ActivatedRouteSnapshot;
}

/** 拒否された Promise の後始末を流す */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('preloadRouteComponents', () => {
    it('子孫まで辿って loadComponent を呼ぶ', () => {
        const leaf = jest.fn(() => Promise.resolve(class {}));
        const middle = jest.fn(() => Promise.resolve(class {}));

        preloadRouteComponents(
            snapshot(null, [
                snapshot({ path: 'operation' }, [
                    snapshot({ path: 'table', loadComponent: middle }, [
                        snapshot({ path: '', loadComponent: leaf }),
                    ]),
                ]),
            ]),
        );

        expect(middle).toHaveBeenCalledTimes(1);
        expect(leaf).toHaveBeenCalledTimes(1);
    });

    it('loadComponent が無いルートでは何もしない', () => {
        expect(() =>
            preloadRouteComponents(
                snapshot(null, [snapshot({ path: 'library' })]),
            ),
        ).not.toThrow();
    });

    it('snapshot が無くても例外を出さない', () => {
        expect(() => preloadRouteComponents(undefined)).not.toThrow();
        expect(() => preloadRouteComponents(null)).not.toThrow();
    });

    it('loadComponent が reject しても未処理の拒否にしない', async () => {
        const unhandled = jest.fn();
        process.on('unhandledRejection', unhandled);
        try {
            preloadRouteComponents(
                snapshot(null, [
                    snapshot({
                        path: '',
                        loadComponent: () =>
                            Promise.reject(new Error('chunk load failed')),
                    }),
                ]),
            );
            await flush();
            await flush();

            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandled);
        }
    });

    it('loadComponent が同期で例外を投げても外に漏らさない', () => {
        expect(() =>
            preloadRouteComponents(
                snapshot(null, [
                    snapshot({
                        path: '',
                        loadComponent: () => {
                            throw new Error('boom');
                        },
                    }),
                ]),
            ),
        ).not.toThrow();
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPatterns=src/app/core/resolvers/preload-route-components.spec.ts`
Expected: FAIL（`Cannot find module './preload-route-components'`）

- [ ] **Step 3: 実装する**

`src/app/core/resolvers/preload-route-components.ts`:

```ts
import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * 行き先のルートの loadComponent を先に呼び、ページの chunk を取り始める。
 * Angular の router は resolver が全部終わってから loadComponent を呼ぶので、
 * そのままだと起動時の取得を待ってから chunk を取りに行く（docs/adr/0008）。
 * import() はブラウザがモジュールを使い回すので、router が後で呼んでもすぐ返る。
 * 失敗は握りつぶす。router が自分で取り直し、いつもどおりのエラーになる。
 */
export function preloadRouteComponents(
    snapshot: ActivatedRouteSnapshot | null | undefined,
): void {
    if (!snapshot) {
        return;
    }

    const loadComponent = snapshot.routeConfig?.loadComponent;
    if (loadComponent) {
        try {
            const loaded = loadComponent();
            if (loaded instanceof Promise) {
                loaded.catch(() => undefined);
            }
        } catch {
            // router が自分で取り直す
        }
    }

    for (const child of snapshot.children ?? []) {
        preloadRouteComponents(child);
    }
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/resolvers/preload-route-components.spec.ts`
Expected: PASS（5 件）

- [ ] **Step 5: resolver の spec を先に直す（失敗するテスト）**

`src/app/core/resolvers/initial-data.resolver.spec.ts` を次のように変える。

`run()` を、state を受け取る形にする。

```ts
    function run(
        state: RouterStateSnapshot = {
            root: { routeConfig: null, children: [] },
        } as unknown as RouterStateSnapshot,
    ): Promise<boolean> {
        return TestBed.runInInjectionContext(() =>
            initialDataResolver({} as ActivatedRouteSnapshot, state),
        ) as Promise<boolean>;
    }
```

`describe` の末尾に 1 件足す。

```ts
    it('token・profile を待たずに、行き先のページの loadComponent を呼ぶ', () => {
        const loadComponent = jest.fn(() => Promise.resolve(class {}));

        run({
            root: {
                routeConfig: null,
                children: [
                    {
                        routeConfig: { path: '', loadComponent },
                        children: [],
                    },
                ],
            },
        } as unknown as RouterStateSnapshot);

        expect(loadComponent).toHaveBeenCalledTimes(1);
        expect(agency.fetch).not.toHaveBeenCalled();
    });
```

Run: `npx jest --testPathPatterns=src/app/core/resolvers/initial-data.resolver.spec.ts`
Expected: 新しい 1 件だけ FAIL（`Expected number of calls: 1 / Received number of calls: 0`）。ほかの 5 件は PASS。

- [ ] **Step 6: resolver から呼ぶ**

`src/app/core/resolvers/initial-data.resolver.ts`:

import に足す。

```ts
import { preloadRouteComponents } from './preload-route-components';
```

`const initializeStateStore = inject(InitializeStateStore);` の直後、`// 画面を移るたびに確かめる…` のコメントより前に入れる。

```ts
    // router は resolver の後で loadComponent を呼ぶので、ページの chunk を先に取り始めておく
    preloadRouteComponents(state.root);
```

- [ ] **Step 7: 通ることを確かめる**

Run: `npx jest --testPathPatterns=src/app/core/resolvers`
Expected: PASS（initial-data.resolver 6 件・preload-route-components 5 件・page.resolver の既存分）

- [ ] **Step 8: コミット**

```bash
npx prettier --write src/app/core/resolvers/preload-route-components.ts src/app/core/resolvers/preload-route-components.spec.ts src/app/core/resolvers/initial-data.resolver.ts src/app/core/resolvers/initial-data.resolver.spec.ts
git add src/app/core/resolvers
git commit -m "perf: :zap: 行き先のページの chunk を起動時の取得と同時に取り始める"
git log --show-signature -1 --oneline
```

---

### Task 3: gtag.js を load の後の idle に読み込む

**Files:**
- Modify: `src/index.html`（body の末尾の `<!-- Google tag (gtag.js) -->` から 2 つの `<script>`）

**Interfaces:**
- Consumes: なし
- Produces: なし（`window.dataLayer` と `gtag()` の形は今のまま。`GoogleAnalyticsService` はそのまま使える）

- [ ] **Step 1: 差し替える**

`src/index.html` の次の部分を、

```html
        <!-- Google tag (gtag.js) -->
        <script
            async
            src="https://www.googletagmanager.com/gtag/js?id=G-CFKSDNMCY3"
        ></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                dataLayer.push(arguments);
            }
        </script>
```

これに替える。

```html
        <!-- Google tag (gtag.js) -->
        <!-- 起動の邪魔をしないよう、load の後の空いた時間に読み込む（docs/adr/0008）。 -->
        <!-- それまでの gtag() は dataLayer に積まれ、読み込まれたときにまとめて送られる -->
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                dataLayer.push(arguments);
            }
            (function () {
                function inject() {
                    var s = document.createElement('script');
                    s.async = true;
                    s.src =
                        'https://www.googletagmanager.com/gtag/js?id=G-CFKSDNMCY3';
                    document.head.appendChild(s);
                }
                function schedule() {
                    if ('requestIdleCallback' in window) {
                        requestIdleCallback(inject, { timeout: 3000 });
                    } else {
                        setTimeout(inject, 0);
                    }
                }
                if (document.readyState === 'complete') {
                    schedule();
                } else {
                    window.addEventListener('load', schedule, { once: true });
                }
            })();
        </script>
```

- `requestIdleCallback` の `timeout: 3000` は、主スレッドがずっと忙しくても 3 秒で読み込むためのものだ。
- Safari 17 以前には `requestIdleCallback` が無いので、`setTimeout` に落とす。

- [ ] **Step 2: 本番ビルドで、gtag が load の後に読まれ、イベントが送られることを確かめる**

Run: `npm run build:prod`
次に、配信を起動する（バックグラウンド）: `node .context/measure/serve.mjs dist/sotetsu-lab-v3-client/browser 4300`

`.context/measure/gtag-order.mjs` を書く。

playwright は依存に無い。前回の計測と同じく、起動済みの Chrome（`--remote-debugging-port=9333`、`.context/measure/` の既存の手順）に、Lighthouse の npx キャッシュにある puppeteer-core でつなぐ。`PUPPETEER_CORE` には `/tmp/claude-1000/npm-cache/_npx/ffe2131771d88588/node_modules/puppeteer-core` を渡す（無ければ `find /tmp/claude-1000/npm-cache/_npx -maxdepth 4 -type d -name puppeteer-core` で探す）。

```js
// 使い方: PUPPETEER_CORE=<path> node gtag-order.mjs <port>  … gtag.js の取得開始が load より後か、page_view が送られるかを確かめる
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE);
const port = process.argv[2];
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333' });
const page = await browser.newPage();
const events = [];
page.on('request', (r) => {
    const u = r.url();
    if (u.includes('googletagmanager.com/gtag/js')) events.push(['gtag-js', Date.now()]);
    if (u.includes('/g/collect')) events.push(['collect', Date.now(), new URL(u).searchParams.get('en')]);
});
const t0 = Date.now();
await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
const loadAt = Date.now();
await new Promise((r) => setTimeout(r, 8000));
console.log('load', loadAt - t0);
for (const [k, t, en] of events) console.log(k, t - t0, en ?? '');
const gtagAt = events.find(([k]) => k === 'gtag-js')?.[1];
console.log(gtagAt && gtagAt >= loadAt ? 'PASS gtag after load' : 'FAIL gtag before load');
console.log(events.some(([k, , en]) => k === 'collect' && en === 'page_view') ? 'PASS page_view sent' : 'FAIL no page_view');
await page.close();
await browser.disconnect();
```

Run: `node .context/measure/gtag-order.mjs 4300`（サンドボックスの外。`google-analytics.com` などに出る）
Expected: `PASS gtag after load` と `PASS page_view sent`。
`localhost` が GA の計測対象外で collect が出ない場合は、`/g/collect` の代わりに `dataLayer` の中身を見る。`page.evaluate(() => window.dataLayer.length)` が 0 より大きく、`google_tag_manager` が定義されていればよい。そう判断した場合は、ledger に Ruling として書く。

- [ ] **Step 3: コミット**

```bash
npx prettier --check src/index.html
git add src/index.html
git commit -m "perf: :zap: gtag.js を load の後の空いた時間に読み込む"
git log --show-signature -1 --oneline
```

---

### Task 4: 計測と ADR-0008

**Files:**
- Create: `docs/adr/0008-preconnect-chunk-preload-defer-gtag.md`
- Modify: `docs/adr/0005-google-analytics-instrumentation.md`（末尾に 1 行の追記）

**Interfaces:**
- Consumes: Task 1〜3 の変更
- Produces: なし

- [ ] **Step 1: master とこのブランチを同じ設定で本番ビルドし、実ネットワークで比べる**

`.context/measure/dist-master/` は v2.12.0 より前の古い master なので、作り直す。

```bash
rm -rf .context/measure/master-src .context/measure/dist-master
mkdir -p .context/measure/master-src
git archive master > .context/measure/master.tar
tar -xf .context/measure/master.tar -C .context/measure/master-src
ln -s "$PWD/node_modules" .context/measure/master-src/node_modules
(cd .context/measure/master-src && npx ng build --configuration production --output-path ../dist-master)
npm run build:prod
```

- 4300 に master（`node .context/measure/serve.mjs .context/measure/dist-master/browser 4300`）、4301 にこのブランチ（`node .context/measure/serve.mjs dist/sotetsu-lab-v3-client/browser 4301`）を、バックグラウンドで配る。
- Chrome は `google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9333 --user-data-dir=/tmp/claude-1000/lh-profile about:blank` をバックグラウンドで起動する。
- Lighthouse は `npx -y lighthouse@latest <url> --port=9333 --throttling-method=devtools --output=json --output-path=<file> --quiet` をサンドボックスの外で流す（`.context/measure/run-devtools.sh` を、port を引数で受ける形にして使う）。

比べるもの（各ページ 3 回の中央値・ページは top・table・station・train-diagram・train-location）:
- 実ネットワーク: 最初の v3 API の要求の開始時刻、ページの chunk の取得開始時刻（`compare-fetch.mjs` を流用）
- Lighthouse スマホ（`--throttling-method=devtools`）: FCP・LCP・TBT

Expected:
- ページの chunk の取得開始が、2 段目の取得の完了より前に来る。
- TBT が下がるか、同じ。

- [ ] **Step 2: ADR-0008 を書く**

`docs/adr/0008-preconnect-chunk-preload-defer-gtag.md` に、次の節を書く。
- 状況: 本番 v2.12.0 の要求の時系列。GA で見ると、利用者はほぼ全員が再訪で、SW が JS と index.html を返していること。
- 決定: preconnect の 2 本、`preloadRouteComponents`、gtag の遅延。
- 見送ったこと: 案 2（maintenance の並列化）はユーザーの判断で見送った。SSR は再訪には効かない（SW が index.html を返す）ので、速さの施策としては採らない。
- 結果: Step 1 の表。
- 確認: デプロイ後 1 週間の GA の LCP（スマホ・rating 別・ページ別）を、v2.12.0 の週と比べる。

`docs/adr/0005-google-analytics-instrumentation.md` の末尾に、次の 1 行を足す。

```markdown
- 2026-10-14 追記: gtag.js は load の後の空いた時間に読み込むようにした（docs/adr/0008）。読み込み前の `gtag()` は `dataLayer` に積まれ、後で送られる。読み込み前にタブを閉じた人のイベントは落ちる。
```

- [ ] **Step 3: 全体を確かめる**

Run: `npx jest > .context/jest-all.txt 2>&1`、続けて `tail -5 .context/jest-all.txt`
Expected: 全件 PASS（前回 1457 件＋今回 6 件）

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: エラー 0

- [ ] **Step 4: コミット**

```bash
git add docs/adr/0008-preconnect-chunk-preload-defer-gtag.md docs/adr/0005-google-analytics-instrumentation.md
git diff --cached --stat
git commit -m "docs: :memo: 接続の前倒し・chunk の先読み・gtag の後回しの ADR-0008 を書く"
git log --show-signature -1 --oneline
```
