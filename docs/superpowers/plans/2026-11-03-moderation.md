# M18 投稿管理（client） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** EDITOR 以上が荒らしの投稿者を見つけてまとめて無効にし、MANAGER が BAN と手がかりの確認をできる画面（投稿管理の一覧・投稿者のページ・過去の運用表からの入口）を作る。

**Architecture:** api の `/v3/moderation/*`（api の計画 `docs/superpowers/plans/2026-11-03-moderation.md` の Task 4〜6）を `libs/moderation/` で包み、トップレベルのページ `pages/moderation/`（一覧と投稿者のページの 2 つの子ルート）から使う。どちらも CSR・ガード付き。

**Tech Stack:** Angular 22（standalone・OnPush・signals）・NgRx SignalStore・Angular Material（M2）・Tailwind（`tw-` 接頭辞）・Jest。

**Spec:** `docs/superpowers/specs/2026-11-03-moderation-design.md`（全体は api の同名の spec）

## Global Constraints

- 投稿管理の一覧・投稿者のページ・「この投稿者を見る」は `editor`・`manager` にだけ出す。BAN・解除・手がかりは `manager` だけ。
- 投稿者の名前は EDITOR 以上にだけ見せる。
- 自分と MANAGER のページには BAN のボタンを出さない。ゲスト（投稿者の無い目撃）は一覧で「ゲスト」と出し、投稿者のページへ行けない。
- 手がかりの表は `shared: true` の行を弱めて出す（`tw-opacity-50` 程度）。
- まとめての無効化と BAN は確認のダイアログを出し、件数と対象の名前を書く。理由は必須（BAN・まとめての無効化とも 1〜200 字）。
- `role === 'viewer'` の利用者には投稿フォームを出さず「投稿できません」と案内する。投稿が 403 で断られたら「投稿する権限がありません」と通知する。
- CLAUDE.md の「標準ページ構成パターン」に従う（ストアは `signalStore({ providedIn: 'root' })`・`inject()`・`#private`・OnPush・standalone・`[class]` バインディング）。`docs/design.md` の掟（操作帯・Material 部品・余白 4px・`tw-border-solid`）。
- SSR では描かない: `app.routes.server.ts` に `{ path: 'moderation', … RenderMode.Client, headers: NO_STORE }` と `moderation/**` を足す。
- テストは `npx jest --testPathPatterns=<path>`（サンドボックス下の `npm test` は落ちる）。prettier はファイル単位。

## Review Focus

1. EDITOR が投稿者のページを開く → BAN と手がかりの段が DOM に無い（隠すだけでなく取得もしない。MANAGER 専用の口を叩くと 403 になる）。→ Task 3 にテスト。
2. 直接 URL で `/moderation` を開いた REPORTER・ゲスト → ゲストは `/login?return_to=…`、REPORTER はトップへ戻して通知。→ Task 2 にテスト。
3. まとめての無効化の応答に `skipped`・`failed` がある → 何件無効にし、何件飛ばし、どこで止まったかを通知に出し、一覧を取り直す。→ Task 3 にテスト。
4. 投稿者の目撃が 0 件（登録しただけ）→ 空の状態を出し、まとめての無効化のボタンは押せない。→ Task 3 にテスト。
5. BAN 済みの人のページ → 「BAN 中」と出し、ボタンは「BAN を解く」になる。→ Task 3 にテスト。

---

### Task 1: `libs/moderation/` と役割

**Files:**
- Create: `src/app/libs/moderation/usecase/moderation.service.ts`（＋spec）、`usecase/dtos/*.dto.ts`、`infrastructure/queries/moderation.query.ts`、`infrastructure/commands/moderation.command.ts`、`infrastructure/models/*.model.ts`、`infrastructure/builders/*.builder.ts`（`libs/operation-sighting/` の分け方に倣う）
- Modify: `src/app/global-states/user.state.ts`（＋spec）

**Interfaces:**
- DTO は api の計画 Task 4〜6 の応答の形（`ModerationUserSummaryDto`・`ModerationSightingDto`・`ModerationRecentSightingDto`・`ModerationTraceDto`・まとめての無効化の結果 `ModerationBulkInvalidateResultDto`）をそのまま interface にする。
- `ModerationService`: `getUser(userId)`・`getUserSightings(userId, { limit?, before? })`・`getSightingAuthor(operationSightingId)`・`getRecentSightings({ limit?, before? })`・`getUserTraces(userId)`（Observable を返す）、`invalidateSightings({ ids, reason })`・`ban(userId, reason)`・`unban(userId, reason?)`。取得は `QueryCache` を使わない（毎回取る）。書いたら `QueryInvalidator.invalidate('sighting')`。
- `UserState` の computed に `canModerate: () => role === 'editor' || role === 'manager'`、`isManager: () => role === 'manager'`、`isViewer: () => role === 'viewer'`。

- [ ] **Step 1: テストを書く** — service spec: 「invalidateSightings は POST /v3/moderation/sightings/invalidate に ids と reason を送り、成功後に sighting を失効させる」「ban は POST /v3/moderation/users/:id/ban」。user.state spec: 「viewer は canModerate も canEditTimetable も false・isViewer は true」。
- [ ] **Step 2: FAIL → Step 3: 実装 → Step 4: PASS**
- [ ] **Step 5: コミット** — `feat: :sparkles: 投稿管理の API を包む libs を足す`

### Task 2: ルートとガード・投稿管理の一覧

