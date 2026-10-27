# SSR 2b 圏外の保存と Service Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一度見たページ（SSR で初めて開いたページを含む）を、圏外でも保存した中身で出し、そのことを利用者に知らせる。

**Architecture:** ブラウザが自分で取るデータは Service Worker（`ngsw-config.json` の `dataGroups`）が保存する。ページの中身は、取得に成功したときに「ページの保存」（`core/offline/`）が条件と時刻を添えて localforage に 1 件書き、取得に失敗して条件が合うときだけストアに戻して知らせる。起動時には戻さない。`ssr: false` のまま出せる。

**Tech Stack:** Angular 22・`@ngneat/elf`・`@ngneat/elf-persist-state` 1.2.1・localforage 1.10・`@angular/service-worker`・Jest 30

**Spec:** `docs/superpowers/specs/2026-10-12-ssr-design.md` の 15 章（7 章の具体化）。現状の調べ: リポジトリ外の作業メモ `../.context/ssr-plan/2b-store-survey.md`（file:line つき）

## Global Constraints

- ページの中身は **起動時に戻さない**。取得に失敗し、保存した条件が今の条件と合うときだけ戻す（spec 15.2）
- 保存はページごとに最新の 1 件。保存の失敗は握りつぶし、次の成功でまた保存する。保存した形には版（`OFFLINE_SNAPSHOT_VERSION = 1`）を付け、版が違えば捨てる
- サーバー（`isPlatformServer`）では保存も読み込みもしない（何もせず返す）
- 戻したら全ページ共通の文言で知らせる: `通信できないため、{時刻}に保存した内容を表示しています`（action は `OK`）。{時刻} は保存した日が今日なら `H時m分`、違えば `M月d日 H時m分`（時刻帯は端末のまま）
- 画面の設定（real-time の 5 項目・全線とダイヤグラムの畳み状態・運用表の運用群・ダッシュボードの `hasVisitedBefore`）は今のまま `persistState` で起動時に戻す
- Service Worker（spec 15.2）: 目撃と現在位置は `timeout: "10s"`、それ以外の `https://api.sotetsu-lab.com/v3/` は `timeout: "3s"`・`maxAge: "7d"`・`maxSize: 50`。どれも `freshness`。目撃の組を先に書く。BFF（`/api/**`）の組は今のまま
- 新しい部品は役目のディレクトリに置き、`Service` を名前に付けない。引数が 2 つを超えるときはオブジェクトで渡す
- テストの流し方（手元の Node は 24.22.0 だけで、mise.toml は 22.23.3 を指す。勝手に 22 を入れない）:
  `PATH=$HOME/.local/share/mise/installs/node/24.22.0/bin:$PATH MISE_DISABLE_TOOLS=node node node_modules/jest/bin/jest.js --testPathPatterns=<spec>`
- コミットは Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。署名が要るのでサンドボックスの外でコミットする

## Review Focus

1. 別の条件（別の駅・別のダイヤ・別の運用）で保存した中身を、今の URL のページに出してしまう → 条件が 1 つでも違えば戻さない（Task 1・各ページのテスト）
2. SSR のサーバーで `fetchData` が走ったときに localforage を触って落ちる・待ち続ける → サーバーでは即座に何もしない（Task 1）
3. 運用表・ダッシュボードの IndexedDB に残っている「丸ごと保存」の古い値が、起動時に中身（列車・目撃）としてストアに戻る → 設定の項目以外は読み込み時に捨てる（Task 6・Task 8）
4. real-time の自動更新（1 秒ごとの判定・ソケット・再読み込み）の失敗のたびに戻して知らせ、知らせが出続ける → 戻すのはページを開いたときの `fetchData` の失敗だけ（Task 8）
5. 保存の失敗（容量超過など）で例外が漏れる、または以後保存されなくなる → 握りつぶし、次の保存は通る（Task 1）

---

### Task 1: ページの保存と知らせ（core/offline）

**Files:**
- Create: `src/app/core/offline/offline-snapshots.ts`
- Create: `src/app/core/offline/offline-snapshots.spec.ts`
- Create: `src/app/core/offline/format-saved-at.util.ts`
- Create: `src/app/core/offline/format-saved-at.util.spec.ts`

