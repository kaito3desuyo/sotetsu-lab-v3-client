# 駅別・全線時刻表と運用表の SSR の HTML を軽くする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 駅別時刻表・全線時刻表・運用表の SSR の HTML に、取った全量でなく、サーバーが描く分に要るものだけを積み、初回の JS の開始を早める。

2026-11-16 に本番の HTML で測った ng-state の大きさは次のとおり（平日ダイヤ）。

| ページ | ng-state | うち一番大きい応答 |
|---|---|---|
| 駅別（上り・1 駅） | 2,389KB | trip-blocks 2,166KB |
| 全線（下り） | 2,465KB | trip-blocks 2,220KB |
| 運用表 | 1,264KB | operations/calendar/:id/trips 1,002KB |

**Architecture:** サーバーでは trip-blocks の GET を HttpTransferCache から外し、描画に要る分だけに削った配列を専用の TransferState の鍵に積む。ブラウザは hydration でその鍵を使って同じ HTML を描き、描き終えたあとの idle に通常の経路で全量を取り直して入れ替える。削った配列は QueryCache にも「全量」としても入れない。

**Tech Stack:** Angular 22（SSR・TransferState・HttpContext）、NgRx SignalStore、Jest。

**Spec:** 無し。根拠は `.context/review-2026-11-12/fable-performance.md` の P4（親リポ）と summary.md の 3 段「ng-state を削る」。spec を置かない代わりに、決めたことをこの plan と ADR に書く。

## Global Constraints

- 駅別時刻表はロック済みのページ。画面の見た目と行の中身は 1 つも変えない（Task 3 で DOM を比べる）。
- 駅を切り替えたときの取得は、今と同じく方向ぶんの trip-blocks の 1 本（キャッシュがあれば 0 本）のまま。
- 削った配列を `QueryCache`（`findManyByFilter` の鍵）に入れない。入れると、次に駅を替えたとき欠けた列車が出る（summary 106）。
- 全線時刻表・運用表も、この plan に入れる（ユーザー判断・2026-11-16）。3 ページとも、削った配列は「サーバーが描く分」の中身だけを正しく持ち、それ以外の画面（2 ページ目・5 枚目からのカード）は全量が届くまで描かない。
- 全線時刻表・運用表も、見た目は 1 つも変えない（Task 6 で DOM を比べる）。

## 決めたこと

### 駅別時刻表

- 削り方: その駅に停まる列車（`stationTrips` と同じ条件）を 1 本でも持つ trip-block だけを残す。残した block の中の列車は全部残し、各列車の `times` は「`stopSequence` が最小の時刻」「最大の時刻」「その駅の時刻」の 3 つまでにする。脚注（`TimetableStationFindLastStopStationPipe`）は block の各列車の最初と最後の時刻、並べ替え（`sortTrips`）は最初の時刻とその駅の時刻しか読まないため。
- 鍵: `makeStateKey<StationPayload>('timetable-station-trips')`。中身は `{ calendarId, tripDirection, stationId, tripBlocks }`。ブラウザで条件が合わなければ使わずに捨て、通常の取得に回る（全線の `SORTED_ORDER_KEY` と同じ扱い）。
- HttpTransferCache から外す方法: `HttpContextToken<boolean>` の `SKIP_TRANSFER_CACHE` を `core/ssr/` に置き、`isTransferableRequest` がこれを見て false を返す。`TripBlockQuery.findManyByFilter` に `context?: HttpContext` を足して渡す。
- 取り直しの時: 鍵を使った回だけ、`afterNextRender` のあと `requestIdleCallback`（無ければ `setTimeout(0)`）で `fetchTrips()` を `forceReload` 無しで呼ぶ。HTTP の応答は ブラウザの private キャッシュ（1 時間）に当たることがある。取り直しの前に利用者が駅を替えたら、その取り直しは通常の取得と同じ流れなので、別の扱いは要らない。

### 全線時刻表

