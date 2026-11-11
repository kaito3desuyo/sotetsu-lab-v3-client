# M12 編成別時刻表 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1 編成のある日の列車と各駅の時刻を 1 画面に並べる「編成別時刻表」（`/timetable/formation`）を作る。

**Architecture:** api は変えない。今ある目撃・time-cross-section・運用の列車・乗り移りの 4 つのエンドポイントから、ページの service が材料を集める。列車の並びは純粋関数の util で組み立てる。ページの構成は駅別時刻表（`pages/timetable/timetable-station/`）にそろえる。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、@ngrx/signals の signalStore、Angular Material、Tailwind（`tw-` 接頭辞）、Jest 30。

**Spec:** `docs/superpowers/specs/2026-11-11-m12-formation-timetable-design.md`

## Global Constraints

- 画面の名前は「編成別時刻表」。route の `data.title` もこれにする。
- URL は `/timetable/formation;formation_number=8713;date=2026-11-11`（マトリクスパラメータ）。`date` を省いたら今日にする。
- ファイルは `src/app/pages/timetable/timetable-formation/` に置く。構成は CLAUDE.md の「標準ページ構成パターン」に従う。
- ページ名の大見出しは置かない。
- 運用番号は `operationNumberColor` パイプの群の色のチップで出す。種別の色は `tripClass.tripClassColor` から取り、画面に色を書かない。
- 推測の運用には「?」を付ける。ダイヤの乗り移りには「?」を付けない。
- 選べる日付は、ダイヤのある過去の日・今日・明日だけ。明後日より先は選べない。
- api には手を入れない。`/v3/` のエンドポイントだけを使う。
- 鉄道の 1 日は 4:00 で区切る（`core/utils/railway-day.ts` の `getRailwayDate`）。
- 画面に出す文は natural-japanese と yomiyasu で推敲してから入れる（memory: feedback_polish_ui_copy）。
- テストは `npx jest --testPathPatterns=<path>` で流す。

## Review Focus

1. **日付を省いた URL と SSR**: `timetable/formation` は SSR で `LONG` のキャッシュが付く。サーバーで「今日」を決めると、CloudFront が古い日の HTML を返し続ける。日付はブラウザで補い、`router.navigate([...], { replaceUrl: true })` で URL に書く（駅別時刻表の `calendar_id` と同じ）。0:00〜3:59 は前の日にする。→ Task 5 のテスト。
2. **明日の取得がキャッシュに混ざる**: `findOneTimeCrossSectionByFormationNumber` のキャッシュの鍵に `searchTime` が無いと、明日の問い合わせに今日の答えが返る。→ Task 1 のテスト。
3. **乗り移りの輪**: 乗り移りをたどると、すでに通った運用に戻ることがある（spec の「同じ運用に戻ってきたとき」）。通った区間（`tripOperationListId`）を覚えておかないと、終わらない。→ Task 2 のテスト。
4. **同じ番号の編成**: 本番には同じ編成番号の行が 5 組ある。選んだ日に有効な行（`startDate ≤ 日 ≤ endDate`、`endDate` が null なら終わりなし）を選ぶ。→ Task 2 のテスト。
5. **通過駅の済み・残り**: 通過駅は時刻が null。前後の停車駅の時刻で済み・残りを決める。始発の直後や終着の直前の通過でも決まること。→ Task 3 のテスト。

---

## File Structure

