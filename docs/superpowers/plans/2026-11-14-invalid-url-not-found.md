# URL の不正な値で「見つからないページ」と 404 を返す Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** URL の値（matrix param・path param）が不正なときや、指す物が存在しないときに、そのページの中身の代わりに「ページが見つかりません」を出す。サーバーで描くページは状態コード 404 で返す。

**Architecture:** 各ページが URL を読む所で値を「無い」「不正」「正しい」の 3 つに分ける。不正なら api を呼ばずに見つからない表示へ切り替える。api やグローバル状態で存在しないと分かったときも同じにする。404 は `SsrResponse` に足す `setStatus(404)` が `RESPONSE_INIT.status` を書いて返す（`@angular/ssr` は描き終えてから `new Response(stream, responseInit)` を組むので、描く途中の書き換えが効く）。URL は変えない。

**Tech Stack:** Angular 22.2（SSR・`RenderMode.Server`）、NgRx SignalStore、jest（`npx jest`）。

**Spec:** spec は書かない。決めたことは下の「決めたこと」に書く。材料は `.context/url-param-inventory.md`（2026-11-14 の棚卸し。ページごとの値・読む場所・今の動き）。

## なぜ直すか

- URL の値が範囲外や不正でも、今は既定値に読み替えたり丸めたりして 200 で描く。`days=45` も `days=30` も同じ中身になる。中身の同じページが URL ごとに何通りもでき、検索エンジンに載る。書いた人も間違いに気づけない。
- 検査をせずに api へ渡す値が多い（駅別の `station_id`、運用表の `calendar_id` など 11 個）。api は不正な値を 422 で返すので、ページは「読み込みに失敗しました」になるが、応答は 200 のままだ。
- 存在しない駅や編成の URL も、空のページとして 200 で返る。

## 決めたこと

1. **出し方は「見つからないページ」と 404**（ユーザー決定 2026-11-14）。中身は今の `pages/not-found` と同じ（`app-empty-state`・`search_off`・「ページが見つかりません」・「トップへ戻る」）。題名も「ページが見つかりません」。サーバーで描くページは 404 を返し、キャッシュは短くする（`setCachePolicy('short')`）。
2. **対象は URL の値を読む全ページ**（ユーザー決定）。
3. **形の正しい ID が存在しないときも 404**（ユーザー決定）。api が「無い」と返したとき、またはグローバル状態の一覧（駅・路線）に無いとき。
4. **仕組みは、ページの中で切り替える形**（ユーザー決定。棚卸しの候補 A）。ガードで別のルートへ流す形（候補 B）は使わない。
5. **値が「無い」ときは今のまま**。今日のダイヤ・横浜・上り・今の時刻などで補う動き（ブラウザで `replaceUrl`、サーバーは骨組みで 200）は変えない。404 にするのは、値が**あって不正**なときだけ。値なしで開く正しい URL まで 404 にしないため。
6. **値があって不正なら、今の「補って置き換える」動きもやめて 404 にする**。例: 駅別の `calendar_id=abc` は、今は今日のダイヤに置き換えるが、これからは 404。
7. **サーバーで決められない範囲は今のまま**。編成別の `date` の「明後日より先」は、今日が分からないとサーバーで判定できないので、今の置き換え（ブラウザで今日へ）を残す（私の判断）。形が `yyyy-MM-dd` でない・暦に無い日は 404。
8. **ブラウザで描くページ**（時刻表の追加・コピー・更新）は、サーバーの応答が常に殻の 200 なので、画面の中で見つからない表示を出すだけにする。投稿管理の投稿者は今も画面内で出しているので触らない。
9. **触らないもの**: ログイン・登録の `return_to`（安全のために `/` へ読み替える。索引には載らない）、用語集の `#fragment`（ページの中の場所で、中身は変わらない）。
10. **過去の運用情報の丸め（`clampPastTimeDays`）は外す**。同じブランチの 25d290ec・c7f3f100 で入れたもの。定数 `PAST_TIME_DAYS_MIN = 1`・`PAST_TIME_DAYS_MAX = 30` とフォームの検証は残す。`days` は 1〜30 の整数だけ通し、それ以外（`45`・`0`・`-3`・`abc`・`7.5`）は 404。
11. **真偽の値は `true`・`false` だけ通す**（過去の運用情報の `include_invalidated`）。今は `true` 以外を false に読む。
12. ダイヤグラムの旧形式 `window` は、形が正しければ今のまま `time` に直す。形が違えば 404。

