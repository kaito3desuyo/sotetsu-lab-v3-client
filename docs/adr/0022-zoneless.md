# ADR-0022: zone.js を外して zoneless で動かす

- **日時**: 2026-11-04
- **Agent**: claude-sonnet-5-5
- **ステータス**: 採用済み（本番へのデプロイ前。ログインした状態のページの確認が残る）
- **ブランチ**: refactor/zoneless
- **関連**: spec `docs/superpowers/specs/2026-11-04-zoneless-design.md`、計画 `docs/superpowers/plans/2026-11-04-zoneless.md`、ADR-0003（Angular 22）、ADR-0014（SSR の描き分けの決まり）、ADR-0017（SSR on Lambda）、ADR-0018（hydration を軽くする）

---

## 背景

- Angular は v21 から zoneless が既定になった。client は `main.ts` と `main.server.ts` で `provideZoneChangeDetection()` を渡して、その既定を打ち消し、zone.js を使っていた。
- 部品 92 個はすべて `OnPush`、`| async` は 0、状態は signal のストア。`NgZone` を使うのは `core/utils/run-interval-in-browser.ts` だけだった。zone.js に頼る所が少なく、外せる見込みがあった。
- 2026-10-28 に `spike/zoneless` で試した（CPU 4x・各 2 回）。
  - 駅別の TBT は 1.21 s から 1.00 s。
  - hydration は、駅別が 547 ms から 352 ms、運用表が 312 ms から 207 ms。
  - 他のページは誤差。
  - 初期転送（gzip）は 292.6 kB から 280.7 kB。polyfills の 11.7 kB が消える。
- 避けたい失敗は 1 つ。毎秒書き換わる画面（リアルタイム運用情報・列車位置・時計）が、エラーも出さずに止まること。もう 1 つは SSR の HTML が変わること。

## 決定

- **zone.js を外し、v22 の既定の zoneless で動かす。** `provideZonelessChangeDetection()` は書かない（既定なので要らない）。
- **アプリ側の変更（758ed705・029633f8）**
  - `main.ts`・`main.server.ts` から `provideZoneChangeDetection()` と import を外した。
  - `angular.json` の build の `polyfills` から `zone.js` を外した。`src/polyfills.ts` を消し、`tsconfig.app.json` の `files` からも外した。
  - `package.json` から `zone.js` を外した。`package-lock.json` には `@angular/core` などの optional peer として `node_modules/zone.js` が残る（インストールはされない想定）。
  - `run-interval-in-browser.ts` から `NgZone.run` を外した。tick がストアの signal を書けば、zone が無くても描き直しは signal から予約される。JSDoc もそれに合わせて直した。署名は変えていない。
  - `environment.ts` 末尾の古いコメントと、spec 3 本のコメントにあった zone.js への言及を消した。コードは変えていない。
- **非同期のエラーを ErrorHandler に戻した。** zone.js のときは、未処理の Promise 拒否と window の error が zone 経由で `ErrorHandlerService`（GA に `app_error` を送る）に届いていた。zoneless ではその経路が無いので、`app.config.ts` に `provideBrowserGlobalErrorListeners()` を足した。spec（`app.config.spec.ts`）は、`appConfig.providers` を入れた TestBed で window に `ErrorEvent` を出すと `handleError` が呼ばれることを確かめる。
- **テスト環境も zoneless に替えた（abbb4724）。** `setup-jest.ts` を `jest-preset-angular/setup-env/zone` から `.../zoneless`（`setupZonelessTestEnv`）にした。切り替え直後に 7 suites が落ちたので、spec だけを直した。
  - `waitForAsync` を使う 4 本（運用行路図の描画・免責事項・プライバシーポリシー・ライブラリ車両）: `beforeEach(async () => { await TestBed.configureTestingModule(...).compileComponents(); })` に書き換えた。
  - `operation-table.component.spec.ts` の「描いたカードは…content-visibility」: zoneless の `fixture.detectChanges()` は afterRender まで回り、`@defer (on viewport)` が jsdom に無い `IntersectionObserver` を作って落ちた。その describe に、何も通知しない `IntersectionObserver` の代役を置いた。期待値は変えていない。
  - `train-location.component.spec.ts`・`train-diagram.component.spec.ts`: `provideRouter([])` を `provideRouter([], withRouterConfig({ resolveNavigationPromiseOnError: true }))` に替えた。コンポーネントが投げっぱなしで呼ぶ `router.navigate` が一致する経路を見つけられず（NG04002）、その拒否が zone 無しでは未処理拒否になって jest のワーカーが落ちたため。
  - 新しい spec: 「tick が signal を書くと、変更検知を手で呼ばなくても表示が変わる」（`run-interval-in-browser.spec.ts`）。`advanceTimersByTime(3000)` + `whenStable()` だと whenStable が固まったので、`advanceTimersByTime(3100)` にして偽タイマーを流しきった。
