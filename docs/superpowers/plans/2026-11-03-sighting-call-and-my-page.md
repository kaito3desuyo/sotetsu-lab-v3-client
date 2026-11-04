# M13 目撃募集とマイページ（client）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** リアルタイム運用情報に「目撃募集」の帯を足し、ログインした人のマイページ（要約・投稿の一覧・裏付け）を作る。

**Architecture:** 目撃募集は新しい API を使わず、real-time のストアがすでに持つ在線（`currentPositions`）と今日の履歴（`operationSightingHistories`）から純関数で導き、新しい部品で帯に出す。マイページは `pages/moderation/moderation-user` を手本に、api の `/v3/users/me` の 2 本を読む新しいページ `pages/my-page` を作る。

**Tech Stack:** Angular 22（standalone・OnPush・SignalStore）・Angular Material・Tailwind（`tw-`）・Jest

**Spec:** `docs/superpowers/specs/2026-11-03-sighting-call-and-my-page-design.md`（api 側: api リポの `docs/superpowers/specs/2026-11-03-my-page-design.md`）

## Global Constraints

- real-time はロック済み。**Task 1 で `docs/design.md` に掟を書き足してから**部品を作る。掟の文案は spec の「1. 目撃募集 › どう見せるか」の引用をそのまま使う。
- 目撃募集の対象: `sortedOperations`（休車 100 は除外済み）のうち、在線で `current` がある、または `prev` と `next` の両方がある、かつ `operationSightingHistories[運用番号]` が配列として存在して長さ 0。絞り込みは `filterRealTimeOperations` を通す。並びは入力の順のまま。
- 帯の文言: 見出し「目撃募集」、説明「いま走っていて、今日まだ目撃の無い運用」。0 件なら帯ごと出さない。viewer（`isViewer()`）には出さない。
- 帯のチップを押すと: 投稿できる人は `OperationPostDialogService.open({ operationNumber })`。ゲストは `/login?return_to=<今の URL>`（既存の `safeReturnTo` の流儀）。
- マイページ: ルート `/my-page`、`pages/my-page`。ページ名の大見出しは置かない。SSR は `RenderMode.Client`＋`NO_STORE`（`app.routes.server.ts` の moderation と同じ）。sitemap に足さない。
- マイページの注記（そのまま）: 「ログインして出した目撃だけを数えます（記録は 2026年10月24日から）。裏付けは、同じ日に他の人が同じ編成を同じ運用で見たかどうかです。」
- 裏付けの言葉: corroborated「裏付けあり」・conflicting「別の運用の目撃あり」・uncorroborated「他の目撃なし」・invalidated「無効」。conflicting に色を付けない。順位・正答率・他人との比較は出さない。
- 0 件: 「まだ投稿がありません」とリアルタイム運用情報（`/operation/real-time`）へのリンク。
- サイドナビ: ログイン中かつ viewer でないときだけ「アカウント」の見出しと「マイページ」。「管理」の見出しより上。ヘッダーの「ようこそ ○○ さん」の名前を `/my-page` へのリンクに（ログイン中だけ）。
- コードの流儀は CLAUDE.md（OnPush・`inject()`・`#` private・`[class]`・`tw-` 接頭辞・border は `tw-border-solid`・Material 部品優先・`ngClass` を使わない）。prettier はファイル単位で当てる。
- テストは `npx jest --testPathPatterns=<spec>`（サンドボックス内の `npm test` は落ちる）。全体は Task の最後に `npx jest`。
- git は push しない・stash しない・パイプ連結しない。署名コミットはサンドボックス外。

## Review Focus

- 在線や履歴がまだ届かない読み込み直後: 帯が出ない（全運用が「目撃なし」と数えられて一瞬光らない）→ Task 2 の util spec。
- 絞り込みで全部消えたとき・対象 0 件: 帯ごと消え、凡例との間に空きが残らない → Task 3 の component spec と目視。
- 320px で十数個のチップ: 折り返して横はみ出しが無い → Task 3 の目視。
- `/my-page` を直接開いたゲスト: `/login?return_to=%2Fmy-page` へ → Task 5 の guard spec。
- 一覧の「もっと見る」で同じ目撃が二重に出ない（同時刻の境目）→ Task 6 の store spec（重複排除）。

---

### Task 1: design.md に目撃募集の掟を書く

**Files:**
- Modify: `docs/design.md`（「操作カード（検索・投稿・ライブラリ）」の節のリアルタイムの投稿の段落の後、と「ロック済みページ」の real-time の項）

- [ ] **Step 1**: spec の掟の文案を、両方の節に書き足す（ロック済みページの項には「2026-11 M13 で目撃募集の帯を足した」の 1 行と、操作カードの節への参照）。
- [ ] **Step 2: コミット**: `docs: :memo: リアルタイムの目撃募集の帯の掟を書く`

### Task 2: 目撃募集の対象を選ぶ util