## Global Constraints

- URL は変えない。見つからない表示はそのページのルートのまま出す（リダイレクトしない）。
- 値が無い URL の動きは変えない（決めたこと 5）。
- 見つからないと決めたら、そのページは api を呼ばない（存在を確認する 1 本は除く）。
- 見つからない表示の中身・題名は `pages/not-found` と同じ文言にする。文言を 2 か所に書かない。
- 404 と短いキャッシュは `SsrResponse` を通して書く。`RESPONSE_INIT` をページから直に触らない。
- 404 を決める処理は、サーバーとブラウザで同じ結果になること（hydration で中身が食い違わない）。
- tsconfig は strict: false。URL の値は `string | null` として読み、`Number()`・`String()` に素で通さない（[[project_url_param_validation]] の教訓）。
- ページ構成・ストア・コンポーネントの書き方は CLAUDE.md の「標準ページ構成パターン」に従う。
- コミットは Conventional Commits と絵文字。

## Review Focus

1. 値なしで開く URL（`/timetable/station`・`/train-diagram`・`/operation/past-time` など）が今までどおり 200 で描かれ、ブラウザで補われること。
2. サーバーで描いた 404 のページを、ブラウザが hydration で引き継いだとき、ページの本体に切り替わったり api を呼んだりしないこと。
3. 見つからない表示のあとで、同じページの中で正しい URL へ移ったとき（操作帯から別の駅を選ぶなど）、ページの本体に戻ること。
4. 見つからない表示のときに、ページが取ったデータで題名を詳しくする effect（`pageMeta.setTitle`）が、題名「ページが見つかりません」を上書きしないこと。
5. 存在を確認する api が失敗したとき（5xx・回線）は 404 にせず、今までの読み込み失敗の表示にすること。404 にするのは「無い」と分かったときだけ。

---

### Task 1: 共通の部品（404 を書く・見つからない表示の部品・URL の値の読み取り）

**Files:**
- Modify: `src/app/core/ssr/ssr-response.ts`（`setStatus` を足す）・同 spec
- Create: `src/app/shared/not-found-content/not-found-content.component.ts`（`pages/not-found` の `app-empty-state` と「トップへ戻る」を移したもの）・同 spec
- Modify: `src/app/pages/not-found/not-found.component.ts`（中身を `app-not-found-content` に替える）
- Create: `src/app/core/page-not-found/page-not-found.ts`（ページが見つからないと決めたときに呼ぶ係）・同 spec
- Create: `src/app/shared/url-params/url-param.ts`（読み取りの共通の形と関数）・同 spec。既存の `shared/uuid-param.util.ts` の `parseUuidParam` はここから使えるようにする（今の呼び出し元は壊さない）

**Interfaces:**
- Produces:
  - `SsrResponse.setStatus(status: number): void`：`RESPONSE_INIT.status` を書く。ブラウザでは何もしない
  - `NotFoundContentComponent`（selector `app-not-found-content`）：`main` の外側は持たない（置く側のレイアウトに入る）
  - `PageNotFound.mark(): void`：`setStatus(404)`・`setCachePolicy('short')`・題名を「ページが見つかりません」にする。`PageNotFound.title`（定数）を not-found のルートの `data.title` でも使う
  - `type UrlParam<T> = { kind: 'missing' } | { kind: 'invalid' } | { kind: 'ok'; value: T }`
  - `readUrlParam<T>(raw: string | null, parse: (raw: string) => T | null): UrlParam<T>`：`null` は missing、`parse` が null を返したら invalid
  - parse 関数: `parseUuid`・`parseDateKey`（`yyyy-MM-dd` で暦にある日。文字列のまま返す）・`parseIntInRange(min, max)`（10 進の整数だけ。`7.5`・`1e1`・` 7` は null）・`parseBooleanFlag`（`'true'`→true・`'false'`→false）

