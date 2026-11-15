# ルートの chunk を head で先読みする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初回の訪問で、ページ本体の chunk と共通の chunk を HTML の `<head>` から先読みさせ、JS が 3 波で届くのを縮める。

**Architecture:** Angular の SSR は、ルートごとの `modulepreload` を最大 10 本、`</body>` の直前に足す（`@angular/ssr` の `appendPreloadHintsToHtml`、`@angular/build` の `MODULE_PRELOAD_MAX = 10`）。本文が大きいページ（駅別 3.3MB）では、本文を受け切るまで先読みが始まらず、ページ本体の chunk は 10 本に入らない。server.ts で、(1) 末尾の `modulepreload` を `<head>` へ移し、(2) ビルドの esbuild の metafile から作った「ルート → ページ本体の chunk」の表で 1 本足す。

**Tech Stack:** Angular 22（`@angular/ssr/node`・`@angular/build`）、Express、Node のスクリプト、Jest。

**Spec:** 無し。根拠は `.context/review-2026-11-12/fable-performance.md` の P5 と、本番のトップの HTML に `modulepreload` が 10 本あり real-time のページ本体の chunk が入っていないことを確かめた記録（tier3-ledger.md の 4）。

## Global Constraints

- HTML の見た目と中身は変えない。足すのは `<link rel="modulepreload">` だけ。
- 2 回目以降は ngsw が JS を返すので、効くのは初回とデプロイ直後だけ。効き目は 4G の初回で測る。
- `replaceWithShellIfTooLarge`（server.ts）で骨組みに替えた応答にも同じ処理をかける。
- 表が無い・読めないときは、今の動き（末尾に 10 本）のまま返す。表のせいで描画を失敗させない。

## 決めたこと

- 表の作り方: `ng build` に `--stats-json` を付け、出力の `stats.json`（esbuild の metafile）から、`app.routes.ts` の `loadComponent` が指す `src/app/pages/**/*.component.ts` を `entryPoint` に持つ出力の chunk を引く。`scripts/build-route-preloads.mjs` が `dist/sotetsu-lab-v3-client/server/route-preloads.json`（`{ "/timetable/station": "chunk-XXXX.js", ... }`）を書く。`build:prod` の後に流す。
- ルートの照合: URL の path の先頭から、表の鍵のうち一番長く一致するものを使う（matrix params の `;` の前で切る）。
- 移す位置: `<head>` の最後の `<link rel="stylesheet">` の直後。

## Review Focus

- `;` の matrix params・クエリ・末尾の `/` が付いた URL でも、正しいページの chunk を引くこと。
- 表に無いルート（`/`・見つからないページ）では、移すだけで足さないこと。
- 同じ chunk が既に 10 本の中にあるとき、2 本にしないこと。
- `stats.json` は配信物に入れない（`dist/.../browser` に置かない）。
- CloudFront に置かれた古い HTML と新しい chunk の名前が食い違っても、先読みが 404 になるだけで描画は壊れないこと（今の stale chunk の読み込み直しで回復する）。

---

### Task 1: 末尾の先読みを head へ移す

**Files:**

- Create: `src/app/core/ssr/move-preloads-to-head.ts` と `.spec.ts`
- Modify: `server.ts`

**Interfaces:**

- Produces: `movePreloadsToHead(html: string, extra?: readonly string[]): string`

- [ ] **Step 1: spec を書く** — 末尾の `<link rel="modulepreload" href=...>` がすべて head の最後の stylesheet の直後へ移る／`extra` の href を重ねずに足す／`</head>` が無い HTML はそのまま返す／`modulepreload` が 0 本でも `extra` は足す。
- [ ] **Step 2: 落ちることを確かめる** — `npx jest --testPathPatterns=move-preloads-to-head`
- [ ] **Step 3: 実装して server.ts の `writeResponseToNodeResponse` の前で HTML に通す**（content-type が `text/html` のときだけ）。
- [ ] **Step 4: 通ることを確かめる**
- [ ] **Step 5: コミット** `perf: :zap: SSR の modulepreload を head へ移す`

### Task 2: ルート → ページの chunk の表を作り、1 本足す

**Files:**

- Create: `scripts/build-route-preloads.mjs` と `scripts/build-route-preloads.spec.ts`
- Modify: `package.json`（`build:prod` の後に流す）、`server.ts`
- Create: `src/app/core/ssr/route-preloads.ts`（表を読んで URL から href を返す）と `.spec.ts`

**Interfaces:**

- Consumes: `movePreloadsToHead(html, extra)`
- Produces: `routePreloadFor(path: string, table: Record<string, string>): string | null`

- [ ] **Step 1: spec を書く** — 小さな metafile の fixture から表ができる／`routePreloadFor('/timetable/station;station_id=x')` が駅別の chunk を返す／表に無い path で null。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: 実装する**（表が無ければ server は起動時に警告を 1 行出し、Task 1 の移動だけをする）
- [ ] **Step 4: 全 jest・lint が通り、`npm run build:prod` のあとに `route-preloads.json` ができることを確かめる**
- [ ] **Step 5: コミット** `perf: :zap: ルートのページの chunk を head で先読みする`

### Task 3: 効き目を測って ADR を書く

**Files:**

- Create: `docs/adr/0025-route-chunk-preload.md`

- [ ] **Step 1: 手元の本番ビルドの SSR を Playwright（CDP で 4G 相当・CPU 4 倍・SW を止める）で開き、トップ・リアルタイム・駅別で「最後の JS が届いた時刻」と「最初の API を出した時刻」を変更の前後で 3 回ずつ取る。**
- [ ] **Step 2: 効き目が無いページがあれば、その数字を ADR に書く（足すのをやめる判断も含めて）。**
- [ ] **Step 3: ADR を書き、コミット** `docs: :memo: ルートの chunk の先読みの ADR を足す`