```
src/app/libs/operation-sighting/
  infrastructure/queries/operation-sighting.query.ts   （searchTime を足す）
  usecase/operation-sighting.service.ts                （同上）
src/app/core/utils/railway-day.ts                      （toRailwayDateKey を足す）
src/app/pages/operation/operation-past-time/stores/operation-past-time.store.ts
                                                       （toRailwayDateKey を使う形にする）
src/app/pages/timetable/timetable-formation/
  timetable-formation.component.{ts,html}
  timetable-formation.route.ts
  stores/timetable-formation.store.ts
  services/timetable-formation.service.ts
  utils/formation-day.util.ts          （列車の並び・帯・推定・不明を組み立てる）
  utils/formation-station-filter.util.ts（駅で絞る・通る回数）
  utils/select-formation.util.ts       （日付で編成を選ぶ）
  components/timetable-formation-header/
  components/timetable-formation-trip-list/
  components/timetable-formation-station-list/
src/app/pages/timetable/timetable.route.ts             （formation を足す）
src/app/app.routes.server.ts                           （timetable/formation を足す）
src/app/layout/components/sidenav/sidenav.component.html
src/app/layout/page-help/page-help.ts
src/app/pages/guide/guide.component.html
src/app/pages/library/library-vehicle/*.html
src/app/pages/operation/operation-real-time/components/operation-real-time-{operation,formation}-card/*.html
src/sitemap.xml
```

---

### Task 1: time-cross-section に searchTime を足す

**Files:**
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts:186-215`
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts:67-74`
- Test: `src/app/libs/operation-sighting/usecase/operation-sighting.service.spec.ts`

**Interfaces:**
- Produces: `OperationSightingService.findOneTimeCrossSectionByFormationNumber(params: { formationNumber: string; searchTime?: string; forceReload?: boolean }): Observable<OperationSightingTimeCrossSectionDto>`。`searchTime` は ISO 8601 の文字列。省けば今の動きのまま。

- [ ] **Step 1: 失敗するテストを書く**（既存 spec の HttpTestingController の書き方に合わせる）
  - `searchTime を付けると ?searchTime= でリクエストする`: `searchTime: '2026-11-12T12:00:00+09:00'` で呼び、`expectOne` の URL が `/time-cross-section/formation-number/8713` で、`params.get('searchTime')` がその値。
  - `searchTime の有無で別のキャッシュになる`: 同じ編成で searchTime なし → ありの順に購読し、リクエストが 2 本出る。
- [ ] **Step 2: 走らせて失敗を見る** — Run: `npx jest --testPathPatterns=src/app/libs/operation-sighting/usecase/operation-sighting.service.spec.ts` Expected: 新しい 2 本が FAIL。
- [ ] **Step 3: 実装する** — query の `params` に `searchTime` を入れ（キャッシュの鍵になる）、`HttpParams` で値があるときだけ付ける。`operation.query.ts:118-130` の `findOneWithCurrentPosition` と同じ形にする。
- [ ] **Step 4: 走らせて通るのを見る** — Expected: PASS（既存のテストも）。
- [ ] **Step 5: 本番で明日の答えを確かめる** — 8 群の編成 1 本で、明日 12:00 の `searchTime` を付けて `GET /v3/operation-sightings/time-cross-section/formation-number/:n` を呼び、`expectedSighting.operation` が空になるかを見る（Playwright で。memory: feedback_measure_api_via_playwright）。結果を ledger に書く。空にならないなら Task 4 の「明日を選べるか」の決め方を `Ruling:` で直す。
- [ ] **Step 6: コミット** — `feat: :sparkles: 編成の time-cross-section に searchTime を渡せるようにする`

### Task 2: 列車の並びを組み立てる util

**Files:**
- Modify: `src/app/core/utils/railway-day.ts`（`toRailwayDateKey` を足す）
- Modify: `src/app/pages/operation/operation-past-time/stores/operation-past-time.store.ts:94-122`（日付の鍵を `toRailwayDateKey` で出す）
- Create: `src/app/pages/timetable/timetable-formation/utils/select-formation.util.ts`
- Create: `src/app/pages/timetable/timetable-formation/utils/formation-day.util.ts`
- Test: 上の 3 つの `.spec.ts`

