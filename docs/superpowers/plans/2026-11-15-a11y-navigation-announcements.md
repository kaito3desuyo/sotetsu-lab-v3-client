# キーボードと読み上げでの移動・知らせ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 閉じたサイドナビを Tab の順から外し、本文へ移動のリンク・ページを移ったときのフォーカスと題の読み上げ・読み込みと失敗の知らせを足して、キーボードとスクリーンリーダーで迷わないようにする。

**Architecture:** layout（`src/app/layout/`）でサイドナビの開閉とフォーカス、本文へ移動、移動後のフォーカスを扱う。本文の `main` は各ページが持つので、layout は `router-outlet` の隣の要素から `main` を探してフォーカスする（各ページに id を足さない）。読み上げは CDK の `LiveAnnouncer`。

**Tech Stack:** Angular 22・Angular Material / CDK a11y・Tailwind（`tw-` 接頭辞）・jest

**Spec:** spec は無い。決定はこの計画と会話による。根拠は `../.context/review-2026-11-12/fable-a11y.md` の 1・2・9（リポの外。読まなくてよい。必要な所はこの計画に写した）。

## Global Constraints

- 見た目は変えない。例外は「本文へ移動」のリンクが Tab でフォーカスしたときだけ左上に出ることだけ。
- 画面の文は「本文へ移動」「読み込み中」だけを足す。ほかの文言は変えない。
- サイドナビの開閉のアニメーション（`@openClose`・`prefersReducedMotion`）は今のまま。
- 移動後のフォーカスは、path（matrix・query を除いた区切りの並び）が変わったときだけ動かす。操作帯でダイヤや駅を選び直すだけの移動（matrix・query だけが変わる）ではフォーカスを動かさない。ブラウザでの最初の表示でも動かさない。
- SSR で落ちないこと（`document`・`window` を直に触る所は `isPlatformBrowser` か `afterNextRender` の中）。
- コンポーネントは OnPush・standalone・`inject()`・private は `#`（CLAUDE.md）。Tailwind は `tw-` 接頭辞、border を付けるなら `tw-border-solid`。
- リアルタイムの socket の合図で出していた「更新中...」の snackbar をやめる（ユーザー判断 2026-11-15）。終わったときの「データが更新されました」と失敗のときの「データの取得に失敗しました」は残す。

## Review Focus

- 操作帯で選び直したとき（例 `/operation/table;calendar_id=A` → `;calendar_id=B`）にフォーカスが `main` へ飛ばないこと。
- サイドナビのリンクで別ページへ移ったとき、フォーカスが閉じたサイドナビの中に残らず、新しいページの `main` に移ること。
- Esc と背景のクリックで閉じたときはハンバーガーへ戻ること。開いていないときの Esc は何もしない（ダイアログの Esc を邪魔しない）。
- `main` へのフォーカスでスクロール位置が動かないこと（`preventScroll: true`。スクロールの復元は `withInMemoryScrolling` に任せる）。
- 「本文へ移動」を押したときも、`main` に `tabindex` が無ければ `-1` を付けてからフォーカスすること。

---

### Task 1: サイドナビを閉じている間は触れないようにし、開閉でフォーカスを動かす

**Files:**
- Modify: `src/app/layout/layout.component.ts`・`layout.component.html`
- Modify: `src/app/layout/components/header/header.component.ts`・`header.component.html`
- Test: `src/app/layout/layout.component.spec.ts`（無ければ作る）・`src/app/layout/components/header/header.component.spec.ts`

**Interfaces:**
- Produces: `LayoutComponent` に `close(reason: 'escape' | 'backdrop' | 'navigation'): Promise<void>`。`toggle()` は残す（ヘッダーのボタン用）。Task 2 が「navigation で閉じたときはハンバーガーへ戻さない」ことを前提にする。
- Produces: `HeaderComponent` に `input<boolean>` の `menuOpen` と、ハンバーガーにフォーカスを戻す `focusMenuButton(): void`（`viewChild` で button の ElementRef を持つ）。

