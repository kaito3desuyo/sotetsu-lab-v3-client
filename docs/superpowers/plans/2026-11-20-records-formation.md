# 編成の記録（M14 段 1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1 本の編成の月ごとの運番をカレンダーで眺める `/records/formation` を作る。

**Architecture:** api の期間の口に `formationNumber` の絞り込みを足し（Task 1、先に PR とデプロイ）、client はそれでひと月分を取ってカレンダーに並べる。上の要約は既存の「編成番号の時刻断面」の口で取る。推定の「?」は api の `includeCarriedOver` に任せ、client では作らない。

**Tech Stack:** api は NestJS 12・TypeORM 1.x・Vitest。client は Angular 22・NgRx SignalStore・Jest 30・Tailwind（`tw-`）。

**Spec:** `docs/superpowers/specs/2026-11-19-records-formation-design.md`（client リポ）

## Global Constraints

- URL は `/records/formation;formation_number=10701;month=2026-11`。ディレクトリは `pages/records/records-formation/`、route の親は `pages/records/records.route.ts`
- ページ名は「編成の記録」。ナビに見出し「記録」を作り、「運用情報」と「ライブラリ」のあいだに置く
- 日付・「今日」・「今の月」は 4 時の境目（`src/app/core/utils/railway-day.ts` の `railwayDateKey` など）で数える
- 推定の判定を client で作り直さない。全編成のひと月分を取らない。`app-formation-number-link` の飛び先を変えない
- 画面の文言は `docs/style-profile.md` の文体。空のときの文言は spec のとおり：「編成が見つかりません」「この月の目撃はありません」「目撃の記録はありません」
- api の絞り込みは、直接の目撃と推定を合わせて並べた後の結果にかける。推定の材料は絞らない。引数なしの結果は変えない
- client の jest は関係する spec だけ：`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=<範囲>`。全体を流さない
- api の Vitest・CLI はサンドボックスの外で流す（SWC）
- コミットは Conventional Commits＋絵文字、メッセージは `-F` でファイルから渡し、末尾に `Co-Authored-By` と `Claude-Session` の 2 行

## Review Focus

1. 0〜4 時に開いたとき：「今日」は前日、月初 0〜4 時の「今の月」は前月。次の月へ進めない境目もこれで決まる（Task 3 の spec）
2. 推定の「?」が、その編成自身の目撃から引き継いだものだけに付く。別の編成の推定が混ざらない（Task 1 の spec）
3. URL の `month` が壊れている（`2026-13`、`abc`、未来の月）：今の月に戻して出す（Task 3・Task 4 の spec）
4. 月を行き来したあとに戻る操作：前に見ていた月に戻る。取得が遅れて届いても、今の月の表示を上書きしない（Task 4 の spec。`nextFetchSeq`/`isLatestFetch`）
5. 1 日に運番が 3 つ以上ある日：375px で 7 列が崩れず、運番も省略しない（Task 6 の実物確認）

---

### Task 1: api に `formationNumber` の絞り込みを足す（sotetsu-lab-v3-api）

作業場所：api の本体のチェックアウトは master が origin より 54 進んで見える（古い追跡のまま）。`git fetch` してから、`origin/master` を元に worktree（`../wt-api-records`、ブランチ `feat/sightings-period-formation-filter`）を作り、`first commit` の空コミットを置く。

**Files:**
- Modify: `src/libs/operation-sighting/presentation/operation-sighting.v3.controller.ts`（`findManyBySpecificPeriod`、53〜73 行あたり）
- Modify: `src/libs/operation-sighting/usecase/operation-sighting.v3.list.service.ts`（`findManyBySpecificPeriod` と `#findManyBySpecificPeriodFull`）
- Test: `src/libs/operation-sighting/usecase/operation-sighting.v3.list.service.spec.ts`、`src/libs/operation-sighting/presentation/operation-sighting.v3.controller.spec.ts`

**Interfaces:**
- Produces: `GET /v3/operation-sightings/from/:start/to/:end?formationNumber=10701`（省略可）。`findManyBySpecificPeriod(params: { start; end; includeInvalidated?; includeCarriedOver?; formationNumber?: string; include?; fields? })`

