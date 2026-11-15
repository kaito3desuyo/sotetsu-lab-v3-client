# 駅別時刻表の SSR の HTML を軽くする Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 駅別時刻表の SSR の HTML に、方向ぶんの全 trip-blocks（ng-state 2.19MB）でなく、その駅の行と脚注に要る分だけを積み、初回の JS の開始を早める。

**Architecture:** サーバーでは trip-blocks の GET を HttpTransferCache から外し、描画に要る分だけに削った配列を専用の TransferState の鍵に積む。ブラウザは hydration でその鍵を使って同じ HTML を描き、描き終えたあとの idle に通常の経路で全量を取り直して入れ替える。削った配列は QueryCache にも「全量」としても入れない。

**Tech Stack:** Angular 22（SSR・TransferState・HttpContext）、NgRx SignalStore、Jest。

**Spec:** 無し。根拠は `.context/review-2026-11-12/fable-performance.md` の P4（親リポ）と summary.md の 3 段「ng-state を削る」。spec を置かない代わりに、決めたことをこの plan と ADR に書く。

## Global Constraints

- 駅別時刻表はロック済みのページ。画面の見た目と行の中身は 1 つも変えない（Task 3 で DOM を比べる）。
- 駅を切り替えたときの取得は、今と同じく方向ぶんの trip-blocks の 1 本（キャッシュがあれば 0 本）のまま。
- 削った配列を `QueryCache`（`findManyByFilter` の鍵）に入れない。入れると、次に駅を替えたとき欠けた列車が出る（summary 106）。
- 全線時刻表・運用表は、この plan に入れない（駅別の効き目を本番で測ってから決める）。

## 決めたこと

- 削り方: その駅に停まる列車（`stationTrips` と同じ条件）を 1 本でも持つ trip-block だけを残す。残した block の中の列車は全部残し、各列車の `times` は「`stopSequence` が最小の時刻」「最大の時刻」「その駅の時刻」の 3 つまでにする。脚注（`TimetableStationFindLastStopStationPipe`）は block の各列車の最初と最後の時刻、並べ替え（`sortTrips`）は最初の時刻とその駅の時刻しか読まないため。
- 鍵: `makeStateKey<StationPayload>('timetable-station-trips')`。中身は `{ calendarId, tripDirection, stationId, tripBlocks }`。ブラウザで条件が合わなければ使わずに捨て、通常の取得に回る（全線の `SORTED_ORDER_KEY` と同じ扱い）。
- HttpTransferCache から外す方法: `HttpContextToken<boolean>` の `SKIP_TRANSFER_CACHE` を `core/ssr/` に置き、`isTransferableRequest` がこれを見て false を返す。`TripBlockQuery.findManyByFilter` に `context?: HttpContext` を足して渡す。
- 取り直しの時: 鍵を使った回だけ、`afterNextRender` のあと `requestIdleCallback`（無ければ `setTimeout(0)`）で `fetchTrips()` を `forceReload` 無しで呼ぶ。HTTP の応答は ブラウザの private キャッシュ（1 時間）に当たることがある。取り直しの前に利用者が駅を替えたら、その取り直しは通常の取得と同じ流れなので、別の扱いは要らない。

## Review Focus

- 鍵の中身が条件（暦・方向・駅）と合わない HTML（CDN の古い HTML、URL の書き換え）で開いたとき、削った配列で描かずに全量を取ること。
- 取り直しが終わる前に駅を替えたとき、欠けた列車の行が出ないこと（削った配列が `QueryCache` に入っていないこと）。
- 0 時台（`departureDays` 2）の列車の行と脚注が、削る前と同じ順・同じ行き先になること。
- 書き込みの後 1 時間（`cache: 'reload'`）は、今と同じく TransferState を使わずに取り直すこと。
- 圏外用の保存（`withOfflineSnapshots`）が、削った配列でなく全量を保存すること（取り直しの前に保存しない）。

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
- [ ] **Step 4: 全 jest・lint・`tsc -p tsconfig.app.json` が通ることを確かめる**
- [ ] **Step 5: コミット** `perf: :zap: 駅別時刻表の SSR に描く分の運行だけを積む`

### Task 3: 見た目と大きさを確かめ、ADR を書く

**Files:**

- Create: `docs/adr/0024-station-ssr-payload.md`

- [ ] **Step 1: 手元の SSR（`npm run build:dev` と `node dist/.../server.mjs`）で、横浜・上り・平日の HTML を変更の前後で取り、`<script id="ng-state">` の大きさを記録する（目標: 2.42MB → 0.3MB 未満）。**
- [ ] **Step 2: 同じ URL を Playwright で開き、hydration の直後と取り直しの後の `main` の `innerText` が、変更前の本番と同じであることを確かめる。390px と 1440px のスクリーンショットを並べて差が無いことを見る。**
- [ ] **Step 3: 駅を 3 回替え、そのたびに trip-blocks の要求が 0 か 1 本であることをネットワークの記録で確かめる。**
- [ ] **Step 4: ADR を書く（決めたこと・削り方・鍵の扱い・全線と運用表を入れなかった理由）。**
- [ ] **Step 5: コミット** `docs: :memo: 駅別時刻表の SSR に積む量の ADR を足す`