- サーバーが描くのは、並べ替えた列の 1 ページ目（既定の 10 本）だけ。ページ送りの件数（「1 – 10 / 全 N 本」）は全体の本数を出す。
- 削り方: サーバーで並べ替えた順（`SORTED_ORDER_KEY` に積んでいる ID の列）の先頭 `pageSize` 本の trip-block だけを残す。残した block の中身（列車と全駅の時刻）は削らない。全線の表は 1 本ごとに全駅の時刻を出すため。
- 鍵: `makeStateKey<AllLinePayload>('timetable-all-line-trips')`。中身は `{ calendarId, tripDirection, pageSize, listedCount, tripBlocks }`。`listedCount` は絞り込み前の全体の本数で、ページ送りの件数に使う。並び順の鍵（`SORTED_ORDER_KEY`）は今のまま残す。
- ブラウザで使う条件: 暦・方向が合い、端末に保存したページの設定（`pageSize`・`pageIndex`）が既定の 1 ページ目と同じで、路線の絞り込みが無いとき。どれかが違えば鍵を捨てて全量を取る（サーバーと違う画面になるので、どのみち描き直しになる）。
- 鍵を使っている間（全量が届くまで）は、ストアに `isPartial: true` を立て、ページ送り・路線の絞り込み・方向の切り替えを押せても描き替えず、今の読み込み中の表示を出す。全量は hydration の直後に取り始める（idle を待たない。2 ページ目を早く押されても待ちを短くするため）。

### 運用表

- サーバーが中身まで描くのは、運用番号の順の先頭 4 枚（`SERVER_RENDERED_CARDS`）だけ。5 枚目からは場所取りで、その高さ（`placeholderHeight`）は各列車の `tripId`・`tripDirection`・`depotIn`・`depotOut` と `tripOperationListId` しか読まない。
- 削り方: 先頭 4 枚の運用はそのまま残す。5 枚目からの運用は、列車の数と並びを保ったまま、各列車を上の 5 項目だけにする（`times` などを落とす）。運用そのもの（番号・群）は全部残す。絞り込みのチップと場所取りの高さに要るため。
- 鍵: `makeStateKey<OperationTablePayload>('operation-table-trips')`。中身は `{ calendarId, operationTrips }`。
- 鍵を使っている間は、ストアに `isPartial: true` を立て、5 枚目からのカードは場所取りのまま描かない（`@defer` の中で `isPartial()` が false になるまで待つ）。端末に保存した運用群の選択で、サーバーと違うカードが先頭に来る場合も、先頭 4 枚に入っていない運用は同じく待つ。全量は hydration の直後に取り始める。
- 圏外用の保存（`withOfflineSnapshots`）は、全量が届いてからにする（3 ページ共通）。

## Review Focus

- 鍵の中身が条件（暦・方向・駅）と合わない HTML（CDN の古い HTML、URL の書き換え）で開いたとき、削った配列で描かずに全量を取ること。
- 取り直しが終わる前に駅を替えたとき、欠けた列車の行が出ないこと（削った配列が `QueryCache` に入っていないこと）。
- 0 時台（`departureDays` 2）の列車の行と脚注が、削る前と同じ順・同じ行き先になること。
- 書き込みの後 1 時間（`cache: 'reload'`）は、今と同じく TransferState を使わずに取り直すこと。
- 圏外用の保存（`withOfflineSnapshots`）が、削った配列でなく全量を保存すること（取り直しの前に保存しない）。
- 全線で、全量が届く前に 2 ページ目・路線の絞り込み・方向の切り替えを押したとき、欠けた列で描かず、届いてから正しい列を出すこと。
- 運用表で、端末に保存した運用群の選択が既定と違うとき、先頭 4 枚に入っていないカードを削った列車で描かないこと。

---

### Task 1: 削る関数

**Files:**

- Create: `src/app/pages/timetable/timetable-station/utils/prune-station-trip-blocks.util.ts`
- Test: 同じ名前の `.spec.ts`

**Interfaces:**

- Produces: `pruneStationTripBlocks(tripBlocks: readonly TripBlockDetailsDto[], stationId: string, tripDirection: number): TripBlockDetailsDto[]`

- [ ] **Step 1: spec を書く**
    - その駅に停まる列車を持たない block を落とす。
    - 残した block の列車は全部残り、各列車の `times` は最初・最後・その駅の 3 つ以下（同じ時刻が重なれば 1 つ）。
    - 削った結果に `stationTrips` をかけた結果が、削る前にかけた結果と同じ列車 ID の並びになる（横浜・上りに近い fixture と、0 時台の列車を含む fixture）。
    - 削った結果を `TimetableStationFindLastStopStationPipe` に通した行き先が、削る前と同じ。