- [ ] **Step 1: 落ちる spec を書く**（list.service.spec の `findManyBySpecificPeriod` の describe に足す）
  - `formationNumber を渡すと、その編成の直接の目撃だけを返す`：編成 10701 と 10702 の目撃を用意し、`formationNumber: '10701'` で 10701 のものだけになる
  - `includeCarriedOver と併せると、その編成の推定も返し、推定の材料は全編成から組む`：10701 の目撃から引き継いだ推定（`carriedFromSightingId` が付く）が結果に残り、10702 由来の推定は残らない。材料の取得（`findManyBySightingTimeRange`）は `formationNumber` なしで呼ばれる
  - `無い編成番号なら空の配列`
  - `formationNumber を省くと今までどおり全編成`
  - controller.spec：`formationNumber` の query がそのまま service に渡る
- [ ] **Step 2: 落ちるのを確かめる**　Run（サンドボックス外）: `npx vitest run src/libs/operation-sighting/usecase/operation-sighting.v3.list.service.spec.ts src/libs/operation-sighting/presentation/operation-sighting.v3.controller.spec.ts`　Expected: 足した spec が FAIL
- [ ] **Step 3: 実装する**　controller に `@Query('formationNumber') formationNumber?: string` を足して service へ渡す。service は `#findManyBySpecificPeriodFull` が返す並べ終えた一覧を `o.formation?.formationNumber === formationNumber` で絞る（`include`・`fields` で削る前に）。直接の目撃の取得が `formation` を join していることを query の実装で確かめ、していなければ `formationId` で突き合わせる。`includeCarriedOver` なしのときは query 側で絞ってもよいが、まずは同じ後絞りで足りる
- [ ] **Step 4: 通るのを確かめる**　同じコマンドで PASS。`npm run lint` と `npx tsc --noEmit` も通る
- [ ] **Step 5: コミット**　`feat: :sparkles: 期間の目撃の取得を編成番号で絞れるようにする`

---

### Task 2: client の目撃の取得に `formationNumber` を通す