- [ ] **Step 1: 失敗するテストを書く**
  - サイドナビの host（`app-sidenav`）に `id="app-sidenav"` があり、閉じている間は `inert` 属性があり、開くと無くなる。
  - ハンバーガーに `aria-controls="app-sidenav"` があり、`aria-expanded` が閉じて `"false"`・開いて `"true"`。ボタンの `aria-label` は「メニュー」（開閉の状態は aria-expanded が伝えるので「開く」を外す）。
  - 開いたら、サイドナビの中で最初にフォーカスできる要素（今は「TOP」のリンク）に `document.activeElement` が移る。
  - 開いているときに `document` で Escape の keydown を送ると閉じ、フォーカスがハンバーガーに戻る。閉じているときの Escape では何も起きない（`toggle` が呼ばれない）。
  - 背景（`isVisibled` のときの overlay）をクリックすると閉じ、フォーカスがハンバーガーに戻る。
  - `NavigationEnd` で閉じたときは、ハンバーガーにフォーカスを戻さない。
- [ ] **Step 2: テストが落ちることを確かめる**（`npx jest --ci --watchAll=false src/app/layout`）
- [ ] **Step 3: 実装する**
  - `layout.component.html`: `app-sidenav` に `id="app-sidenav"` と `[inert]="!isOpen()"`。overlay の `(click)` は `close('backdrop')`。`app-header` に `[menuOpen]="isOpen()"`。
  - 開くとき（`toggle` で next が true）は、`isOpen.set(true)` のあと次の描画で（`afterNextRender` か `wait(0)`）サイドナビの最初のフォーカスできる要素にフォーカスする。CDK の `InteractivityChecker` か `FocusTrapFactory` の `focusFirstTabbableElement` を使ってよい。フォーカスの閉じ込めはしない（モーダルではない。背景のクリックで閉じる今の挙動のまま）。
  - Esc は `host: { '(document:keydown.escape)': … }` で受け、開いているときだけ `close('escape')`。
  - `close('escape' | 'backdrop')` は閉じたあと `HeaderComponent.focusMenuButton()` を呼ぶ。`'navigation'` は呼ばない。今の `NavigationEnd/NavigationCancel` の購読は `close('navigation')` に替える。
- [ ] **Step 4: テストが通ることを確かめる**
- [ ] **Step 5: コミット** `fix: :wheelchair: 閉じたサイドナビに Tab で入らないようにし、開閉でフォーカスを動かす`

### Task 2: 本文へ移動のリンクと、ページを移ったときのフォーカスと読み上げ

**Files:**
- Create: `src/app/core/a11y/focus-main-content.ts`（＋ spec）
- Modify: `src/app/layout/layout.component.ts`・`layout.component.html`・`src/styles.scss`（リンクの見た目を Tailwind で書けない所だけ）
- Test: `src/app/layout/layout.component.spec.ts`

**Interfaces:**
- Consumes: Task 1 の `close('navigation')`（ナビで閉じたときハンバーガーに戻さない）。
- Produces: `focusMainContent(container: HTMLElement): boolean` — `container` の中の最初の `main` を探し、`tabindex` が無ければ `-1` を付け、`focus({ preventScroll: true })` する。`main` が無ければ false。
- Produces: `routePathKey(url: UrlTree): string` — primary の区切りの path だけを `/` でつないだ文字列（matrix・query・fragment を除く）。同じファイルに置いてよい。

- [ ] **Step 1: 失敗するテストを書く**
  - `focusMainContent`: main があればフォーカスし `tabindex="-1"` を付ける（既に tabindex があれば変えない）。無ければ false。
  - `routePathKey`: `/operation/table;calendar_id=A` と `/operation/table;calendar_id=B?x=1` が同じキー、`/operation/table` と `/operation/real-time` が違うキー。
  - layout の先頭（`app-header` より前）に「本文へ移動」のリンクがあり、押すと router-outlet の隣の `main` にフォーカスが移り、URL は変わらない（`preventDefault`）。
  - ブラウザで path が変わる `NavigationEnd` のあと、`main` にフォーカスが移り、`LiveAnnouncer.announce` が `document.title`（Title サービスの値）で 1 回呼ばれる。
  - matrix だけが変わる `NavigationEnd` ではフォーカスも announce も起きない。
  - 最初の `NavigationEnd`（`withEnabledBlockingInitialNavigation` のため layout ができる前に済むことが多いが、来ても）では動かない。
