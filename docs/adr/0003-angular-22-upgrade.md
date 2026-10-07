# ADR-0003: Angular を 22 に上げ、今の挙動は設定で保つ

- **日時**: 2026-10-07
- **Agent**: claude-opus-5-5
- **ステータス**: 採用済み
- **ブランチ**: build/angular-22

---

## 背景

- client は Angular 20.3 のままだった。ユーザーが「Angular をはじめとする依存関係を上げたい」と言った（2026-10-07）。
- 範囲はユーザーが決めた。Angular 一式を 22 まで上げる。それ以外の依存は、package.json の範囲の中でだけ上げる。
- `@rx-angular/state` と `@rx-angular/cdk` には、Angular 22 に対応する版が無い。ユーザーは、使っている所を書き換えて外す方を選んだ。
- 計画は `docs/superpowers/plans/2026-10-07-angular-22-upgrade.md` に書いた。

## 決定

### 1. 版

| もの | 前 | 後 |
|---|---|---|
| Angular（core・CLI・SSR） | 20.3 | 22.2 |
| Angular Material・CDK | 20.2 | 22.2 |
| TypeScript | 5.8 | 6.0 |
| zone.js | 0.15 | 0.16 |
| angular-eslint | 20 | 22.5 |
| `@angular-builders/jest` | 20 | 22 |
| jest・jest-preset-angular | 29・14 | 30・16 |
| `@testing-library/angular` | 17 | 19 |
| Node（volta） | 22.17.0 | 22.23.3 |

- Angular 22 は Node `^22.22.3` を求める。CI と deploy は `node-version: 22` なので、そのままでよい。
- jest 30 は、計画では「今回は上げない」としていた。しかし `@angular-builders/jest` 21 以上が jest 30 と jest-preset-angular 16 を求めるので、上げるしかなかった。
- `ng update` は 1 メジャーずつしか上げられないので、21 を経由した。

### 2. 今の挙動は設定で保つ

v22 で既定が変わったものは、どれも今までの値を明示して、見た目と動きを変えないようにした。

| 変わったもの | 保ち方 |
|---|---|
| `changeDetection` の既定が OnPush になる | 書いていなかった 13 個に `ChangeDetectionStrategy.Eager` を明示した（移行が足した） |
| テンプレートの `?.` が null でなく undefined を返す | 移行が `$safeNavigationMigration()` で包んだ（7 テンプレート・22 か所） |
| Router の `paramsInheritanceStrategy` の既定が `'always'` になる | `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` を明示した。matrix パラメータを多く使うため |
| `HttpClient` の既定が fetch になる | アプリはもともと `withFetch()`。spec は移行が `withXhr()` を足した |
| 段階的ハイドレーションが既定になる | `withNoIncrementalHydration()` を足した（移行が足した。SSR は無効なので実害は無い） |

- 移行は、`nullishCoalescingNotNullable` と `optionalChainNotNullable` の診断を `suppress` にする設定も足した。しかし、この設定は `strictTemplates` が無効だとビルドがエラーになる。`strictTemplates` が無効なら、この 2 つの診断はもともと走らないので、設定ごと外した。

### 3. 設定ファイルの書き換え

- TypeScript 6 で `baseUrl` が非推奨になり、エラーになる。`'src/…'` の import がたくさんあるので、`paths: { "src/*": ["./src/*"] }` に置き換えた。jest は `modulePaths` で解決しているので影響しない。
- angular-eslint 22 は flat config しか読まない。`.eslintrc.json` と `.eslintignore` を `eslint.config.js` に移した。ルールは前と同じにした。
  - v22 の recommended に入った `prefer-on-push-component-change-detection` は切った。上で明示した `Eager` を咎めるため。
  - 使われていない eslint-disable の警告は、前と同じく出さない。
- jest-preset-angular 16 では `global-setup` が無くなった。zone の準備は `setupZoneTestEnv()` で行う。jsdom の環境は `jest-environment-jsdom` を別に入れる。

