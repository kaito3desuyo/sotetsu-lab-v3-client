# 運用別時刻表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 運用を 1 つ選ぶと、その日（またはそのダイヤ）の列車の並びと、どの編成が走ったかを縦の一覧で出す `/timetable/operation` を client に足し、運用番号のチップの飛び先をここへ変える。

**Architecture:** 編成別時刻表（`pages/timetable/timetable-formation/`）と同じ標準ページ構成（store・service・components・utils）で `pages/timetable/timetable-operation/` を作る。列車ごとの編成は純粋関数 `buildOperationDay` で決める。api は変えない。

**Tech Stack:** Angular 22（standalone・OnPush・signal）、@ngrx/signals、Angular Material、Tailwind（`tw-` 接頭辞）、Jest。

**Spec:** `docs/superpowers/specs/2026-11-18-operation-timetable-design.md`

## Global Constraints

- URL: 日付の形 `/timetable/operation;operation_number=63;date=2026-11-16`、ダイヤの形 `/timetable/operation;operation_number=63;calendar_id=…`。どちらも無ければ今日の日付の形。両方あれば `date` を使う。
- 日付の形で選べるのは過去の日と今日だけ。今日は `railwayDateKey`（4 時区切り）で決める。
- 推し量った編成は「8708?」のように「?」を付ける。推し量れなければ「編成不明」。過去の日は推し量らない。
- 差し替わりの文は「14:21 の目撃により 10701 に差し替え」。編成別時刻表の区切りの文も「10:53 の目撃により 67 に変更」にそろえる。
- その日・そのダイヤに運用番号が無ければエラー画面にせず「この日のダイヤに 63 運用はありません」（ダイヤの形は「このダイヤに 63 運用はありません」）。
- ダイヤの形では、編成・目撃・差し替わり・今の位置を出さず、列車も薄くしない。
- ページ名の大見出しは置かない。運用番号は `app-operation-number-tag`、編成番号は `app-formation-number-link` で出す。
- 列車の一覧の見た目は編成別時刻表 v2.28.2 と同じ（狭い画面は 2 段、1280px 以上は 1 段＋右の時刻カード、時刻は `formatClock` の時計の時刻）。
- テストは関係する spec だけを `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=<path>` で流す。全体を流さない。
- コミットは Conventional Commits＋絵文字（例 `feat: :sparkles: …`）。署名が要るのでサンドボックスの外で、メッセージは `-F` のファイルで渡す。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01NxksuqCpWLTXCFvmXt2nKt`。

## Review Focus

1. 休車の運用 100（列車を持たない）を開いたとき: 列車の無い旨を出して落ちない（Task 2 の spec・Task 4 の spec）。
2. 今日の 0 時〜4 時に開いたとき: 前の営業日を「今日」として扱い、24 時を超える列車も走っている扱いになる（Task 4 の spec）。
3. 無効にされた目撃: 編成にも差し替わりにも数えない（Task 2 の spec）。
4. 過去の日を見ている間に socket の合図が来たとき: 取り直さない（Task 4 の spec）。
5. 運用番号を変えずに日付を変え、新しい日のダイヤにその番号が無いとき: 「この日のダイヤに N 運用はありません」を出し、操作帯は使える（Task 4 の spec）。

---

### Task 1: 運用別時刻表へのリンクを作る関数

**Files:**
- Create: `src/app/core/utils/operation-timetable-link.ts`
- Test: `src/app/core/utils/operation-timetable-link.spec.ts`

**Interfaces:**
- Produces: `operationTimetableLink(operationNumber: string | null | undefined, at: { date: string } | { calendarId: string | null | undefined }): readonly unknown[] | undefined`

- [ ] **Step 1: Write the failing test**

```ts
it('日付の形', () => {
    expect(operationTimetableLink('63', { date: '2026-11-16' })).toEqual([
        '/timetable', 'operation', { operation_number: '63', date: '2026-11-16' },
    ]);
});
it('ダイヤの形', () => {
    expect(operationTimetableLink('63', { calendarId: 'c1' })).toEqual([
        '/timetable', 'operation', { operation_number: '63', calendar_id: 'c1' },
    ]);
});
it('番号かダイヤが無ければリンクにしない', () => {
    expect(operationTimetableLink(null, { date: '2026-11-16' })).toBeUndefined();
    expect(operationTimetableLink('63', { calendarId: null })).toBeUndefined();
});
```

- [ ] **Step 2:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=src/app/core/utils/operation-timetable-link` が FAIL（モジュールが無い）。
- [ ] **Step 3:** 関数を書く。休車の 100 はチップの部品がリンクを張らないので、ここでは特別扱いしない。
- [ ] **Step 4:** 同じコマンドで PASS。
- [ ] **Step 5:** コミット `feat: :sparkles: 運用別時刻表へのリンクを作る関数を足す`