**Interfaces:**
- Produces:
  - `export const OFFLINE_SNAPSHOT_VERSION = 1;`
  - `export type OfflineConditions = Readonly<Record<string, string | number | boolean | null>>;`
  - `export interface OfflineSnapshot<T> { version: number; conditions: OfflineConditions; savedAt: number /* epoch ミリ秒 */; data: T; }`
  - `@Injectable({ providedIn: 'root' }) export class OfflineSnapshots`
    - `save<T>(params: { key: string; conditions: OfflineConditions; data: T }): Promise<void>` — localforage の `offline-snapshot:<key>` に書く。失敗は握りつぶす。サーバーでは何もしない
    - `restore<T>(params: { key: string; conditions: OfflineConditions; apply: (data: T) => void }): Promise<OfflineSnapshot<T> | null>` — 読み、版と条件（キーの集合と値がすべて一致）が合えば `apply(data)` を呼び、`'通信できないため、' + formatSavedAt(savedAt, Date.now()) + 'に保存した内容を表示しています'` を `NotificationService.open(…, 'OK')` で出して返す。合わない・無い・読めない・サーバーなら何もせず `null`
  - `export function formatSavedAt(savedAt: number, now: number): string`

- [ ] **Step 1: 失敗するテストを書く**（localforage は `jest.mock('localforage')` で `getItem`/`setItem` を差し替え、`PLATFORM_ID` は `'browser'`／`'server'` を TestBed で渡す）
  - `formatSavedAt`: 同じ日 `new Date(2026, 9, 26, 21, 5).getTime()` と `now = new Date(2026, 9, 26, 23, 0)` → `'21時5分'`。前の日 `new Date(2026, 9, 25, 7, 30)` → `'10月25日 7時30分'`
  - `save は条件と時刻と版を添えて offline-snapshot:<key> に書く`: `setItem` が `('offline-snapshot:Foo', { version: 1, conditions: { calendarId: 'c1' }, savedAt: <now>, data: { a: 1 } })` で呼ばれる
  - `save は setItem の失敗を投げず、次の save はまた書く`: 1 回目 reject → `await expect(save(...)).resolves.toBeUndefined()`、2 回目で `setItem` が 2 回呼ばれている
  - `restore は条件が合えば apply と知らせを呼ぶ`: `apply` が `{ a: 1 }` で 1 回、`open` が `('通信できないため、21時5分に保存した内容を表示しています', 'OK')` で 1 回
  - `restore は条件の値が 1 つでも違えば何もしない`（`{ calendarId: 'c2' }`）・`条件のキーが違えば何もしない`（`{ calendarId: 'c1', stationId: 's1' }`）・`版が違えば何もしない`（`version: 0`）・`getItem が reject しても null`・`保存が無ければ null` — どれも `apply` と `open` は 0 回
  - `サーバーでは save も restore も localforage に触らない`
- [ ] **Step 2: テストを流して落ちることを確かめる** — `--testPathPatterns=src/app/core/offline` で FAIL（モジュールが無い）
- [ ] **Step 3: 実装する** — localforage は既定のインスタンス（`main.ts` で `elf_state` に設定済み）をそのまま使う。サーバー判定は `isPlatformServer(inject(PLATFORM_ID))`
- [ ] **Step 4: テストを流して通ることを確かめる** — 同じコマンドで PASS
- [ ] **Step 5: コミット** — `feat: :sparkles: 取得に成功したページの中身を保存し、失敗したときだけ戻して知らせる部品を足す`

### Task 2: Service Worker にデータの API を足す

**Files:**
- Modify: `ngsw-config.json`（`dataGroups`）
- Create: `src/ngsw-config.spec.ts`

**Interfaces:** なし（設定だけ）

- [ ] **Step 1: 失敗するテストを書く** — `ngsw-config.json` を `readFileSync` で読み、次を確かめる
  - `dataGroups[0]` は `name: 'api-sightings'`・`urls` に `'https://api.sotetsu-lab.com/v3/operation-sightings/**'` と `'https://api.sotetsu-lab.com/v3/operations/current-positions'`・`cacheConfig: { strategy: 'freshness', timeout: '10s', maxAge: '1d', maxSize: 50 }`
  - `dataGroups[1]` は `name: 'api-data'`・`urls: ['https://api.sotetsu-lab.com/v3/**']`・`cacheConfig: { strategy: 'freshness', timeout: '3s', maxAge: '7d', maxSize: 50 }`
  - `dataGroups[2]` は今の `name: 'api'`（`/api/**`）のまま
- [ ] **Step 2: 落ちることを確かめる**
- [ ] **Step 3: `ngsw-config.json` を直す**（目撃の組の `maxAge` は 1 日。古い目撃を長く持っても役に立たないため）
- [ ] **Step 4: 通ることを確かめる**。あわせて `node_modules/.bin/ngsw-config` が通る形かは Task 10 の本番ビルドで確かめる
- [ ] **Step 5: コミット** — `feat: :sparkles: Service Worker にデータの API を保存させる`

### Task 3〜9 の共通の形（各ページ）

各ページで次の 3 つを行う。条件・中身の項目・キーはタスクごとに書く。