- **SSR の待ち（`PendingTasks`）は足していない。** 18 ページで SSR の HTML が master と同じだったので、直す所が無かった。
- **コンポーネントの書き換え（signal 化・`OnPush` 化）はしていない。** 確かめで止まる所が見つからなかった。

### 検証した結果

jest 285 suites / 2318 tests、`tsc`（app・spec）、`npm run lint`、`npm run build:prod` が通る。build の出力に `polyfills-*.js` は無い。`angular.json`・`package.json`・`tsconfig*.json` に `zone.js` の文字は 0 件。`src` には、エラー経路を戻した理由を書いたコメント 2 か所（`app.config.ts`・`app.config.spec.ts`）だけが残る。

## 確かめたこと（2026-11-04）

master 17f0fbc3 のビルド（:4331）と zoneless 029633f8 のビルド（:4332）を、同じ手元の API につないで比べた。zoneless のビルドに `polyfills-*.js` は無い。

- **SSR の HTML**: 18 ページ（sitemap の 12 ページ、時刻表・駅別・全線時刻表・ダイヤグラムのパラメータ付き、マイページ、ログイン）で、ハッシュと id を除くと body が同じ。`ng-state` は全ページで同じ。サーバーのログにエラーは無い（train-location・train-diagram の SSR も通った）。
  - 注記: マイページ・ログインは `RenderMode.Client` なので、比べたのは CSR の殻（`ng-state` 0 件）。ログインが要るページ（マイページ・ログイン・投稿管理・時刻表の入力）は SSR で描かないので、SSR の待ちの問題は起きない。
- **毎秒の画面**: リアルタイム運用情報を 70 秒ずつ開き、DOM は両方で更新され続けた（変更数は master 143・zoneless 189）。最終更新は、どちらも取得した時刻。タブを 20 秒裏に回して戻しても、ページは生きていた。
  - 12 秒の観察では、列車位置は両版とも書き換わり続けた（DOM 変化は master 416・zoneless 380 回）。トップの状態カードとダイヤグラムは、12 秒では両版とも変化 0（分単位の表示のため）で、振る舞いは同じ。
- **操作**: アカウントメニュー、サイドナビ、絞り込みの帯、行の投稿ダイアログの開閉、編成順タブ、ダイヤグラムのスクロール（time パラメータは両方で変わらない）が、master と同じに動いた。pageerror は出ていない。
- **圏外**: Service Worker が両方を制御している。圏外でリアルタイムを開き直すと、保存した表示が戻る（本文 11345 字、両方同じ）。
- **設定の保存**: リアルタイムの絞り込みで 相鉄 を選ぶと、要約が「絞り込み中：相鉄 44/104」になる。`OperationRealTimeStore` が 3.5 秒以内に IndexedDB へ書かれ、元に戻すと書き直される。両方で同じ。
- **計測**（CPU 4x・headless Chrome・各 2 回、全線時刻表だけ各 5 回）。表の値は各回の平均（全線時刻表は下に平均と中央値）

| ページ | TBT (ms) master → zoneless | hydration (ms) master → zoneless |
|---|---|---|
| トップ | 872 → 784 | 42 → 32 |
| 駅別 | 1229 → 985 | 71 → 61 |
| 全線時刻表 | 875（n=5）→ 1009（n=5） | 77 → 72 |
| 運用表 | 956 → 904 | 49 → 40 |
| ダイヤグラム | 1441 → 1436 | 92 → 87 |