### Task 2: 列車ごとの編成を決める `buildOperationDay`

**Files:**
- Create: `src/app/pages/timetable/timetable-operation/utils/operation-day.util.ts`
- Test: `src/app/pages/timetable/timetable-operation/utils/operation-day.util.spec.ts`

**Interfaces:**
- Consumes: `OperationTripsDto`、`OperationSightingDetailsDto`、`toServiceSeconds`・`formatClock`・`toZeroBasedDays`（`timetable-formation/utils/formation-display.util.ts` から import してよい）。
- Produces:

```ts
export type OperationDayRow =
    | {
          kind: 'trip';
          trip: TripOperationListDetailsDto;
          /** その列車を走った編成。分からなければ null */
          formationNumber: string | null;
          /** 推し量り（持ち越しの目撃・time-cross-section）なら true。「?」を付ける */
          inferred: boolean;
          /** この列車で見た目撃の時刻（ISO・時刻順） */
          sightingTimes: string[];
      }
    | { kind: 'depot'; label: 'out' | 'in'; stationId: string; time: string }
    | { kind: 'swap'; sightingTime: string; toFormationNumber: string };

export interface OperationDayInput {
    /** 見ている運用（その日のダイヤの運用 ID） */
    operationId: string;
    /** 営業日 'yyyy-MM-dd'。ダイヤの形では null（編成を決めない） */
    baseDate: string | null;
    trips: OperationTripsDto;
    /** その営業日の全目撃（includeCarriedOver=true で取ったもの） */
    sightings: OperationSightingDetailsDto[];
    formationNumberById: Record<string, string>;
    /** 今日で、この運用に今日の目撃が無いときの time-cross-section の編成番号。それ以外は null */
    inferredFormationNumber: string | null;
}

export function buildOperationDay(input: OperationDayInput): OperationDayRow[];
```

決まり（spec「列車ごとの編成の決め方」）:
1. この運用の、`invalidation` の無い目撃を時刻順に使う。持ち越しの目撃の見分け方と、目撃が属する運用の取り方は `formation-day.util.ts` の `effectiveOperationId`・`dropCarriedCopies` と同じにする（使い回せるなら export して使う）。
2. 目撃時刻を含む列車から、その目撃の編成。列車と列車の間なら次の列車から。
3. 最初の目撃より前: 持ち越しの目撃があればその編成（inferred）、無ければ `inferredFormationNumber`（inferred）、どちらも無ければ null。
4. 続く 2 つの目撃で編成が違えば、後の目撃の編成が走る最初の列車の前に `swap` 行。同じ編成なら出さない。持ち越しの目撃は数えない。
5. 入出庫の行は `formation-day.util.ts` の「5. 入出庫を depot の行にする」と同じ作り。
6. `baseDate` が null なら、列車と入出庫だけを返し、formationNumber はすべて null・sightingTimes は空。