1. ストアに `snapshot(): <Page>Snapshot` と `restoreSnapshot(data: <Page>Snapshot): void` を足す（`<Page>Snapshot` は `Pick<StoreProps, …中身の項目>`）
2. ページの `fetchData` で、取得がすべて成功したら `void this.#offlineSnapshots.save({ key, conditions, data: Store.snapshot() })`。1 本でも失敗したら、読み込み中を解く前に `await this.#offlineSnapshots.restore({ key, conditions, apply: (data) => Store.restoreSnapshot(data) })`。そのあとの `throw` などの今の動きは変えない
3. テスト（そのページの component spec に足す）: `成功したら条件と中身を保存する`・`失敗したら保存した中身を戻す`（`OfflineSnapshots` を差し替え、`restore` に渡した `conditions` と、`apply` を呼んだ後のストアの中身を確かめる）

`fetchSeq` で古い取得を捨てているページは、古い取得の失敗では戻さない（`seq === fetchSeq` のときだけ restore）。

### Task 3: 駅別時刻表

**Files:** Modify `src/app/pages/timetable/timetable-station/stores/timetable-station.store.ts`・`timetable-station.component.ts`・`timetable-station.component.spec.ts`

- key `'TimetableStation'`・条件 `{ calendarId, stationId, tripDirection }`・中身 `calendar, trips, tripBlocks, tripClasses, stations, operations`（充当編成の `operationSightingTimeCrossSections` は「今日」で変わるので入れない）
- [ ] Step 1 テストを書く → Step 2 FAIL → Step 3 実装 → Step 4 PASS → Step 5 コミット `feat: :sparkles: 駅別時刻表を圏外でも保存した中身で出す`

### Task 4: 全線時刻表

**Files:** Modify `src/app/pages/timetable/timetable-all-line/stores/timetable-all-line.store.ts`・`timetable-all-line.component.ts`・`.spec.ts`

- key `'TimetableAllLine'`・条件 `{ calendarId, tripDirection }`・中身 `stations, agencies, routeOrder, tripBlocks`
- 戻した後に `initializeSelectedRouteIds()` を呼ぶ（成功時と同じく路線の選択を中身に合わせる）
- 畳み状態の `persistState` は触らない
- [ ] Step 1〜5（コミット `feat: :sparkles: 全線時刻表を圏外でも保存した中身で出す`）

### Task 5: 運用行路図

**Files:** Modify `src/app/pages/operation/operation-route-diagram/stores/operation-route-diagram.store.ts`・`operation-route-diagram.component.ts`・`.spec.ts`

- key `'OperationRouteDiagram'`・条件 `{ operationId }`・中身 `operationTrips, itineraryLinks, stations, stationAliases`
- 戻すのは `allSettled` の結果に失敗があるときで、`initializeSelectedRouteIds()` の前に戻す
- [ ] Step 1〜5（コミット `feat: :sparkles: 運用行路図を圏外でも保存した中身で出す`）

### Task 6: 運用表（丸ごと保存をやめて寄せる）

**Files:** Modify `src/app/pages/operation/operation-table/stores/operation-table.store.ts`・`operation-table.component.ts`・`.spec.ts`

- key `'OperationTable'`・条件 `{ calendarId }`・中身 `calendar, operationTrips, itineraryLinks, stations, tripClasses`
- `persistState` は `selectedGroupNames` だけを保存し（全線の畳み状態と同じ `source`）、`preStoreInit` で読み込んだ値から `selectedGroupNames` 以外を捨てる（IndexedDB に残る丸ごと保存の古い値を戻さない。real-time の `pickPersistedProps` と同じ考え）
- `fetchData` のコメント「ストアは通信断に備えて全体を保存しており…」を今の動きに書き直す
- テストを 1 本足す: `丸ごと保存の古い値を読み込んでも、運用群以外はストアに入らない`（`preStoreInit` に `{ selectedGroupNames: ['1群'], operationTrips: [x] }` を渡して `{ …, selectedGroupNames: ['1群'] }` だけが残る）
- [ ] Step 1〜5（コミット `refactor: :recycle: 運用表の中身を起動時に戻さず、取得に失敗したときだけ戻す`）

### Task 7: 過去の運用情報・列車ダイヤグラム

**Files:** Modify `src/app/pages/operation/operation-past-time/stores/operation-past-time.store.ts`・`operation-past-time.component.ts`・`.spec.ts`、`src/app/pages/train-diagram/stores/train-diagram.store.ts`・`train-diagram.component.ts`・`.spec.ts`

- 過去の運用: key `'OperationPastTime'`・条件 `{ referenceDate, days, includeInvalidated }`・中身 `calendars, operations, formations, operationSightings`
- ダイヤグラム: key `'TrainDiagram'`・条件 `{ calendarId, routeIds: [...selectedRouteIds].sort().join(',') }`・中身 `networkStations, routeStations, tripClasses, tripBlocksByDirection, itineraryLinks`。戻すのは `flags.refetchTripBlocks` の取得の失敗だけ。戻したら `#firstLoadDone` は true にしない（次に通信できたら取り直す）
- [ ] Step 1〜5 をページごとに（コミット 2 本 `feat: :sparkles: 過去の運用情報を圏外でも保存した中身で出す`・`feat: :sparkles: 列車ダイヤグラムを圏外でも保存した中身で出す`）