**Interfaces:**
- Consumes: `OperationSightingDetailsDto`、`OperationTripsDto`、`OperationItineraryLinkDto`、`FormationDetailsDto`（既存）。
- Produces:
  ```ts
  // core/utils/railway-day.ts
  /** 目撃時刻（ISO）を、日本時間で 4:00 区切りの営業日 'yyyy-MM-dd' にする */
  export function toRailwayDateKey(isoTime: string): string;

  // select-formation.util.ts
  export function selectFormationOnDate(
    formations: FormationDetailsDto[], formationNumber: string, date: string,
  ): FormationDetailsDto | null;

  // formation-day.util.ts
  export type FormationDayBasis =
    | 'sighting' | 'transfer' | 'circulated' | 'carried-over' | 'unknown';
  export type FormationDayRow =
    | { kind: 'trip'; trip: TripOperationListDetailsDto; operationId: string;
        operationNumber: string; estimated: boolean }
    | { kind: 'depot'; label: 'out' | 'in'; stationId: string; time: string }
    | { kind: 'transfer'; from: string; to: string; stationId: string }
    | { kind: 'swap'; sightingTime: string; toOperationNumber: string }
    | { kind: 'unknown'; lastOperationNumber: string;
        evictedBy: { formationNumber: string; sightingTime: string } };
  export interface FormationDayInput {
    formationId: string;
    sightings: OperationSightingDetailsDto[];   // その営業日の全編成の目撃
    firstOperationId: string | null;            // 目撃が無いときの time-cross-section の運用
    tripsByOperationId: Record<string, OperationTripsDto>;
    links: OperationItineraryLinkDto[];
  }
  export function buildFormationDay(input: FormationDayInput): FormationDayRow[];
  /** たどるのに要るのに、まだ tripsByOperationId に無い運用の id。service はこれが空になるまで取りに行く */
  export function missingOperationIds(input: FormationDayInput): string[];
  ```

決まり（spec の「実装の決まり」から写す。テストはこの順に 1 本ずつ書く）:

1. 最初の運用は、その編成の最初の目撃の運用。目撃が無ければ `firstOperationId`。
2. `links` の `next` を日の終わりまでたどる。最初の目撃より前は `previous` をさかのぼる。通った `tripOperationListId` は 2 度たどらない。
3. ある時刻に別の運用で目撃されたら、その時刻を含む列車から目撃の運用に替え、`swap` の帯を入れる。前の目撃との間の列車は `estimated: true`。
4. この編成の最後の目撃より後に、同じ運用で別の編成の目撃があれば、その目撃の時刻を含む列車から先を出さず、`unknown` の行を 1 つ置く。
5. 入出庫は `trip.depotOut` / `trip.depotIn` から `depot` の行にする（日中の入出庫も）。
6. 無効にされた目撃（`invalidation` あり）は使わない。`sightedAsOperation` のある目撃（引き継ぎ）は、その日の運用を決めるのに使う（過去の運用情報と同じ）。

- [ ] **Step 1: `toRailwayDateKey` のテストを書く** — `'2026-11-11T18:59:00Z'`（翌 3:59 JST）→ `'2026-11-11'`、`'2026-11-11T19:00:00Z'`（翌 4:00 JST）→ `'2026-11-12'`。失敗を見て実装し、過去の運用情報の store をこれに置き換える。`operation-past-time.store.spec.ts` が通ったままであることを確かめる。
- [ ] **Step 2: `selectFormationOnDate` のテストを書く** — 同じ `8713` で `{1999-09-01〜2026-11-10}` と `{2026-11-11〜null}` の 2 行。`2026-11-10` は前の行、`2026-11-11` は後の行、番号が無ければ `null`。失敗を見て実装する。
- [ ] **Step 3: `buildFormationDay` のテストを 1 本ずつ書いて、そのつど失敗を見て実装する**
  - `目撃が無ければ firstOperationId の列車を時刻順に並べる`
  - `乗り移りで 16K から 15K に続け、transfer の帯を入れる`（estimated は false）
  - `15:00 に 15K で目撃され、ダイヤで 16K から 15K に移るなら、朝は 16K`
  - `15:40 に 59 で目撃されたら、その時刻を含む列車から 59 に替え、swap の帯を入れる`
  - `目撃と目撃の間の列車は estimated`
  - `15:20 に 8711 が 55 で目撃され、この編成に新しい目撃が無ければ unknown の行を置く`（`evictedBy` が `{ formationNumber: '8711', sightingTime: … }`）
  - `乗り移りで同じ運用に戻っても止まる`（links が A→B→A の輪）
  - `無効にされた目撃は使わない`
  - `入出庫と日中の一時入庫を depot の行にする`
  - `missingOperationIds は乗り移り先で trips の無い運用を返す`