- [ ] **Step 1: Write the failing tests**（`describe('buildOperationDay')` に、運用 63 の列車 3 本 06:00–06:40・07:00–07:40・08:00–08:40 を置いた fixture で）
  - `'目撃が無く推し量りも無ければ、どの列車も null'`
  - `'今日で目撃が無ければ、推し量りの編成に inferred を付ける'`: `inferredFormationNumber: '8708'` → 3 本とも `{ formationNumber: '8708', inferred: true }`
  - `'走行中の目撃は、その列車から'`: 07:20 に 8708 → 1 本目は推し量り（無ければ null）、2・3 本目は `'8708'`・`inferred: false`、2 本目の `sightingTimes` に 07:20
  - `'列車の間の目撃は、次の列車から'`: 07:50 に 8708 → 3 本目から 8708
  - `'編成が替われば、後の編成の最初の列車の前に swap'`: 06:10 に 8708、07:20 に 10701 → rows の並びが depot? / trip(8708) / swap('…07:20…', '10701') / trip(10701) / trip(10701)
  - `'同じ編成が続けて目撃されても swap を出さない'`
  - `'持ち越しの目撃は、最初の列車からの推し量りにし、swap に数えない'`
  - `'無効にされた目撃は数えない'`
  - `'ほかの運用の目撃は数えない'`
  - `'列車を持たない運用（休車 100）は空の配列'`
  - `'ダイヤの形（baseDate null）は編成を決めない'`
- [ ] **Step 2:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=timetable-operation/utils/operation-day` が FAIL。
- [ ] **Step 3:** 上の決まりで実装する。
- [ ] **Step 4:** 同じコマンドで PASS。`formation-day.util.ts` から export を足したなら `--testPathPatterns=timetable-formation/utils` も PASS。
- [ ] **Step 5:** コミット `feat: :sparkles: 運用別時刻表の列車ごとの編成を決める`

### Task 3: ストアとサービス

**Files:**
- Create: `src/app/pages/timetable/timetable-operation/stores/timetable-operation.store.ts`（＋spec）
- Create: `src/app/pages/timetable/timetable-operation/services/timetable-operation.service.ts`（＋spec）

**Interfaces:**
- Consumes: `CalendarService.findOneBySpecificDate`・`findOne`、`OperationService.findManyByCalendarId`・`findOneWithTrips`（編成別時刻表の `/operations/:id/trips` と同じ取り方）・`findOneWithCurrentPosition`、`OperationSightingService.findManyBySpecificPeriod`（`includeCarriedOver: true`）・`findOneTimeCrossSectionByOperationNumber`、`FormationService.findManyBySpecificDate`。
- Produces:
  - `export type OperationViewKind = 'past' | 'today' | 'calendar';`
  - `TimetableOperationStore`（`signalStore({ providedIn: 'root' })`）の読み: `operationNumber()`、`date()`、`calendar()`、`viewKind()`、`operation()`（その番号の運用。無ければ null）、`operationNumbers()`（そのダイヤの運用番号の並び）、`trips()`、`sightings()`、`formationNumberById()`、`inferredFormationNumber()`、`currentPosition()`、`loaded()`、`loadError()`、`notFound()`（運用が無い）、`noCalendar()`、`isLoading()`、`rows()`（computed で `buildOperationDay` を呼ぶ）。世代番号は `nextFetchSeq`・`isLatestFetch`・`currentFetchSeq`。
  - `TimetableOperationService.fetch(params: { operationNumber: string; date: string | null; calendarId: string | null; viewKind: OperationViewKind; forceReload?: boolean }): Observable<void>`
  - `refetchSightings(): Observable<void>`（`viewKind() === 'today'` のときだけ取り直す）
  - `fetchCurrentPosition(): Observable<void>`（今日だけ）

- [ ] **Step 1: Write the failing tests**（service spec。libs のサービスは jest のモックで）
  - `'日付の形: 日付からダイヤを引き、その番号の運用の列車と目撃を入れる'`
  - `'今日で目撃が無ければ time-cross-section の編成番号を inferredFormationNumber に入れる'`（`expectedSighting.formation.formationNumber`）
  - `'今日でもこの運用に目撃があれば time-cross-section を呼ばない'`
  - `'過去の日は time-cross-section を呼ばない'`
  - `'ダイヤの形: calendarId のダイヤで引き、目撃を取らない'`
  - `'その番号の運用が無ければ notFound で、エラーにしない'`
  - `'ダイヤが無い日は noCalendar'`
  - `'取得に失敗したら loadError'`
  - `'refetchSightings は過去の日とダイヤの形では何もしない'`
  - `'古い取得の結果は捨てる（世代番号）'`
- [ ] **Step 2:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=timetable-operation/(services|stores)` が FAIL。
- [ ] **Step 3:** 編成別時刻表の store・service の作り（`fail` で loadError を立てる、`latest()` で古い結果を捨てる）にならって書く。圏外用の保存と設定の保存は付けない。
- [ ] **Step 4:** PASS。
- [ ] **Step 5:** コミット `feat: :sparkles: 運用別時刻表のストアとサービスを足す`

