# Angular 22 への更新 計画

**Goal:** Angular 一式を 20.3 から 22.2 に上げる。あわせて、v22 対応版の無い `@rx-angular` を外す。

**範囲（ユーザー決定 2026-10-07）:**
- Angular・Material・CDK・SSR・angular-eslint・`@angular-builders/jest`・`@testing-library/angular` を 22 の組に上げる。TypeScript は 6.0、zone.js は 0.16 にする。
- それ以外の依存は、package.json の範囲内（マイナー・パッチ）だけ上げる。
- tailwindcss 4・jest 30・date-fns 4・cypress・eslint 10・express 5・TypeScript 7 は、今回は上げない（あとで別 PR）。
- `@rx-angular/state` と `@rx-angular/cdk` は、使う所を書き換えて依存から外す。

**ブランチ:** `build/angular-22`（master から。first commit 済み）

## 前提（調べた事実）

- Angular 22.0 が求めるもの: Node `^22.22.3 || ^24.15.0 || ^26.0.0`、TypeScript `>=6.0.0 <6.1.0`、RxJS `^7.4.0`。Angular 21 は Node `^22.12.0`、TypeScript `>=5.9 <6.0`（angular.dev/reference/versions）。
- 手元の Node は volta で 22.17.0 に固定している。Angular 22 では足りないので、`volta.node` を 22.23.3（22 系の最新）にする。volta は、プロジェクトに入ったとき自動でその版を取ってくる。CI と deploy は `node-version: 22`（22 系の最新が入る）なので、変えなくてよい。
- `ng update` は 1 メジャーずつしか上げられない。20 → 21 → 22 の 2 段で進める。
- v22 で、このアプリに効く変更:
  - `changeDetection` を書いていないコンポーネントは OnPush 扱いになる。101 個中 13 個が当てはまる。`ng update` の移行が `ChangeDetectionStrategy.Eager` を書き足すかを確かめ、足されなければ手で足して今の挙動を保つ。
  - Router の `paramsInheritanceStrategy` の既定が `'emptyOnly'` から `'always'` に変わる。このアプリは `;calendar_id=…` などの matrix パラメータを多く使うので、`provideRouter` に `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` を明示し、今の挙動を保つ。
  - コンパイラの新しい診断（`nullishCoalescingNotNullable`・`optionalChainNotNullable`）で、テンプレートのエラーが出るおそれがある。出たら、要らない `??` や `?.` を消してコードで直す。数が多すぎる（30 か所を超える）なら、止めてユーザーに相談する。
  - `ComponentFactoryResolver`・`createNgModuleRef`・`provideRoutes`・`checkNoChanges`・`RouterTestingModule` は使っていない。
- `@rx-angular/state` は 3 つのコンポーネントの `RxState.hold` と、1 つの spec の providers でだけ使っている。`timetable-post-card-p` は、`RxState` を providers に入れているだけで使っていない。`@rx-angular/cdk` はどこからも使っていない。
- `ng2-adsense`（広告は停止中で、パッケージは戻す用に残している）は peer 依存が古い。CI は `npm ci --force` なので通る。今回は触らない。

## 毎段の確認（ゲート）

各タスクのあと、次の 4 つが全部通るまで、次のタスクに進まない。

1. `npx jest --no-coverage --passWithNoTests`（全件。CI と同じ）
2. `npm run lint`（サンドボックスの外で流す）
3. `npx tsc --noEmit -p tsconfig.app.json`
4. `npm run build:prod`

最後のタスクのあとは、ローカル（本番 DB を読む）で Playwright を使い、主なページを開いて確かめる。開くページは、ダッシュボード・リアルタイム運用情報・駅別時刻表・全線時刻表・運用表・運用行路図・列車位置情報・列車ダイヤグラム・過去の運用情報・列車情報の入力（開くだけで、保存はしない）。どのページも描画され、コンソールのエラー数が更新前より増えていないことを確かめる。

## Task 1: `@rx-angular` を外す

- `operation-search-card-c.component.ts` と `timetable-search-card-p.component.ts`:
  - `this.#state.hold(obs$, fn)` を `obs$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(fn)` にする（`DestroyRef` は `inject` で取る）。
  - `providers: [RxState]` と `#state` を消す。
- `timetable-post-card-p.component.ts`: `providers: [RxState]` と、その import を消す。
- `operation-search-card-c.component.spec.ts`: providers の `RxState` を消す。
- 確かめること: 書き換えた 3 つのコンポーネントの spec が、前と同じく通る。`hold` は「コンポーネントが消えたら購読をやめる」ので、`takeUntilDestroyed` で同じ意味になる。
- コミット 1（`refactor: :recycle:`）: コードの書き換え。
- コミット 2（`build: :heavy_minus_sign:`）: `npm uninstall @rx-angular/state @rx-angular/cdk`。
- ゲートを通す。

## Task 2: 範囲内の更新と Node

- `volta.node` を `22.23.3` にする。
- `npm update` で、package.json の範囲内の版に上げる。Angular は 20.3 系の最新になる。
- コミット（`build: :arrow_up:`）。ゲートを通す。

## Task 3: Angular 21

- `npx ng update @angular/core@21 @angular/cli@21 @angular/material@21`。
- 続けて `@angular-eslint/*` と `@angular-builders/jest` を 21 の組に、TypeScript を 5.9 に上げる。
- `ng update` が書き換えたコードは、別のコミット（`refactor: :recycle:`）に分ける（git.md の build と refactor の分け方）。
- ゲートを通す。

## Task 4: Angular 22

- `npx ng update @angular/core@22 @angular/cli@22 @angular/material@22`。
- 続けて `@angular-eslint/*`・`@angular-builders/jest` を 22 に、`@testing-library/angular` を 19 に、TypeScript を 6.0 に、zone.js を 0.16 に、`@types/node` を 22 に上げる。
- 13 個のコンポーネントに `Eager` が足されたかを確かめる。足されていなければ手で足す。
- `paramsInheritanceStrategy: 'emptyOnly'` を明示する。
- コンパイラの新しい診断で出たエラーを直す。
- 依存の更新は `build: :arrow_up:`、コードの書き換えは `refactor: :recycle:` に分けてコミットする。
- ゲートを通し、Playwright で主なページを確かめる。

## Task 5: ADR と PR

- `docs/adr/0003-angular-22-upgrade.md` を書く（依存の更新はアーキの決定にあたる）。書くことは、範囲、Node の版、`paramsInheritanceStrategy` と `Eager` で今の挙動を保ったこと、`@rx-angular` を外したこと。
- このコミットは、計画のコミットと一緒に、コードのコミットより前に置く（docs → code の順）。
- PR 本文には、ゲートの結果と、Playwright で確かめたページの一覧を書く。

## 受け入れ条件

- `package.json` で、Angular 系が 22.x、TypeScript が 6.0.x、`@rx-angular` が無い。
- CI（jest と Lint）が通る。
- 上に挙げたページが描画され、コンソールのエラー数が増えていない。
- URL の matrix パラメータ（駅別時刻表の `calendar_id`・`station_id` など）が、今までどおり効く。