- [ ] **Step 2: 落ちることを確かめる** — `npx jest --testPathPatterns=prune-station-trip-blocks`
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通ることを確かめる**
- [ ] **Step 5: コミット** `perf: :zap: 駅別時刻表で描く分だけに運行を削る関数を足す`

### Task 2: サーバーで削って積み、ブラウザで使って取り直す

**Files:**

- Create: `src/app/core/ssr/skip-transfer-cache.ts`（`SKIP_TRANSFER_CACHE`）
- Modify: `src/app/core/ssr/transfer-cache-filter.ts`・`.spec.ts`
- Modify: `src/app/libs/trip-block/infrastructure/queries/trip-block.query.ts`（`context` を受ける）と usecase の service
- Modify: `src/app/pages/timetable/timetable-station/services/timetable-station.service.ts`・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.ts`（取り直しの起動）

**Interfaces:**

- Consumes: `pruneStationTripBlocks`
- Produces: `TimetableStationService.fetchTrips(): Observable<void>`（形は今と同じ）と、`TimetableStationService.usedTransferredTrips(): boolean`（今回の描画で鍵を使ったか）

- [ ] **Step 1: spec を書く**
    - `isTransferableRequest` は `SKIP_TRANSFER_CACHE` が true の要求で false。
    - サーバー（`PLATFORM_ID` が server）の `fetchTrips` は、全量を取ってストアに入れ、削った配列を鍵に積む。
    - ブラウザで鍵が条件と合えば、HTTP を出さずに削った配列でストアを埋め、鍵を消し、`usedTransferredTrips()` が true。
    - 条件が合わなければ鍵を消して通常の取得をする。
    - 書き込みの後（`requestCache('timetable')` が `'reload'`）は鍵を見ない。
    - 削った配列で埋めたあと `QueryCache` の `findManyByFilter` の鍵が空のまま（次の `fetchTrips` は HTTP を出す）。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: 実装する**（コンポーネントは `usedTransferredTrips()` が true のときだけ idle で `fetchTrips()` を呼び、圏外用の保存はその取り直しが成功したあとに行う）
- [ ] **Step 4: 関係する spec・lint・`tsc -p tsconfig.app.json` が通ることを確かめる**（jest は全体を流さず `--findRelatedTests` で流す）
- [ ] **Step 5: コミット** `perf: :zap: 駅別時刻表の SSR に描く分の運行だけを積む`

### Task 3: 見た目と大きさを確かめ、ADR を書く

**Files:**

- Create: `docs/adr/0024-station-ssr-payload.md`

- [ ] **Step 1: 手元の SSR（`npm run build:dev` と `node dist/.../server.mjs`）で、横浜・上り・平日の HTML を変更の前後で取り、`<script id="ng-state">` の大きさを記録する（目標: 2.42MB → 0.3MB 未満）。**
- [ ] **Step 2: 同じ URL を Playwright で開き、hydration の直後と取り直しの後の `main` の `innerText` が、変更前の本番と同じであることを確かめる。390px と 1440px のスクリーンショットを並べて差が無いことを見る。**
- [ ] **Step 3: 駅を 3 回替え、そのたびに trip-blocks の要求が 0 か 1 本であることをネットワークの記録で確かめる。**
- [ ] **Step 4: ADR を書く（決めたこと・削り方・鍵の扱い）。全線と運用表は Task 6 で同じ ADR に足す。**
- [ ] **Step 5: コミット** `docs: :memo: 駅別時刻表の SSR に積む量の ADR を足す`

### Task 4: 全線時刻表で 1 ページ目だけを積む

**Files:**

- Create: `src/app/pages/timetable/timetable-all-line/utils/prune-all-line-trip-blocks.util.ts`・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/stores/timetable-all-line.store.ts`（`isPartial`・`listedCount` の扱い）・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/services/timetable-all-line.service.ts`・`.spec.ts`
- Modify: `src/app/pages/timetable/timetable-all-line/timetable-all-line.component.ts`（全量の取得の起動）

**Interfaces:**

- Consumes: Task 2 の `SKIP_TRANSFER_CACHE`
- Produces: `pruneAllLineTripBlocks(sorted: readonly TripBlockDetailsDto[], pageSize: number): TripBlockDetailsDto[]` と、ストアの `isPartial(): boolean`

- [ ] **Step 1: spec を書く**
    - `pruneAllLineTripBlocks` は並べた順の先頭 `pageSize` 本を、中身を削らずに返す。
    - サーバーの取得は、全量でストアを埋め、並べた先頭 10 本と `listedCount` を鍵に積む。
    - ブラウザで条件（暦・方向・`pageSize` が 10・`pageIndex` が 0・路線の絞り込みなし）が合えば、HTTP を出さずに削った配列で埋め、`isPartial()` が true、ページ送りの件数が `listedCount`。
    - 条件が 1 つでも違えば鍵を捨てて全量を取る。
    - `isPartial()` の間に `pageIndex` を 1 にしても、`pagedTrips` は空で読み込み中の表示になる。全量が届くと 11〜20 本目が出る。
    - 削った配列が `QueryCache` に入っていない。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: 実装する**（全量は hydration の直後に取り始める）
- [ ] **Step 4: 関係する spec・lint・`tsc -p tsconfig.app.json` が通ることを確かめる**（jest は `--findRelatedTests` で流す）
- [ ] **Step 5: コミット** `perf: :zap: 全線時刻表の SSR に 1 ページ目の運行だけを積む`

### Task 5: 運用表で 5 枚目からの列車を削って積む

**Files:**

- Create: `src/app/pages/operation/operation-table/utils/prune-operation-trips.util.ts`・`.spec.ts`
- Modify: `src/app/pages/operation/operation-table/stores/operation-table.store.ts`（`isPartial`）・`.spec.ts`
- Modify: `src/app/pages/operation/operation-table/services/operation-table.service.ts`・`.spec.ts`
- Modify: `src/app/pages/operation/operation-table/operation-table.component.ts`・`.html`（5 枚目からは `isPartial()` の間は場所取りのまま）

**Interfaces:**

- Consumes: Task 2 の `SKIP_TRANSFER_CACHE`
- Produces: `pruneOperationTrips(sorted: readonly OperationTripsDto[], keep: number): OperationTripsDto[]` と、ストアの `isPartial(): boolean`

- [ ] **Step 1: spec を書く**
    - `pruneOperationTrips` は先頭 `keep` 本の運用をそのまま返し、残りの運用は列車の数と並びを保って各列車を 5 項目（`tripId`・`tripDirection`・`depotIn`・`depotOut`・`tripOperationListId`）にする。
    - 削った運用の `placeholderHeight` が、削る前と同じ値になる（実データに近い fixture で全運用を比べる）。
    - ブラウザで暦が合えば、HTTP を出さずに削った配列で埋め、`isPartial()` が true。合わなければ鍵を捨てて全量を取る。
    - `isPartial()` の間は、先頭 4 枚に入っていないカードを描かない（運用群を既定と違う選択にした fixture でも同じ）。
    - 削った配列が `QueryCache` に入っていない。
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 関係する spec・lint・`tsc -p tsconfig.app.json` が通ることを確かめる**
- [ ] **Step 5: コミット** `perf: :zap: 運用表の SSR に描くカードの分の列車だけを積む`

### Task 6: 全線と運用表の見た目と大きさを確かめ、ADR に足す

- [ ] **Step 1: 手元の SSR で、全線（下り）と運用表（平日）の HTML を変更の前後で取り、ng-state の大きさを記録する（目標: 全線 2.47MB → 0.4MB 未満、運用表 1.26MB → 0.4MB 未満）。**
- [ ] **Step 2: Playwright で、hydration の直後と全量が届いた後の `main` の `innerText` が変更前と同じであることを、390px と 1440px で確かめる。全線は 2 ページ目を、運用表は一番下までスクロールして、全量が届いてから正しい中身が出ることも見る。**
- [ ] **Step 3: `docs/adr/0024-station-ssr-payload.md` に全線と運用表の決めたことを足し、題を「SSR に積む量」に改める。**
- [ ] **Step 4: コミット** `docs: :memo: 全線時刻表と運用表の SSR に積む量を ADR に足す`