- **全線時刻表の TBT は悪くなった。** master 5 回（`perf.txt` の 2 回＋`perf-al.txt` の 3 回）と zoneless 5 回で、平均と中央値は次のとおり（単位 ms）。

| 全線時刻表（n=5） | master の値 | master 平均 / 中央値 | zoneless の値 | zoneless 平均 / 中央値 |
|---|---|---|---|---|
| TBT | 869 897 873 886 850 | 875 / 873 | 947 976 1197 969 956 | 1009 / 969 |
| いちばん長い task | 708 714 714 712 715 | 712.6 / 714 | 817 834 1011 816 826 | 860.8 / 826 |
| long task の合計 | 1219 1247 1223 1236 1200 | 1225 / 1223 | 1247 1326 1597 1319 1256 | 1349 / 1319 |
| hydration | 77 75 73 83 79 | 77.4 / 77 | 71 72 75 73 72 | 72.6 / 72 |

  - TBT の差は、平均で +134 ms（875 → 1009）、中央値で +96 ms（873 → 969）。zoneless の 1197 は外れ値（最長 task も 1011）で、これを除いても 947 976 969 956 の平均 962 で、master より 87 ms 高い。
  - 原因は未確定。いちばん長い task が伸びている（712 前後 → 820 前後。中央値 714 → 826）。task がまとまった可能性がある。TBT は 50 ms を超えた分だけ数えるので、まとまると増える。long task の合計も zoneless の方が高い（中央値 1223 → 1319）ので、仕事の量が同じとは言えない。
  - 駅別は −244 ms（1229 → 985）と大きく減った。
- 判断：全線時刻表のために、この PR で全線の初回描画を分けたり、zone.js を戻したりはしない。主な利得（駅別、トップ、運用表）を取り、全線は残りとして記す。

## 退けた案

- **zone.js を残す**: 毎秒の画面の止まりを心配しなくてよいが、polyfills の 11.7 kB と、駅別の TBT・hydration の利得を捨てる。v21 以降の既定からも外れたままになる。
- **全線時刻表の TBT のために、この PR で初回描画を分ける（`@defer` など）**: 原因が未確定で、この PR の範囲を超える。必要なら別の仕事にする。

## 結果

- zone.js は client から外れた。初期転送は小さくなり、駅別・運用表の hydration は軽くなる。
- ブラウザでは `whenStable` が `PendingTasks` だけで決まるので、master より早く stable になる見込み（実測していない推論）。Service Worker の登録（`registerWhenStable:30000`）と event replay が早く走る。
- 毎秒書き換わる画面は、ストアの signal を書けば描き直される。新しい毎秒の処理は、画面の値を signal の外で書かない。
- 手元の jest は zoneless の TestBed で動く。`fakeAsync`・`waitForAsync` は使えない（`jest.useFakeTimers`・`await fixture.whenStable()` を使う）。

## 残っていること

- **投げっぱなしの `router.navigate`**: train-location（383・597・651・658 行）と train-diagram（920・1200・1229 行）は、戻りの Promise を握っていない。本番の経路は必ず一致し、サーバーの描画では遷移しないので、今は拒否は出ない。遷移が失敗したときだけ、未処理拒否になる（zone.js のときは ErrorHandler を通って GA にも送られていた。`provideBrowserGlobalErrorListeners()` を `app.config.ts` に足して、zoneless でも同じ経路に戻した）。spec は `resolveNavigationPromiseOnError` で避けている。直すなら別の仕事にする。
- **全線時刻表の TBT**: 上のとおり平均 +134 ms・中央値 +96 ms。直すなら全線の初回描画を分ける（`@defer` など）か、この PR を戻す。
- **ログインした状態のページ**: 時刻表の入力（編集）とマイページは、ログインが要るので手元では確かめていない。ユーザーが別に確かめる。
- **本番で確かめる**: デプロイ後に、リアルタイムを数分開いて時刻・在線が進むことを見る。
- 小さな直し残し（レビューの指摘）: operation-table の spec に zone.js の古いコメントが残る。`provideRouter` の設定が 6 か所に重複している。`run-interval-in-browser.ts` の JSDoc の SSR の理由は zoneless では弱い。run-interval の spec は 3000 ms ちょうどだと DOM が 2 のまま（偽タイマーとスケジューラの順番）なので 3100 ms にしている。