**Files:**
- Create: `src/app/pages/operation/operation-real-time/utils/select-sighting-call-operations.util.ts`
- Test: 同じ場所の `.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  export function selectSightingCallOperations<T extends { operationNumber: string }>(params: {
      operations: T[];                       // 絞り込み後・並べ替え済み
      currentPositions: Record<string, { prev?: unknown | null; current?: unknown | null; next?: unknown | null } | undefined>;
      histories: Record<string, unknown[] | undefined>;
  }): T[]
  ```

- [ ] **Step 1: 失敗するテストを書く**
  - `it('current があり今日の履歴が空の運用を返す')`
  - `it('current が無くても prev と next の両方があれば（折り返しの間）返す')`
  - `it('出庫前（prev なし）・入庫後（next なし）は返さない')`
  - `it('今日の履歴が 1 件でもあれば返さない')`
  - `it('在線か履歴がまだ無い（キーが無い）運用は返さない')`
  - `it('入力の並びを保つ')`
- [ ] **Step 2: 落ちることを確かめる**: `npx jest --testPathPatterns=select-sighting-call-operations` → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通ることを確かめる** → PASS
- [ ] **Step 5: コミット**: `feat: :sparkles: リアルタイムの目撃募集の対象を選ぶ`

### Task 3: 目撃募集の帯