### 4. `@rx-angular` を外した

- `RxState.hold(obs$, fn)` は、`obs$.pipe(takeUntilDestroyed(destroyRef)).subscribe(fn)` に書き換えた。どちらも、コンポーネントが消えたら購読をやめる。
- `RxState` を providers に入れているだけで使っていなかった所は、消した。

## 結果

- jest 1202 件・lint・tsc・本番ビルドが通る。
- ローカル（本番 DB）で 10 ページを開いた。捕まらない例外は 0 件。描画された文字数は、本番と同じだった（ダッシュボードと列車位置情報は、比べる条件がそろわなかった）。
- 開発用のコンテナは、node_modules を別のボリュームに持っている。このブランチに切り替えたら、コンテナの中で `npm ci --force` を流してから再起動する。

## 追記（2026-10-08）: 後始末と、範囲の外に置いた更新

ユーザーの指示で、同じブランチで続けた。

- `Eager` の 13 個を OnPush にし、`prefer-on-push-component-change-detection` を戻した。
  - 本物は App・Layout・Loading・ライブラリの殻 4 個の 7 個で、どれもシグナルだけで動くか、状態を持たない。残り 6 個は spec のテスト用ホスト。
  - 親が OnPush だと、その下の Eager の子は描き直されなくなる。だから 13 個はまとめて替えた。これで OnPush でないコンポーネントは無い。
- `$safeNavigationMigration()` を外した。
  - 22 か所のうち 19 か所は、真偽しか見ないか、受け取る入力が undefined を前提にしている。
  - 日数のパイプ（`operationRealTimeDayCount`・`calculateDayCountFromToday`）に渡す 3 か所は、`?? null` を残した。`dayjs(undefined)` は「今」になるので、目撃の無い推測の編成（「10706?」）が、今日目撃した編成（太字の「10706」）に見えてしまう。駅別時刻表のセルの spec で押さえた。
- 範囲の外に置いた更新:

| もの | 結果 |
|---|---|
| date-fns | 4 に上げた。v4 の破壊的変更は型と ESM 化だけ |
| eslint・eslint-config-prettier | 10 に上げた。flat config に移してあるので、設定はそのまま |
| cypress・`@cypress/schematic` | 16・6 に上げた。テストは雛形 1 本だけで CI でも回していないので、`cypress verify` まで確かめた |
| express | 5 に上げた。`'**'` は起動時に例外になるので、server.ts を `'/{*splat}'` にした。SSR は無効で、この server は本番で使っていない |
| TypeScript 7 | 上げられない。Angular 22 のコンパイラも typescript-eslint も 6.0 系までしか受け付けない |
| tailwindcss 4 | 見送った（ユーザー判断）。Safari 16.4 より古いブラウザを切り捨て、127 ファイル・約 3,100 か所のクラスが `tw-` から `tw:` の書き方に変わる。利用者のブラウザの内訳を見てから、別の作業で上げる |

- cypress の型検査で、tsconfig の `typeRoots: ["node_modules/@types"]` が原因だと分かった。`typeRoots` を指定すると、`types` に書いた名前を `node_modules/@types` の中でしか探さない。型を同梱する cypress と `@testing-library/jest-dom` が見つからず、master から `tsc -p tsconfig.spec.json` が落ちていたのも、これが原因だった。既定の探し方で `node_modules/@types` も見るので、指定を外した。

## 検討した代案

- **Angular 21 で止める**: TypeScript 6 と flat config の書き換えは要らなくなる。しかし、ユーザーが 22 までを選んだ。
- **v22 の新しい既定に合わせる（OnPush・`'always'`）**: いずれ寄せたい形だ。しかし、版の更新と挙動の変更を同じ PR に入れると、壊れたときにどちらのせいか分からなくなるので、分けた。
- **`ignoreDeprecations: "6.0"` で `baseUrl` を残す**: 1 行で済むが、TypeScript 7 で動かなくなるので、`paths` にした。
