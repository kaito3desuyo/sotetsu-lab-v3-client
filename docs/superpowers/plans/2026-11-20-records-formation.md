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
- 画面の文言は `docs/style-profile.md` の文体。空のときの文言は spec のとおり：「この月の目撃はありません」「目撃の記録はありません」。「編成が見つかりません」は出さない（どんな番号でもカレンダーを取りに行く。client は全編成の一覧を持たず、引退した編成も見られるようにするため。要約に最新の目撃が無ければ「目撃の記録はありません」で、打ち間違えた番号もこれで示す）
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

## 追補（2026-11-21）：見た目の直しと編成の情報

Task 1〜6 は済んでいる（client は 016ce5b7 まで）。ユーザーが見た目を作り直すよう求め、編成の組成・組み換えの履歴・塗装を段 1 に入れると決めた。spec の「見た目」「編成の情報のカード」「塗装」「api の変更 › 編成の塗装」の節が要件で、値はそこから写す。

追補の Global Constraints:
- 3 枚のカード（見出し・編成の情報・カレンダー）はどれも `tw-rounded-card tw-bg-white`。カードの間は既存ページと同じだけ空ける
- 色はトークンで書く：赤は `--color-accent-deep`、罫線は `--color-rule`、今日の丸は `--color-structure`、今日のマスは `--color-paper-2`。灰色や黒を直に書かない（車両の絵の塗装の色だけは例外で、塗装の表に値を置く）
- 車両の絵は横にスクロールさせない。カードの幅に収める
- `livery` の値は spec の「外観（形式と塗装）」の表のとおり、形式と塗装の組ごとに 1 つ。絵も値ごとに分けて描く。空なら灰色一色

追補の Review Focus:
1. 期間が 1 つの編成（ほとんど）：組み換えの履歴を出さない
2. 車両が 0 両の期間・始まりの日が空の期間・終わりの日が空の期間（Task 8 の spec）
3. 過去の月を開いたとき：その月の最終日に有効な期間の組成と塗装で描く。今の月なら今日の時点（Task 8 の spec）
4. 塗り替えだけの期間：赤い番号を付けず「塗り替え」と書く（Task 8 の spec）
5. 10 両の編成を 375px で開いたとき：番号が欠けない（Task 10 の実物確認）

---

### Task 7: api の編成に塗装の列を足す（sotetsu-lab-v3-api）

作業場所：`git fetch` のあと `origin/master` から worktree（`../wt-api-livery`、ブランチ `feat/formation-livery`）を作り、`first commit` の空コミットを置く。手元の api を動かす前に migration を流す（手元の DB）。

**Files:**
- Modify: `src/libs/formation/infrastructure/models/formation.model.ts`（`@Column('varchar', { nullable: true }) livery!: string | null;`）
- Create: `db/migrations/<generate したもの>`（`npm run` の migration generate で作る。手書きしない）
- Modify: `src/libs/formation/usecase/dtos/base-formation.dto.ts`・`formation-details.dto.ts`・builder・`formation-selection-columns.ts`（`livery` を返し、`fields` で選べる）
- Create: `docs/adr/<次の番号>-formation-livery.md`（塗装を編成の期間ごとの列で持つ理由。系列からは決められないこと、塗り替えで行を分けること）
- Test: formation の query・service・controller の spec

- [ ] **Step 1: 落ちる spec**：`期間の取得で livery が返る`、`fields=livery で livery だけを選べる`、`livery が NULL の行は null で返る`
- [ ] **Step 2: 落ちるのを確かめる**（サンドボックス外で `npx vitest run src/libs/formation`）
- [ ] **Step 3: 実装**（model → migration generate → DTO・builder・選べる列）
- [ ] **Step 4: 通るのを確かめる**。`npm run lint`・`npx tsc --noEmit` も通す
- [ ] **Step 5: コミット**　`feat: :sparkles: 編成に塗装の列を足す`（ADR は別のコミット `docs: :memo: …`）

---

### Task 8: client の編成の取得と、期間の組み立て（純粋な関数）

**Files:**
- Modify: `src/app/libs/formation/infrastructure/models/formation.model.ts`・`usecase/dtos/formation-details.dto.ts`・builder（`livery: string | null`、`vehicleFormations?: { carNumber: number; vehicle?: { vehicleNumber: string } }[]`。api の名前に合わせて builder で付け替える）
- Modify: `src/app/libs/formation/infrastructure/queries/formation.query.ts`・`usecase/formation.service.ts`（期間の取得で `include=vehicleFormations.vehicle,agency` を指定できる引数を足す。既存の呼び出しの結果は変えない）
- Create: `src/app/pages/records/records-formation/utils/formation-periods.util.ts`（＋spec）

**Interfaces:**
- Produces:
  - `FormationPeriod { startDate: string | null; endDate: string | null; vehicleType: string; agencyName: string | null; livery: Livery | null; cars: string[] }`（`cars` は `carNumber` の順の車両番号）
  - `buildFormationPeriods(rows: FormationDetailsDto[], formationNumber: string): FormationPeriod[]` … その番号の行だけを、新しい期間から順に。車両 0 両の行は除く
  - `periodAt(periods: FormationPeriod[], date: string): FormationPeriod | null` … `date` を含む期間。無ければ `date` より前で最も新しい期間
  - `changedCars(periods: FormationPeriod[], index: number): Set<string>` … 1 つ古い期間に無い車両
  - `isRepaintOnly(periods: FormationPeriod[], index: number): boolean` … 車両の並びが 1 つ古い期間と同じで塗装だけ違う