### Task 8: real-time とダッシュボード

**Files:** Modify `src/app/pages/operation/operation-real-time/stores/operation-real-time.store.ts`・`operation-real-time.component.ts`・`.spec.ts`、`src/app/pages/dashboard/stores/dashboard.store.ts`・`dashboard.component.ts`・`.spec.ts`

- real-time: key `'OperationRealTime'`・条件 `{}`・中身 `routes, agencyOrder, stations, tripClasses, calendar, operations, itineraryLinks, formations, operationGroups, operationSightingTimeCrossSections, formationSightingTimeCrossSections, operationSightingHistories, formationSightingHistories, currentPositions`
  - 保存は `fetchData` の 12 本がすべて成功したとき。戻すのは `fetchData` の `catch` だけで、戻せたら `'データの取得に失敗しました'` の代わりにページの保存の知らせになる（戻せなければ今の文言のまま）
  - `restoreSnapshot` は `finalUpdateTime` を `Math.floor(savedAt / 1000)` にする（「最終更新」に保存した時刻を出す。spec 15.2）→ `restoreSnapshot(data, savedAt)` の形にし、`apply` から渡す
  - 自動更新・ソケット・再読み込みボタンの失敗では戻さない
  - テストを 1 本足す: `自動更新の取得が失敗しても戻さず知らせない`
- ダッシュボード: key `'Dashboard'`・条件 `{}`・中身 `todaysCalendar, todaysDayName, runningTripCount, sightingCountToday, latestSightings, latestSightingPositions, itineraryLinks, tripClasses`
  - `persistState` は `hasVisitedBefore` だけを保存し、`preStoreInit` でほかを捨てる（Task 6 と同じ。テストも同じ形で 1 本）
  - 今は `try/finally` で失敗を投げっぱなしにしている。`catch` で戻してから投げ直す
- [ ] Step 1〜5 をページごとに（コミット 2 本 `feat: :sparkles: real-time を圏外でも保存した中身で出し、最終更新に保存した時刻を出す`・`refactor: :recycle: ダッシュボードの中身を起動時に戻さず、取得に失敗したときだけ戻す`）

### Task 9: 決めごとを残す

**Files:**
- Create: `docs/adr/0015-offline-snapshots.md`（ほかの ADR の見出しの形にそろえる）
- Modify: `CLAUDE.md` の「ストア」の節の「永続化が必要な場合は…」の 1 文

- [ ] **Step 1: ADR を書く** — 文脈（15.1 の実測）・決定（15.2 の 4 項目）・退けた案（起動時に戻す＝hydration がずれる・古い中身が一瞬出る／部品の保存の仕組み＝一度失敗すると止まる・起動直後 1 秒を落とす）・結果（ページごとに 1 件・SSR の後もそのまま使える）
- [ ] **Step 2: CLAUDE.md を直す** — 「画面の設定は `persistState`、取ったデータは `core/offline/offline-snapshots.ts`（取得に失敗したときだけ戻す。ADR-0015）」
- [ ] **Step 3: コミット** — `docs: :memo: 圏外の保存の決めごとを ADR と CLAUDE.md に残す`

### Task 10: 全体の確かめ（実装を任せた側が行う）

- [ ] **Step 1: jest・lint・本番ビルド** — jest 全件 PASS・`ng lint` 0 件（サンドボックス外）・`ng build -c production` が通り、`dist/…/browser/ngsw.json` の `dataGroups` に 3 組あること
- [ ] **Step 2: 圏外の実地確認（Playwright・本番ビルドを手元で配る）** — `dist/…/browser` を `index.html` に寄せる静的サーバーで `http://localhost:<port>` に配り、本番の API・BFF への CORS は Playwright の `context.route` で中継する
  1. 駅別・全線・運用表・real-time・行路図・過去の運用・ダイヤグラム・トップを一度開く → Service Worker が制御するまで待つ
  2. `context.setOffline(true)` で同じ URL を開き直す → 中身が出ること・知らせが出ること・real-time の「最終更新」が保存した時刻であること
  3. 別の駅の URL を圏外で開く → 保存した駅の中身が出ないこと
  4. `caches` に `api.sotetsu-lab.com/v3/` の応答が入っていること。目撃（`no-store`）も入るかを記録する（入らなければ real-time の目撃はページの保存だけが頼り＝それで足りることを確かめる）
- [ ] **Step 3: 通信できるときの見た目が今と変わらないこと** — 上の 8 ページを通信ありで開き、本文の長さと画面を今の本番と比べる