### Task 4: ページと部品

**Files:**
- Create: `src/app/pages/timetable/timetable-operation/timetable-operation.route.ts`、`timetable-operation.component.{ts,html,spec.ts}`
- Create: `components/timetable-operation-controls/`（運用番号の欄・日付の欄と前後の日・ダイヤの欄）
- Create: `components/timetable-operation-header/`（運用番号のチップ・ダイヤ名・今の編成・今の位置・その日の目撃・運用行路図へのリンク）
- Create: `components/timetable-operation-trip-list/`（`timetable-formation-trip-list` の見た目と動きを写し、運用番号のチップの所に編成番号、`swap` 行の文を変えたもの）
- Create: `utils/operation-progress.util.ts`（＋spec）。`computeProgress` と同じ決まりで `OperationDayRow` を受ける。`viewKind === 'calendar'` はどれも `'future'`（薄くしない）
- Modify: `src/app/pages/timetable/timetable.route.ts`（`path: 'operation'`）、`src/app/app.routes.server.ts`（`timetable/operation`、`RenderMode.Server`、`headers: LONG`）

**Interfaces:**
- Consumes: Task 1〜3。`ControlBandComponent`、`OperationNumberTagComponent`、`FormationNumberLinkComponent`、`TripLabelComponent`、`TripPositionComponent`、`railwayDateKey`・`shiftDate`、`SocketService`・`readSocketSignal`。
- Produces: route の `data`: `title: '運用別時刻表'`、`description: '相鉄線と直通先で、運用ごとにその日の列車の並びと各駅の時刻、走った編成を調べられます。'`

画面の文（spec のとおり。推敲は Task 7 で）:
- 差し替わり: `{{HH:mm}} の目撃により` ＋編成番号のリンク＋`に差し替え`
- 推し量り: 編成番号のあとに `?`。分からなければ上の段に「編成不明」、列車の行は空
- 運用が無い: 「この日のダイヤに {{n}} 運用はありません」／「このダイヤに {{n}} 運用はありません」
- 列車が無い（休車 100 など）: 「この運用に列車はありません」
- 行路図へのリンク: 「運用行路図で見る」（`['/operation', 'route-diagram', { operation_id }]`）

- [ ] **Step 1: Write the failing tests**
  - progress util: `'0 時〜4 時は前の営業日の 24 時台の列車を走っている扱いにする'`（baseDate `2026-11-16`、now `2026-11-17T00:50+09:00`、列車 24:47–25:04 → `'running'`）、`'過去の日はどれも past'`、`'ダイヤの形はどれも future'`
  - page spec: `'URL に date も calendar_id も無ければ今日の日付の形で取る'`、`'date と calendar_id が両方あれば date を使う'`、`'先の日の date は今日に直す'`、`'運用が無ければ「この日のダイヤに 63 運用はありません」を出し、操作帯は出す'`、`'socket の合図は今日だけ取り直す'`、`'差し替わりの行に「の目撃により」と「に差し替え」が出る'`、`'ダイヤの形では編成・目撃の欄を出さない'`、`'運用行路図へのリンクがある'`
  - trip-list spec: 編成別時刻表の trip-list spec の広い画面・狭い画面のテストを写し、編成番号と「?」の出し分けを足す