**Files:**
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`（`findManyBySpecificPeriod`、47 行〜）
- Modify: `src/app/libs/operation-sighting/usecase/operation-sighting.service.ts`（30 行〜）
- Test: 同じディレクトリの `operation-sighting.query.spec.ts`（無ければ作る）

**Interfaces:**
- Produces: `OperationSightingService.findManyBySpecificPeriod(params: { from: string; to: string; includeInvalidated?: boolean; includeCarriedOver?: boolean; formationNumber?: string; forceReload?: boolean }): Observable<OperationSightingDetailsDto[]>`

- [ ] **Step 1: 落ちる spec**：`formationNumber を渡すと query に formationNumber が付く`（`HttpTestingController` で `?formationNumber=10701` を確かめる）、`formationNumber が違えば別のキャッシュになる`（同じ期間で 10701 と 10702 を続けて取ると 2 回リクエストが出る）、`省けば query に付かない`
- [ ] **Step 2: 落ちるのを確かめる**　`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=libs/operation-sighting`
- [ ] **Step 3: 実装**　`params` の `omitBy` と `QueryCache` の `params`（キー）の両方に `formationNumber` を入れる
- [ ] **Step 4: 通るのを確かめる**（同じコマンド）
- [ ] **Step 5: コミット**　`feat: :sparkles: 期間の目撃の取得に編成番号を渡せるようにする`

---

### Task 3: 月の計算（純粋な関数）

**Files:**
- Create: `src/app/pages/records/records-formation/utils/records-month.util.ts` と `.spec.ts`

**Interfaces:**
- Produces:
  - `currentRailwayMonth(now?: Date): string` … `'2026-11'`
  - `parseMonthParam(value: string | undefined, now?: Date): string` … `YYYY-MM` として正しく、今の月以前ならそれ、それ以外は今の月
  - `monthPeriod(month: string): { from: string; to: string }` … `from` はその月の 1 日、`to` は末日（`YYYY-MM-DD`）。api の `/from/:start/to/:end` にそのまま渡す（4 時の境目は api が持つ）
  - `shiftMonth(month: string, delta: -1 | 1): string`
  - `buildMonthWeeks(month: string): (string | null)[][]` … 月曜始まりの週ごとの日付（`YYYY-MM-DD`）。月の外は `null`

- [ ] **Step 1: 落ちる spec**（値はこのまま使う）
  - `currentRailwayMonth(new Date('2026-11-30T18:59:00Z'))` → `'2026-11'`（JST 12/1 03:59 は 11 月）
  - `currentRailwayMonth(new Date('2026-11-30T19:00:00Z'))` → `'2026-12'`
  - `parseMonthParam('2026-13', now)`・`parseMonthParam('abc', now)`・`parseMonthParam(undefined, now)`・`parseMonthParam('2099-01', now)` → 今の月
  - `parseMonthParam('2014-01', now)` → `'2014-01'`
  - `monthPeriod('2026-02')` → `{ from: '2026-02-01', to: '2026-02-28' }`、`monthPeriod('2028-02').to` → `'2028-02-29'`
  - `shiftMonth('2026-01', -1)` → `'2025-12'`
  - `buildMonthWeeks('2026-11')` の 1 週目は `[null, null, null, null, null, null, '2026-11-01']`（11/1 は日曜）、週の数は 6
- [ ] **Step 2: 落ちるのを確かめる**　`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=records-formation/utils`
- [ ] **Step 3: 実装**　`railway-day.ts` の `railwayDateKey` を使う。dayjs か素の Date かは既存の utils に合わせる
- [ ] **Step 4: 通るのを確かめる**（同じコマンド。`TZ=Asia/Tokyo` でも 1 回流す）
- [ ] **Step 5: コミット**　`feat: :sparkles: 編成の記録の月の計算を足す`

---

### Task 4: ページ本体（store・service・route・部品）

**Files:**
- Create（`src/app/pages/records/` の下）:
  - `records.route.ts`（`RECORDS_ROUTES`、`formation` を遅延読み込み。`library.route.ts` と同じ形）
  - `records-formation/records-formation.route.ts`（`pageResolver(RecordsFormationStore)`、title「編成の記録」、description は spec の文体で 1 文）
  - `records-formation/records-formation.component.{ts,html,spec.ts}`
  - `records-formation/stores/records-formation.store.ts`（＋spec）
  - `records-formation/services/records-formation.service.ts`（＋spec）
  - `records-formation/components/records-formation-controls/`（編成番号の入力と ‹ 月 › の切り替え）
  - `records-formation/components/records-formation-summary/`（今日・最後に見た日）
  - `records-formation/components/records-formation-calendar/`（月のカレンダー）
- Modify: `src/app/app.route.ts`（`records` を `library` と同じ形で足す）、`src/app/app.routes.server.ts`（`records/formation` を `RenderMode.Server`・`headers: LONG`。`timetable/formation` と同じ）

**Interfaces:**
- Consumes: Task 2 の `findManyBySpecificPeriod({ from, to, includeCarriedOver: true, formationNumber })`、既存の `findOneTimeCrossSectionByFormationNumber`、Task 3 の関数一式
- Produces: `RecordsFormationStore`（`formationNumber`・`month`・`sightings`・`summary`・`isLoading`・`nextFetchSeq()`・`isLatestFetch(seq)`）

振る舞い（spec の「画面」の節をそのまま満たす）:
- URL の `formation_number` と `month` を読む。`month` は `parseMonthParam` で直す。月の切り替えは URL を書き換える（`router.navigate` の matrix。履歴に積む）
- カレンダーの取得は `monthPeriod(month)` で 1 回。上の要約は `findOneTimeCrossSectionByFormationNumber` で 1 回、月を替えても取り直さない
- マスの中身は、過去の運用の 1 マス（`operation-past-time-table.component.html` の 125 行〜、`app-operation-number-tag` を `›` でつなぐ）と同じ見た目と並べ方。日ごとの分け方は `OperationPastTimeStore` の `groupSightingsByFormationAndDate` を使い回せるなら使う（`shared` か `core/utils` へ移すのは可。そのときは過去の運用の spec も流す）
- 目撃のあるマスは `/timetable/formation;formation_number=…;date=…` へのリンク。無いマスはリンクにしない
- 次の月のボタンは、今の月のとき無効
- 編成番号の入力は `timetable-formation-controls` と同じ部品・振る舞い（使い回せるなら使う）
- 編成番号なし → 案内だけ。編成一覧（`FormationState` など global-states）に無い番号 →「編成が見つかりません」。目撃 0 の月 → 空のカレンダーに「この月の目撃はありません」。要約で一度も目撃が無い →「目撃の記録はありません」

- [ ] **Step 1: 落ちる spec**（component.spec と store.spec）
  - `month が無ければ今の月を取る`（`findManyBySpecificPeriod` が `from: '2026-11-01', to: '2026-11-30', formationNumber: '10701', includeCarriedOver: true` で呼ばれる。時計は `jest.useFakeTimers().setSystemTime`）
  - `壊れた month（2026-13）は今の月として取る`
  - `前の月のボタンで URL の month が 2026-10 になる`／`今の月なら次の月のボタンは無効`
  - `目撃のある日のマスはその日の編成別時刻表へのリンクになり、無い日はリンクにならない`
  - `推定の目撃（carriedFromSightingId 付き）の運番には「?」が付く`（過去の運用と同じ出し方）
  - `遅れて届いた前の月の結果で表示を上書きしない`
  - `編成番号が無ければ案内だけを出す`／`無い編成番号なら「編成が見つかりません」`／`目撃 0 の月は「この月の目撃はありません」`
  - `要約は月を替えても取り直さない`
- [ ] **Step 2: 落ちるのを確かめる**　`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=pages/records`
- [ ] **Step 3: 実装**（CLAUDE.md の標準ページ構成。OnPush・standalone・`inject()`・`#` の private）
- [ ] **Step 4: 通るのを確かめる**（同じコマンド）。共通化で動かしたものがあれば `--testPathPatterns=operation-past-time` も流す。`npx eslint` と `npx prettier --check` を変えたファイルにかける
- [ ] **Step 5: コミット**（部品ごとに分けてよい）`feat: :sparkles: 編成の記録のページを足す`