- [ ] **Step 1: テストを書く**
  - `setStatus(404)` で `RESPONSE_INIT.status` が 404 になる。`RESPONSE_INIT` が無いとき（ブラウザ）は何もしない
  - `PageNotFound.mark()` が 404・short・題名を設定する
  - `readUrlParam(null, …)` は missing、`readUrlParam('abc', parseUuid)` は invalid、正しい UUID は ok
  - `parseDateKey`: `2026-11-14`・`2028-02-29` は通す。`2026-02-30`・`20261114`・`2026-11-14T00:00` は null
  - `parseIntInRange(1, 30)`: `1`・`30` は通す。`0`・`31`・`-3`・`abc`・`7.5`・`''`・` 7` は null
  - `parseBooleanFlag`: `true`・`false` は通す。`TRUE`・`1`・`''` は null
  - `NotFoundComponent` の表示が今と同じ（文言・ボタン）
- [ ] **Step 2: `npx jest --testPathPatterns=<各 spec>` で失敗を見る**
- [ ] **Step 3: 上の Interfaces を書く**
- [ ] **Step 4: 同じコマンドで通ることを見る。`npx ng lint`**
- [ ] **Step 5: コミット** `refactor: :recycle: 見つからない表示と URL の値の読み取りを共通にする`

### Task 2: 過去の運用情報

**Files:**
- Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.ts`（:89-114 の paramMap の読み取り）・テンプレート・ストア（見つからないかどうかの signal）
- Modify: `utils/past-time-days.util.ts`（`clampPastTimeDays` を消す。定数は残す）
- Test: `operation-past-time.component.spec.ts`（25d290ec・c7f3f100 で足した丸めの試験を置き換える）

- [ ] **Step 1: テストを書く**
  - `days=45`・`days=0`・`days=-3`・`days=abc`・`days=7.5` は見つからない表示・`PageNotFound.mark` が呼ばれる・api（service の fetch）を呼ばない
  - `reference_date=2026-02-30`・`reference_date=abc` も同じ
  - `include_invalidated=1` も同じ。`include_invalidated=false` は通る
  - `days=7`・`reference_date=2026-11-01` は今までどおり検索する。値が無い URL は今までどおり（検索しない初期状態）
  - 見つからない表示から、正しい値の URL へ移ると本体に戻り検索する（Review Focus 3）
  - 見つからない表示のとき、題名の effect が「ページが見つかりません」を上書きしない（Review Focus 4）
- [ ] **Step 2〜4: 失敗を見る → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: 過去の運用情報で URL の値が不正なら見つからないページにする`

### Task 3: 駅別・全線・編成別の時刻表

**Files:**
- Modify: `pages/timetable/timetable-station/timetable-station.component.ts`（:227-263）、`timetable-all-line/timetable-all-line.component.ts`（:151-175）、`timetable-formation/timetable-formation.component.ts`（:294-309 と、今の画面内の `notFound` 状態）と、それぞれのテンプレート・ストア・spec

**決まり:**
- 駅別: `calendar_id`（UUID）・`station_id`（UUID かつグローバルの駅一覧にある）・`trip_direction`（`parseTripDirectionParam`）。値があって不正なら 404（今の置き換えはやめる）。無い値は今のまま補う。`calendar_id` の存在は今の `fetchCalendar` の結果で「無い」と分かったら 404
- 全線: `calendar_id`・`trip_direction`・`trip_block_id`（UUID）。`trip_block_id` が api で「無い」なら 404
- 編成別: `formation_number` が api で無いときの今の画面内 `notFound` を、`PageNotFound.mark()` と共通の見つからない表示に替える。`date` は形が違えば 404、「明後日より先」は今の置き換えのまま（決めたこと 7）
- api が「無い」をどう返すか（404・空の配列・null）は、`../sotetsu-lab-v3-api` の該当する口を読んで確かめ、報告に書く。5xx・回線の失敗は今の失敗の表示のまま（Review Focus 5）