**Files:**
- Create: `src/app/core/guards/moderation.guard.ts`（＋spec。`timetable-edit.guard.ts` と同じ形で `canModerate` を見る。通知の文言「投稿管理の権限がありません」）
- Modify: `src/app/app.route.ts`（`path: 'moderation'`・`canActivate: [maintenanceGuard, moderationGuard]`・`initialDataResolver`）、`src/app/app.routes.server.ts`
- Create: `src/app/pages/moderation/moderation.route.ts`、`pages/moderation/moderation-recent/`（一覧のページ・store・service・components）
- Modify: `src/app/layout/components/sidenav/sidenav.component.html`（`canModerate()` のときだけ「投稿管理」。アイコン `shield`）

**Interfaces:**
- ルート: `/moderation`（一覧）・`/moderation/users/:userId`（投稿者のページ・Task 3）。
- 一覧: 新しい順に 100 件。列は 投稿時刻・運番・編成・投稿者（名前・`newAccount` なら「登録して間もない」、`burst` なら「短い時間に多い」の小さな印）・状態。投稿者の名前は `/moderation/users/:userId` へのリンク。ゲストは「ゲスト」（リンクなし）。下に「もっと見る」（`before` = 最後の `createdAt`）。

- [ ] **Step 1: テストを書く** — guard spec: Review Focus 2 の 2 件と「editor は通す」。一覧の spec: 「ゲストの行は名前がリンクでない」「newAccount・burst の印が出る」「もっと見るで before を付けて取り足す」。
- [ ] **Step 2: FAIL → Step 3: 実装 → Step 4: PASS**
- [ ] **Step 5: 実データで見る** — 手元（api は本番 DB を読む）に EDITOR でログインし、412 と 1440 で一覧を開いてスクリーンショット。印の付き方を本番の 11/01〜02 の投稿で確かめる。
- [ ] **Step 6: コミット** — `feat: :sparkles: 投稿管理の一覧のページを足す`

### Task 3: 投稿者のページ

**Files:**
- Create: `src/app/pages/moderation/moderation-user/`（ページ・store・service・components: 要約・目撃の一覧・BAN・手がかり）、確認ダイアログ（`shared/` の既存の無効化ダイアログの作りに倣う）

**Interfaces:**
- 3 段（spec の下書き `user-page.png` どおり）: 要約 → 目撃の一覧（チェック・「まだ有効なものを全部選ぶ」・「選んだ N 件を無効にする」）→ `isManager()` のときだけ BAN と手がかり。
- 手がかりの取得（`getUserTraces`）は `isManager()` のときだけ呼ぶ。
- BAN のボタンは、表示中の人が自分でも `manager` でもないときだけ。BAN 中（`banned`）なら「BAN を解く」。
- 手がかりの `otherAccounts` は名前を `/moderation/users/:userId` へのリンクにし、`banned` は赤い印。

- [ ] **Step 1: テストを書く** — Review Focus 1・3・4・5 と「自分のページに BAN ボタンが無い」。
- [ ] **Step 2: FAIL → Step 3: 実装 → Step 4: PASS**
- [ ] **Step 5: 実データで見る** — 手元で EDITOR と MANAGER のそれぞれで開いてスクリーンショット（412・1440）。BAN・まとめての無効化は本番 DB に書くので押さない（押す確かめは保存テスト用のアカウントで、ユーザーと一緒に）。
- [ ] **Step 6: コミット** — `feat: :sparkles: 投稿者のページ（まとめての無効化・BAN・手がかり）を足す`

### Task 4: 過去の運用表の入口と viewer の投稿フォーム

**Files:**
- Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.{ts,html}`（＋spec）
- Modify: `src/app/shared/operation-post-card/operation-post-form.component.{ts,html}`（＋spec）

**Interfaces:**
- 目撃のセルの `contextMenus` に 3 つ目 `{ icon: 'person_search', text: 'この投稿者を見る', disabled: contextMenuDisabled() || !!sighting.sightedAsOperation, onClick }` を足す。押したら `getSightingAuthor` を呼び、`userId` があれば `/moderation/users/:userId` へ、null なら通知「ゲストの投稿です」。
- 投稿フォーム: `isViewer()` なら、今の「ログインが必要です」と同じ場所に「投稿できません」と出してフォームを出さない。投稿の応答が 403 なら通知「投稿する権限がありません」。

- [ ] **Step 1: テストを書く** — 「editor のメニューに『この投稿者を見る』がある・reporter には押せない」「author が null なら通知だけ」「viewer にはフォームでなく『投稿できません』」「403 で通知」。
- [ ] **Step 2: FAIL → Step 3: 実装 → Step 4: PASS**
- [ ] **Step 5: 実データで見る** — 手元の過去の運用表でメニューを開いたスクリーンショット（412・1440）。メニューの見た目が今と同じで 1 行増えただけであること。
- [ ] **Step 6: コミット** — `feat: :sparkles: 過去の運用表から投稿者のページへ行けるようにし、viewer には投稿フォームを出さない`

### Task 5: ADR

- Create: `docs/adr/0020-moderation.md`（client の ADR の書き方に倣う。ページの置き場・CSR・ガード・EDITOR と MANAGER の出し分け・ゲストの扱い）
- [ ] **Step 1: 書く → Step 2: コミット** — `docs: :memo: 投稿管理（M18）の ADR を書く`

## 計画の外（ユーザーと一緒に）

- プライバシーポリシー（#273）に「投稿・ログインのときの IP アドレスと端末の情報を 90 日持ち、管理者だけが荒らし対策に使う」旨を足す。#273 は文面の確認待ち。**api の手がかりの記録を本番に出す前に**出す。