- [ ] **Step 1: 落ちる spec**（7710 の 3 期間の実データを使う：`〜2019-04-28` 8 両、`2019-04-29〜2019-05-12` 10 両、`2019-05-13〜2019-10-14` 8 両。車両番号は spec の画面例と同じ）
  - 新しい期間から並ぶ／0 両の行（3121 の `2099-01-01`）は除く／`carNumber` が逆順で来ても号車の順になる
  - `changedCars` が 10 両の期間で `7607・7127・7128`、最新の期間で `7505` を返す。最も古い期間は空
  - `periodAt(periods, '2019-10-31')` は最新の期間（終わった後でも最後の期間）、`'2019-05-01'` は 10 両の期間
  - `isRepaintOnly`：同じ車両で `livery` だけ違えば true
- [ ] **Step 2〜4:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns='libs/formation|records-formation/utils'` で落ちる → 実装 → 通る
- [ ] **Step 5: コミット**　`feat: :sparkles: 編成の期間ごとの組成を組み立てる`

---

### Task 9: 見た目を作り直す（見出し・編成の情報・カレンダー）

**Files:**
- Modify: `records-formation-summary`（見出しのカード。spec の「見出しのカード」）
- Create: `records-formation/components/records-formation-info/`（編成の情報のカード）と `records-formation/components/formation-train/`（車両の絵の列。入力は `cars: string[]`・`livery: Livery | null`・`highlight: Set<string>`・`size: 'large' | 'small'`・`showCarNumber: boolean`）
- Create: `records-formation/constants/livery.ts`（`Livery` 型と、値ごとの車体・屋根の色、帯の位置と色、S 帯・斜めの飾りのような模様、先頭の形。値は spec の「外観」の表と `.context/mock-deformed.js`（`A`・`NOSE`・`car()`）をそのまま写す。窓と扉は描かない。帯は扉の所でも途切れさせない）
- Modify: `records-formation-calendar`（spec の「カレンダーのカード（B 案）」：上端の月の送り・土日祝の赤・祝日名・今日の印・`--color-rule`）
- Modify: store・service・component（編成の全期間と、その月の `calendar-dates` を取る。祝日は月を替えたら取り直す。編成の期間は編成番号が変わったときだけ取り直す）
- Modify: client の `docs/design.md`（カレンダーの月見出しの送りは表の一部として帯の外に置いてよい、という例外を 1 段落）

- [ ] **Step 1: 落ちる spec**
  - 見出しに `10701`・`10000・相鉄`、解かれた日のある編成は `2019/10/14 まで` が出る
  - 「この月の記録」は、最後に見た日の月と今の月が同じなら出ない
  - 編成の情報：期間が 1 つなら「組み換えの履歴」が出ない。7710 なら 3 期間が新しい順に出て、`7505`・`7607` などに強調の印が付く。塗り替えだけの期間に「塗り替え」が出る
  - 車両の絵の数が組成の両数と同じ。`livery` が null なら灰色の塗装になる
  - カレンダー：11/3（祝日）と土日の数字に赤の印、11/3 に「文化の日」。今日のマスに今日の印。上端の ‹ › で `month` が替わる
  - 祝日と編成の期間の取得が、spec の回数を超えない（月を替えても編成の期間は取り直さない）
- [ ] **Step 2〜4:** `TZ=UTC npx jest --ci --watchAll=false --testPathPatterns=pages/records` で落ちる → 実装 → 通る。`npx eslint`・`npx prettier --check` を変えたファイルに
- [ ] **Step 5: コミット**（部品ごとに分けてよい）　`feat: :sparkles: 編成の記録の見た目を作り直す` など

---

### Task 10: 実物で確かめる・塗装の SQL を用意する

- [ ] **Step 1:** Task 7 の api を手元で動かし（migration を手元の DB に流す）、手元の DB に `livery` を数編成ぶん入れる（10701 は `10000-ynb`、10702 は `10000-group` など）
- [ ] **Step 2:** `npm run build:prod` が通る
- [ ] **Step 3:** 375px と 1280px で 10701・10702・7710（2019-10）・8 両と 10 両の編成を開き、編成別時刻表の見出しと並べて見比べる。Service Worker は止める
- [ ] **Step 4:** 系列で 1 つに決まる塗装をまとめて入れる SQL を `.context/livery-seed.sql` に書く（`vehicle_type` が 11000・12000・13000・20000・21000・3000・3020・5050・5080・E233-7000 の行に、spec の表の対応する値）。旧 7000（編成番号 7707・7710・7712・7713）は塗装が 1 つなので `7000` を入れる。新 7000（7715・7751・7753・7754・7755）・8000・9000・10000 は塗り替えの日が要るので入れない。本番に流すのはユーザー
- [ ] **Step 5:** スクリーンショットをユーザーに見せる

---

## 順番と出し方

1. Task 1 → api の PR → CI → merge・版上げ・デプロイ（済み・v4.9.0）
2. Task 7 → api の PR → CI → merge・版上げ・デプロイ・本番の migration（それぞれユーザーの許可。migration はユーザーが流す）
3. Task 2〜6・8〜10 → client の PR → CI → merge・版上げ・デプロイ（それぞれユーザーの許可）
4. ユーザーが本番の 3121〜3123 の 2099 年の行を消し、塗装の SQL を流す
5. client の roadmap.md の M14 の行と memory を、段 1 済みに直す