- [ ] **Step 4: 3 つの spec を走らせて通るのを見る** — Run: `npx jest --testPathPatterns=timetable-formation/utils --testPathPatterns=railway-day --testPathPatterns=operation-past-time` Expected: PASS。
- [ ] **Step 5: コミット** — 2 つに分ける。`refactor: :recycle: 営業日の鍵を toRailwayDateKey にまとめる` と `feat: :sparkles: 編成の 1 日の列車の並びを組み立てる`

### Task 3: 駅で絞る util

**Files:**
- Create: `src/app/pages/timetable/timetable-formation/utils/formation-station-filter.util.ts`
- Test: 同名の `.spec.ts`

**Interfaces:**
- Consumes: `FormationDayRow`（Task 2）。
- Produces:
  ```ts
  export interface FormationStationVisit {
    trip: TripOperationListDetailsDto;
    time: TimeDetailsDto;
    passing: boolean;            // pickupType 1 かつ dropoffType 1、時刻が null
    done: boolean;               // now より前か。通過は前後の停車駅の時刻で決める
  }
  export interface FormationStationSummary {
    visits: FormationStationVisit[];
    total: number; stops: number; passes: number; done: number; remaining: number;
  }
  export function filterByStation(
    rows: FormationDayRow[], stationId: string, baseDate: Date, now: Date | null,
  ): FormationStationSummary;     // now が null（過去の日）なら全部 done
  ```

- [ ] **Step 1: 失敗するテストを書く**
  - `モックの二俣川: 16 回（停車 14・通過 2）` — 停車 14 本と通過 2 本の列車を並べた rows で `total 16, stops 14, passes 2`。
  - `通過の済み・残りは前後の停車駅で決める` — 前の停車駅が now より前、次が後なら `done: false`。
  - `始発の次の駅を通過する列車も決まる`（前の停車駅が始発駅）。
  - `now が null なら全部 done`。
  - `unknown の行より後の列車は数えない`。
- [ ] **Step 2: 失敗を見る** — Run: `npx jest --testPathPatterns=formation-station-filter` Expected: FAIL。
- [ ] **Step 3: 実装する** — 時刻の比較は `toAbsoluteTime(baseDate, days, time)`。
- [ ] **Step 4: 通るのを見る** — Expected: PASS。
- [ ] **Step 5: コミット** — `feat: :sparkles: 編成別時刻表の駅で絞る計算を足す`

### Task 4: store と service