- [ ] **Step 1: テストを書く**（ページごとに: 不正な各値で見つからない表示と mark・api を呼ばない／存在しない ID で見つからない表示／値なしは今の補い方のまま／api の 5xx は今の失敗の表示）
- [ ] **Step 2〜4: 失敗を見る → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: 時刻表で URL の値が不正なら見つからないページにする`

### Task 4: 運用表・運用行路図

**Files:**
- Modify: `pages/operation/operation-table/operation-table.component.ts`（:137-150）、`operation-route-diagram/operation-route-diagram.component.ts`（:320 と fetchData）と、テンプレート・ストア・spec

**決まり:** 運用表の `calendar_id` は UUID で、存在は api で確かめる。行路図の `operation_id` は UUID で、`findOneWithTrips` が「無い」なら 404。値なしは今のまま（運用表は今日で補う・行路図は空の状態）。

- [ ] **Step 1〜4: Task 3 と同じ形のテスト → 失敗 → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: 運用表と運用行路図で URL の値が不正なら見つからないページにする`

### Task 5: ダイヤグラム

**Files:**
- Modify: `pages/train-diagram/train-diagram.component.ts`（:891-946・`#parseDirectionFilter`）、`utils/diagram-timeline.util.ts`（`parseTimeParam`・`parseLegacyWindowParam` は今の関数を使う）と、テンプレート・ストア・spec

**決まり:** `calendar_id`（UUID・存在は api）、`route_ids`（カンマ区切りの各要素が UUID で、グローバルの路線一覧にある。1 つでも外れたら 404）、`direction`（今受け付けている値だけ。今の `#parseDirectionFilter` が受ける値を確かめて、それ以外は 404）、`time`（`parseTimeParam` が undefined なら 404）、`window`（決めたこと 12）。値なしは今のまま補う。

- [ ] **Step 1〜4: テスト → 失敗 → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: ダイヤグラムで URL の値が不正なら見つからないページにする`

### Task 6: 列車位置情報

**Files:**
- Modify: `pages/train-location/train-location.component.ts`（:388-419）、`utils/parse-time-param.util.ts` と、テンプレート・ストア・spec

**決まり:** `route_id`（UUID でグローバルの路線一覧にある）、`station_id`（UUID でその路線の駅）、`time`（`parseTimeParam` が読めなければ 404。今は今の時刻に読み替えている）、`calendar_id`（UUID・存在は api）。localStorage の記憶で駅を補う動きは今のまま（記憶した駅が路線に無いときは補わないだけで、404 にはしない。URL に書かれた値ではないため）。

- [ ] **Step 1〜4: テスト → 失敗 → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: 列車位置情報で URL の値が不正なら見つからないページにする`

### Task 7: 時刻表の追加・コピー・更新（ブラウザで描くページ）

**Files:**
- Modify: `pages/timetable/timetable-edit-form/timetable-edit-form.component.ts`（:98-102）・`services/timetable-edit-form.service.ts`（:143-150）と、テンプレート・ストア・spec

**決まり:** `calendar_id`・`trip_block_id`（UUID・`copy`・`update` は `findOneById` で存在）、`trip_direction`。不正・存在しないときは `app-not-found-content` を出す（404 は返せない。`PageNotFound.mark()` はブラウザでは題名だけ変わる）。

- [ ] **Step 1〜4: テスト → 失敗 → 直す → 通る・lint**
- [ ] **Step 5: コミット** `fix: :bug: 時刻表の入力で URL の値が不正なら見つからない表示にする`

### Task 8: 手元のサーバーで状態コードを確かめる（controller が行う）

- [ ] **Step 1: SSR のビルドを手元で起動し（手元の api と backend に向ける）、curl で状態コードを見る**。不正な値の URL（過去の運用情報の `days=45`、駅別の `calendar_id=abc`、存在しない UUID の駅、編成別の存在しない編成、ダイヤグラムの `direction=foo` など、Task 2〜6 の各ページから 1〜2 本）が 404 で `Cache-Control` が short。値なしの URL と正しい値の URL が 200
- [ ] **Step 2: ブラウザ（Playwright）で、404 の URL を開いて見つからない表示が出て、api を呼んでいないこと、そこから操作帯で正しい条件に移ると本体が出ることを見る**（Review Focus 2・3）
- [ ] **Step 3: 全体の `npx jest` と `TZ=UTC npx jest`、`npx ng lint` が通る**