- [ ] **Step 2: テストが落ちることを確かめる**
- [ ] **Step 3: 実装する**
  - リンクは `<a href="#" class="app-skip-link" (click)="onSkipToMain($event)">本文へ移動</a>` を layout の先頭に置く。ふだんは見えない（`tw-sr-only` 相当）。`:focus` のときだけ左上（top 8px・left 8px）に、白地・`--color-structure` の字・下線・四隅 8px・影で出し、ヘッダーより手前（z-index 40 以上）にする。Tailwind の `tw-sr-only focus:tw-not-sr-only …` で書けるならそれで、書けない所だけ `styles.scss` の `.app-skip-link` に置く。
  - router-outlet を包む div に template 参照を付け、`viewChild` で持つ。`onSkipToMain` と移動後の処理はこの要素を `focusMainContent` に渡す。
  - 移動後: 直前に処理した `routePathKey` を持ち、`NavigationEnd` の `urlAfterRedirects` を `router.parseUrl` したキーが変わったときだけ、`afterNextRender`（ページの描画のあと）で `focusMainContent` と `LiveAnnouncer.announce(title, 'polite')`。ブラウザのときだけ。
- [ ] **Step 4: テストが通ることを確かめる**
- [ ] **Step 5: コミット** `fix: :wheelchair: 本文へ移動のリンクを足し、ページを移ったら本文にフォーカスして題を読み上げる`

### Task 3: 読み込みと失敗の知らせ

**Files:**
- Modify: `<mat-progress-bar>` のある 12 ファイル（`shared/train-picker/train-picker.component.html`・`pages/dashboard/dashboard.component.html`・`pages/timetable/timetable-all-line/timetable-all-line.component.html`・`pages/timetable/timetable-station/timetable-station.component.html`・`pages/timetable/timetable-formation/timetable-formation.component.html`・`pages/operation/operation-table/operation-table.component.html`・`pages/operation/operation-route-diagram/operation-route-diagram.component.html`・`pages/operation/operation-real-time/operation-real-time.component.html`・`pages/train-diagram/train-diagram.component.html`・`pages/timetable/timetable-edit-form/timetable-edit-form.component.html`・`pages/train-location/train-location.component.html`・`pages/operation/operation-past-time/operation-past-time.component.html`。いずれも `src/app/` 配下）
- Modify: `src/app/shared/empty-state/empty-state.component.ts`・`.html`
- Modify: `src/app/shared/not-found-content/not-found-content.component.ts`・`src/app/pages/timetable/timetable-formation/timetable-formation.component.html`（`@case ('error')`）
- Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts`（socket の合図の購読）
- Test: 各 spec

**Interfaces:**
- Produces: `EmptyStateComponent` に `input<'h2' | null>` の `headingLevel`（既定 null）。null なら今の `<p>`、`'h2'` なら同じクラスの `<h2>`（見た目を変えない。`tw-m-0 tw-text-base tw-font-bold tw-text-ink`）。

- [ ] **Step 1: 失敗するテストを書く**
  - 12 か所の `mat-progress-bar` に `aria-label="読み込み中"` がある（1 つの spec で各テンプレートのファイルを読み、`<mat-progress-bar` の開きタグごとに `aria-label="読み込み中"` を含むことを確かめる形でよい。既存の `button-voice.spec.ts`・`design-text-color.spec.ts` と同じ書き方）。
  - `EmptyStateComponent`: 既定は `p`、`headingLevel="h2"` で `h2`（中身とクラスは同じ）。
  - `app-not-found-content` と編成別時刻表の `error` の表示は `h2` で出る。
  - リアルタイム: socket の合図 1 回で `NotificationService.open` は「データが更新されました」の 1 回だけ（「更新中...」は呼ばない）。失敗では「データの取得に失敗しました」の 1 回だけ。
- [ ] **Step 2: テストが落ちることを確かめる**
- [ ] **Step 3: 実装する**（上のとおり。`operation-real-time.component.ts` は `this.#notification.open('更新中...', 'OK');` の行を消す）
- [ ] **Step 4: テストが通ることを確かめる**
- [ ] **Step 5: コミット** `fix: :wheelchair: 読み込み中のバーに名前を付け、見つからない表示と読み込めなかった表示を見出しにする`

### 最後に

- `npx jest --ci --watchAll=false` 全体、`npx ng lint`。
- 手元の dev サーバー（proxy は `.context/proxy.local.json`）を Playwright で開き、390 と 1440 で次を確かめる: 最初の Tab で「本文へ移動」が出る／Enter で main へ／ハンバーガー→TOP へフォーカス／Esc で戻る／閉じた状態で Tab がヘッダーの 3 つの次に本文へ行く／サイドナビのリンクで移ると main にフォーカス／運用表でダイヤを選び直してもフォーカスが操作帯に残る。
- 残すもの（この PR ではしない）: 最初の読み込みの失敗のカード（#318）を `headingLevel="h2"` にするのは #318 のマージ後。骨組みの `div[aria-label="読み込み中"]` は触らない。