---

### Task 5: 入口と案内（ナビ・見出しのリンク・help・sitemap）

**Files:**
- Modify: `src/app/layout/components/sidenav/sidenav.component.html`（「運用情報」の項目の後、「ライブラリ」の見出しの前に `<h2 matSubheader>記録</h2>` と「編成の記録」の項目。`routerLink="/records/formation"`）
- Modify: `src/app/pages/timetable/timetable-formation/components/timetable-formation-header/`（その編成の記録へのリンク。日付があればその月の `month` を付ける）
- Modify: `src/app/layout/page-help/page-help.ts`（`'/records/formation'` の説明。文体は style-profile、2〜3 文）
- Modify: `src/sitemap.xml`（`https://v3.sotetsu-lab.com/records/formation`）
- Test: sidenav と timetable-formation-header の spec

- [ ] **Step 1: 落ちる spec**：`ナビに「編成の記録」があり /records/formation へ飛ぶ`、`編成別時刻表の見出しに、その編成の記録へのリンクがある（formation_number と month が付く）`、page-help の spec があればそこに `/records/formation` の説明があること
- [ ] **Step 2: 落ちるのを確かめる**　`TZ=UTC npx jest --ci --watchAll=false --testPathPatterns='sidenav|timetable-formation-header|page-help'`
- [ ] **Step 3: 実装**
- [ ] **Step 4: 通るのを確かめる**（同じコマンド）。文言を natural-japanese の lint にかける
- [ ] **Step 5: コミット**　`feat: :sparkles: 編成の記録への入口を足す`

---

### Task 6: 実物で確かめる（コードは原則変えない）

- [ ] **Step 1:** `npm run build:prod` が通る
- [ ] **Step 2:** 手元で `ng serve`（サンドボックス外。proxy は localhost:3011 の api。Task 1 の api を手元で動かすか、Task 1 のデプロイ後に本番 API に向ける）で、`/records/formation;formation_number=10701` を幅 375px と 1280px で開く。Service Worker は止める
- [ ] **Step 3:** 運番が 3 つ以上ある日、推定の「?」がある日、目撃の無い日、月初と月末、前後の月の切り替え、戻る操作を実物で確かめる。崩れたら Task 4 に戻して直す（直したら spec も足す）
- [ ] **Step 4:** スクリーンショットをユーザーに見せる

---

## 順番と出し方

1. Task 1 → api の PR → CI → merge・版上げ・デプロイ（それぞれユーザーの許可）
2. Task 2〜6 → client の PR → CI → merge・版上げ・デプロイ（それぞれユーザーの許可）
3. client の roadmap.md の M14 の行と memory を、段 1 済みに直す