- [ ] **Step 2:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=timetable-operation` が FAIL。
- [ ] **Step 3:** 編成別時刻表のページ（`timetable-formation.component.ts`）の URL の読み方・socket の受け方・現在位置の取り方にならって書く。運用番号の欄は `mat-autocomplete`、並びは `OperationService.findManyByCalendarId` の結果を運用行路図の運用番号の選び方と同じ順で。
- [ ] **Step 4:** PASS。`npx eslint src/app/pages/timetable/timetable-operation` が 0 件。
- [ ] **Step 5:** 手元の画面（ng serve、本番データを流す `.context/route-8708.js` の要領）で、11/16 の 59・67 運用（8708 が差し替わった日）と今日の運用を 412px・1280px で見て、スクリーンショットをユーザーに送る。
- [ ] **Step 6:** コミット `feat: :sparkles: 運用別時刻表のページを足す`

### Task 5: 運用番号のチップの飛び先を変える

**Files（Modify）:**
- 日付の形（その日付を渡す。今日のページは `railwayDateKey(new Date())`）:
  - `pages/operation/operation-real-time/components/operation-real-time-operation-card/…html`
  - `pages/operation/operation-real-time/components/operation-real-time-formation-card/…html`
  - `pages/operation/operation-past-time/components/operation-past-time-table/…html`（表の日付）
  - `pages/dashboard/components/dashboard-latest-sightings/…html`（目撃の日の営業日）
  - `pages/train-location/components/train-location-card/…html`、`train-location-station-panel/…html`
  - `pages/timetable/timetable-formation/utils/formation-display.util.ts` の `routeDiagramLink` を使っている所（見ている日付を渡す）
- ダイヤの形（見ているダイヤを渡す）:
  - `pages/timetable/timetable-all-line/components/timetable-all-line-table/…html`
  - `pages/timetable/timetable-station/components/timetable-station-trip-cell/…html`
  - `pages/train-diagram/components/train-diagram-info-panel/…html`
- 変えない: `shared/operation-search-card`、`pages/operation/operation-table`、運用行路図

リアルタイム運用情報はロック済みのページ。チップの見た目は変えず、`[link]` だけを変える。

- [ ] **Step 1:** 各部品の既存 spec にある行路図へのリンクの期待を、運用別時刻表のリンクに書き換える（無ければ 1 件足す）。
- [ ] **Step 2:** 関係する spec を流して FAIL を確かめる。
- [ ] **Step 3:** `operationTimetableLink` で `[link]` を書き換える。`formation-display.util.ts` の `routeDiagramLink` は使う所が無くなれば消す。
- [ ] **Step 4:** 関係する spec が PASS。`grep -rn "route-diagram" src/app --include="*.html"` に、チップ（`app-operation-number-tag`）の `[link]` が残っていない。
- [ ] **Step 5:** コミット `feat: :sparkles: 運用番号のチップから運用別時刻表へ移る`

### Task 6: 編成別時刻表の区切りの文をそろえる

**Files:**
- Modify: `pages/timetable/timetable-formation/components/timetable-formation-trip-list/timetable-formation-trip-list.component.html:136-145`（`の目撃で` → `の目撃により`、`に変わった` → `に変更`）と spec

- [ ] **Step 1:** trip-list spec の期待を「の目撃により」「に変更」に変える。
- [ ] **Step 2:** FAIL を確かめる。
- [ ] **Step 3:** html を直す。
- [ ] **Step 4:** `--testPathPatterns=timetable-formation` が PASS。
- [ ] **Step 5:** コミット `fix: :pencil2: 編成別時刻表の差し替わりの文を硬めにそろえる`

### Task 7: 案内と目録

**Files（Modify）:**
- `src/app/layout/components/sidenav/sidenav.component.html`（「編成別時刻表」の次に「運用別時刻表」、アイコンは編成別時刻表の項目にそろえる）
- `src/app/layout/page-help/page-help.ts`（`'/timetable/operation'` の 3 行）
- `src/app/pages/guide/guide.component.html`（「やりたいこと別の使い方」に 1 項目）
- `src/sitemap.xml`（`/timetable/operation`）

- [ ] **Step 1:** page-help・guide の spec があれば、項目の存在の期待を足す。
- [ ] **Step 2:** 文を書く。画面の文（Task 4 の文、page-help、guide、route の description）は `natural-japanese` で書き、`yomiyasu` で推敲する。事実を直したあとも推敲し直す。
- [ ] **Step 3:** 関係する spec が PASS。
- [ ] **Step 4:** コミット `feat: :sparkles: 運用別時刻表をナビと使い方に載せる`