**Files:**
- Create: `src/app/pages/operation/operation-real-time/components/operation-real-time-sighting-call/operation-real-time-sighting-call.component.{ts,html,spec.ts}`
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.{ts,html}`（帯を操作帯の下・凡例の上に置く。対象は `filterRealTimeOperations(sortedOperations, …)` → `selectSightingCallOperations` の順で computed に）

**Interfaces:**
- Consumes: Task 2、`UserState`（`isLoggedIn`・`isViewer`）、`OperationPostDialogService.open({ operationNumber })`、`operationNumberColor` パイプ
- Produces: `<app-operation-real-time-sighting-call [operations]="callOperations()" />`（input `operations: { operationNumber: string }[]`）

- 見た目: 貼り付かない白帯。凡例と同じ左右の余白（凡例の帯の外枠のクラスを読んで合わせる）・上下 8px。見出し「目撃募集」（太字・本文と同じ大きさ）と説明を 1 行目、チップを折り返して並べる。チップは `<button type="button">` で、背景は `operationNumber | operationNumberColor`、字の色と角丸と大きさは `app-operation-number-link` の見た目にそろえる（リンクではないので部品は使わない）。`aria-label` は「12K の目撃を投稿する」。

- [ ] **Step 1: 失敗するテストを書く**
  - `it('対象が 0 件なら何も描かない')`
  - `it('運用番号のチップを並べ、押すと運用番号を入れて投稿ダイアログを開く')`
  - `it('ゲストがチップを押すと /login?return_to=… へ送る')`
  - `it('viewer には描かない')`
  - real-time の component spec に `it('目撃募集の帯は絞り込み後の運用から選ぶ')` を足す
- [ ] **Step 2: 落ちることを確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通ることを確かめる** → PASS（real-time の既存の spec も通る）
- [ ] **Step 5: コミット**: `feat: :sparkles: リアルタイムに目撃募集の帯を出す`

### Task 4: libs に `/me` の 2 本を足す

**Files:**
- Modify: `src/app/libs/user/infrastructure/queries/user.query.ts`、`src/app/libs/user/usecase/user.service.ts`（＋ spec）
- Create: `src/app/libs/user/usecase/dtos/my-summary.dto.ts`、`src/app/libs/user/infrastructure/models/my-summary.model.ts`
- Modify: `src/app/libs/operation-sighting/infrastructure/queries/operation-sighting.query.ts`、`src/app/libs/operation-sighting/usecase/operation-sighting.service.ts`（＋ spec）、builder
- Create: `src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto.ts`、対応する model

**Interfaces:**
- Produces:
  ```ts
  export type SightingCorroboration = 'corroborated' | 'conflicting' | 'uncorroborated' | 'invalidated';
  export interface MySummaryDto {
      sightingCount: number; invalidatedCount: number;
      firstSightingAt: string | null; lastSightingAt: string | null;
      corroboration: Record<SightingCorroboration, number>;
  }
  export interface MyOperationSightingDto extends OperationSightingSummaryDto { corroboration: SightingCorroboration; }
  // UserService
  findMySummary(): Observable<MySummaryDto>                      // GET /v3/users/me
  // OperationSightingService
  findManyMine(params?: OperationSightingListParamsDto): Observable<MyOperationSightingDto[]>  // GET /v3/users/me/operation-sightings
  ```
  取得は既存の `findSummary`・`findManyByUserId` と同じ書き方（QueryCache を使わない・no-store）。

- [ ] **Step 1: 失敗するテストを書く**（`HttpTestingController` で URL・query・変換を確かめる。`limit`・`before` を渡したときと渡さないとき）
- [ ] **Step 2: 落ちることを確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通ることを確かめる** → PASS
- [ ] **Step 5: コミット**: `feat: :sparkles: 利用者と目撃情報の libs に本人の口を足す`

### Task 5: マイページのルート・ガード・入口

**Files:**
- Create: `src/app/pages/my-page/my-page.route.ts`、`src/app/pages/my-page/guards/my-page.guard.ts`（＋ spec）
- Modify: `src/app/app.route.ts`、`src/app/app.routes.server.ts`
- Modify: `src/app/layout/components/sidenav/sidenav.component.{ts,html,spec.ts}`、`src/app/layout/components/header/header.component.{ts,html,spec.ts}`

**Interfaces:**
- Produces: `myPageGuard: CanActivateFn`、`MY_PAGE_ROUTES`（パス無しの親に `canActivate: [myPageGuard]`・`runGuardsAndResolvers: 'always'`、子 `''` に Task 6 のコンポーネントを遅延ロード）。Task 6 ができるまで子は仮のコンポーネントでよい（Task 6 で差し替える）。
- ガードは `pages/moderation/guards/moderation.guard.ts` と同じ形。通すのはログイン中で viewer でない人。ゲストは `/login?return_to=…`、viewer は通知して `/`。

- [ ] **Step 1: 失敗するテストを書く**
  - guard: `it('reporter は通す')`、`it('ゲストは /login?return_to=%2Fmy-page へ')`、`it('viewer は / へ戻し通知する')`
  - sidenav: `it('ゲスト・viewer には「マイページ」を出さない')`、`it('reporter には「アカウント」の下に「マイページ」を出し、「管理」より上にある')`
  - header: `it('ログイン中は名前が /my-page へのリンク')`、`it('ゲストの「ゲスト さん」はリンクにしない')`
- [ ] **Step 2: 落ちることを確かめる** → FAIL
- [ ] **Step 3: 実装する**（server routes に `my-page` と `my-page/**` を `RenderMode.Client`・`NO_STORE` で）
- [ ] **Step 4: 通ることを確かめる** → PASS
- [ ] **Step 5: コミット**: `feat: :sparkles: マイページの入口とガードを足す`

### Task 6: マイページの画面

**Files:**
- Create: `src/app/pages/my-page/my-page.component.{ts,html,spec.ts}`、`stores/my-page.store.ts`（＋ spec）、`services/my-page.service.ts`（＋ spec）
- Modify: `src/app/pages/my-page/my-page.route.ts`（子を本物に差し替え）

**Interfaces:**
- Consumes: Task 4 の `findMySummary`・`findManyMine`、Task 5 のルート
- 手本: `pages/moderation/moderation-user`（ストアの summary・sightings・hasMore・hasFetched・firstFetchFailed・loadingQueue・世代番号、`replaceSightings`/`appendSightings` の重複排除、「もっと見る」の before）。日時は `pages/moderation/utils/format-tokyo-date-time.util.ts` を import して使う。運用番号は `app-operation-number-link`。
- 画面: カード 2 枚（`tw-rounded-card`・白・影なし）。①要約（投稿数・裏付けあり・別の運用の目撃あり・他の目撃なし・無効・最初と最後の投稿日時、下に注記）②一覧（目撃の日時・運用番号・編成番号・裏付けの言葉）と「もっと見る」。裏付けあり は緑系の字（新しい色を足すなら `docs/design.md` の色の節に書き、hex を直書きしない）、他の目撃なし・無効は灰、別の運用の目撃あり は色なし。

- [ ] **Step 1: 失敗するテストを書く**
  - store: `it('appendSightings は同じ id を二重に入れない')`、`it('古い世代の取得結果を捨てる')`
  - component: `it('要約の 4 つの内訳と注記を出す')`、`it('裏付けの値ごとに決めた言葉を出す')`、`it('0 件なら「まだ投稿がありません」とリアルタイムへのリンク')`、`it('もっと見るで最後の createdAt を before に渡す')`、`it('大見出し（h1/h2 のページ名）を置かない')`
- [ ] **Step 2: 落ちることを確かめる** → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 通ることを確かめる** → PASS。続けて `npx jest` 全体・`npm run build:prod`・`npm run lint`（lint はサンドボックス外）
- [ ] **Step 5: コミット**: `feat: :sparkles: マイページに投稿の要約と裏付けを出す`

### Task 7: ADR と目視（controller が行う）

**Files:**
- Create: `docs/adr/0021-sighting-call-and-my-page.md`（決定: 募集は client で導く・置き場・ゲストに見せる・マイページの入口・裏付けの言葉）

- [ ] **Step 1**: ADR を書いてコミット: `docs: :memo: 目撃募集とマイページの ADR を書く`
- [ ] **Step 2（controller）**: 手元（api は Task の api ブランチ・本番 DB を読む）で real-time を 320/375/768/1440 で開き、帯の折り返し・横はみ出し・凡例との縦の間隔を実測し目視。マイページを reporter と editor で開く。スクリーンショットは `.context/m13-*.png`。