**Files:**
- Create: `src/app/pages/timetable/timetable-formation/stores/timetable-formation.store.ts`
- Create: `src/app/pages/timetable/timetable-formation/services/timetable-formation.service.ts`
- Test: 両方の `.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `findOneTimeCrossSectionByFormationNumber`、Task 2 の `selectFormationOnDate`・`buildFormationDay`・`missingOperationIds`・`toRailwayDateKey`、Task 3 の `filterByStation`。既存の `OperationSightingService.findManyBySpecificPeriod`、`OperationService.findOneWithTrips`・`findManyItineraryLinks`・`findOneWithCurrentPosition`、`FormationService.findManyBySpecificDate`、`CalendarService.findOneBySpecificDate`、`StationService`（駅別時刻表が駅の一覧を取る方法に合わせる）。
- Produces:
  ```ts
  export type FormationDateKind = 'past' | 'today' | 'tomorrow';
  export const TimetableFormationStore = signalStore(/* providedIn: 'root' */);
  // state: formationNumber, date, dateKind, formation, calendar, sightings,
  //        tripsByOperationId, links, firstOperationId, tomorrowOperationId,
  //        currentPosition, selectedStationId, loadingQueue
  // computed: rows (buildFormationDay), stationSummary (filterByStation),
  //           todaysSightings（この編成の目撃を時刻順）, currentOperation と basis,
  //           canSelectTomorrow, notFound, noCalendar
  // methods: nextFetchSeq / isLatestFetch / set... / enableLoading / disableLoading
  @Injectable() export class TimetableFormationService {
    fetchDay(params: { formationNumber: string; date: string; dateKind: FormationDateKind;
                       forceReload?: boolean }): Observable<void>;
    refetchSightings(): Observable<void>;   // socket 用。今日だけ・目撃だけ取り直す
  }
  ```

取り方（spec の「使うもの」「実装の決まり」）:

- 過去と今日の目撃: `findManyBySpecificPeriod({ from: その日 4:00, to: 翌日 4:00, includeCarriedOver: true })`。今日は `to` を今にしてよい。
- 今日の最初の運用: 目撃が無いときだけ `findOneTimeCrossSectionByFormationNumber({ formationNumber })` の `expectedSighting.operation.operationId`。
- 明日: `searchTime` = 明日 12:00（日本時間）で同じものを呼び、`expectedSighting.operation.operationId` を最初の運用にする。明日の目撃は無い。
- `canSelectTomorrow`: 今日の画面で、明日の問い合わせに運用が返ったときだけ true。群の一覧は client に書かない（決まりは api の `operationNumberCirculateMap` にある）。Task 1 Step 5 の結果に合わせる。
- 乗り移り: `findManyItineraryLinks({ calendarId })`。運用の列車は `missingOperationIds` が空になるまで `findOneWithTrips` を取りに行く。
- いまの位置: 今日だけ。走っている列車（`estimated` でない）の運用の id で `findOneWithCurrentPosition`。
- 編成が無ければ `notFound`、ダイヤが無ければ `noCalendar` を立て、エラーにしない。

- [ ] **Step 1: 失敗するテストを書く**（`timetable-station.store.spec.ts` と同じ TestBed の書き方）
  - `ダイヤが無い日は noCalendar`
  - `その日に有効な編成が無ければ notFound`
  - `過去の日は includeCarriedOver=true でその日の 4 時から翌日の 4 時を取る`
  - `明日は searchTime に明日 12:00 を渡す`
  - `乗り移り先の運用の列車を取り終えるまで findOneWithTrips を呼ぶ`
  - `明日の運用が返らなければ canSelectTomorrow は false`
  - `古い取得の結果は捨てる`（`isLatestFetch`）
- [ ] **Step 2: 失敗を見る** — Run: `npx jest --testPathPatterns=timetable-formation/(stores|services)` Expected: FAIL。
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通るのを見る** — Expected: PASS。
- [ ] **Step 5: コミット** — `feat: :sparkles: 編成別時刻表の store と service を足す`

### Task 5: ページと route

**Files:**
- Create: `timetable-formation.component.{ts,html}`、`timetable-formation.route.ts`
- Create: `components/timetable-formation-header/`、`components/timetable-formation-trip-list/`、`components/timetable-formation-station-list/`
- Modify: `src/app/pages/timetable/timetable.route.ts`（`path: 'formation'` を `station` の後に）
- Modify: `src/app/app.routes.server.ts:59` の後に `{ path: 'timetable/formation', renderMode: RenderMode.Server, headers: LONG }`
- Test: `timetable-formation.component.spec.ts` と各部品の spec

**Interfaces:**
- Consumes: Task 4 の store と service。
- Produces: route `TIMETABLE_FORMATION_ROUTES`（`providers: [TimetableFormationService]`、`resolve: { from: pageResolver() }`、`data: { title: '編成別時刻表', description }`）。

画面（spec の「上の段」「本体」「駅で絞る」「日付」と mock `.context/m12-mock-v2.png`）:

- 上の段: 編成番号の入力欄、形式・会社（`formatFormationAnnotation`）、その日の目撃の並び、いまの運用と根拠、いまの位置（今日だけ）、明日の見込み、駅を選ぶ欄（駅別時刻表の mat-select と `buildStationGroups` を使う）、日付の欄と前の日・次の日のボタン。明日を選べないときは理由を日付の欄の近くに出す。
- 本体: `rows` を並べる。過ぎた列車は薄く、走っている列車は色を付ける。`estimated` に「推定」。行を押すと各駅の時刻が開き、通過は「通過」。列車番号は `app-trip-label`、運用番号は `operationNumberColor`。
- 駅で絞る: `stationSummary` を出す。通る回数は「16 回（停車 14・通過 2）」の形。
- `unknown`: 「最後に分かっているのは 55（15:20 に 8711 が 55 で目撃されるまで）」と、投稿への導線。
- 文言: 「この日の目撃はありません」「8713 はこの日に有効な編成にありません」「この日のダイヤはありません」。

- [ ] **Step 1: 失敗するテストを書く**
  - `date が無ければブラウザで今日を補い replaceUrl で書き直す`（`router.navigate` の引数を確かめる。サーバーでは呼ばない）
  - `3:30 に開いたら前の日を補う`
  - `formation_number を変えたら URL を書き直す`
  - `明後日へ進むボタンは押せない`・`明日を選べないときは理由が出る`
  - `notFound / noCalendar / 目撃なしの文言が出る`
  - `unknown の行の文言`
  - `今日のときだけ socket の合図で refetchSightings を呼ぶ`（リアルタイム運用情報の `SocketService.on()` の使い方に合わせる）
- [ ] **Step 2: 失敗を見る** — Run: `npx jest --testPathPatterns=timetable-formation` Expected: FAIL。
- [ ] **Step 3: 実装する** — マトリクスパラメータは `paramMap` から読む（駅別時刻表 `timetable-station.component.ts` と同じ）。
- [ ] **Step 4: 通るのを見る** — Expected: PASS。`npm run lint` も通る。
- [ ] **Step 5: 実データで見る** — ng serve（memory: project_worktree_dev_server_local）で `localhost:4200/timetable/formation;formation_number=8713` をスマホ幅で開き、mock と並べてスクショを撮る。今日・過去の日・明日の 3 つ、駅で絞る、運用の変わった編成を 1 本確かめる（memory: feedback_visual_realdata_gate）。
- [ ] **Step 6: コミット** — `feat: :sparkles: 編成別時刻表のページを足す`

### Task 6: このページへのリンク

**Files:**
- Modify: `operation-real-time-operation-card.component.html:55`、`operation-real-time-formation-card.component.html:33`（編成番号をリンクにする）
- Modify: `src/app/pages/library/library-vehicle/*.html`（`<table class="formation">` の編成番号）
- Modify: `src/app/layout/components/sidenav/sidenav.component.html`（「時刻表」の並びの下り の後に「編成別時刻表」）
- Modify: `src/app/layout/page-help/page-help.ts`（`'/timetable/formation'` の `lines`）
- Modify: `src/app/pages/guide/guide.component.html:128-135`（「やりたいこと別の使い方」）
- Modify: `src/sitemap.xml`（`/timetable/formation` を足す）
- Test: 各カードの spec、`page-help` の spec

**Interfaces:**
- Consumes: Task 5 の URL の形。リンクは `['/timetable/formation', { formation_number: n }]`。日付は付けない（今日になる）。

- [ ] **Step 1: 失敗するテストを書く** — 2 つのカードで編成番号が `/timetable/formation;formation_number=8713` へのリンクになる。`toHelpPage('/timetable/formation')` がそのパスを返す。
- [ ] **Step 2: 失敗を見る** — Run: `npx jest --testPathPatterns=operation-real-time --testPathPatterns=page-help` Expected: FAIL。
- [ ] **Step 3: 実装する** — 車両のページは静的な HTML なので、編成番号の `<td>` を `<a [routerLink]>` で包む（数が多いので 1 つずつ置き換える。正規表現でまとめて書き換えない）。page-help と guide の文は natural-japanese → yomiyasu で推敲してから入れる。
- [ ] **Step 4: 通るのを見る** — Expected: PASS。`npm run lint` も通る。
- [ ] **Step 5: 実物で見る** — リアルタイム運用情報のカードと車両のページから押して開くこと、サイドナビで現在地が光ることを確かめる。
- [ ] **Step 6: コミット** — `feat: :sparkles: 編成別時刻表へのリンクを足す`
