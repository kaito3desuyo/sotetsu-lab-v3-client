# 操作帯の畳み方・貼り付き・保存をそろえる Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 8 ページの操作帯を scroll 型の畳み方にそろえ、ボタンで畳んだ状態をページごとに保存する。

**Architecture:** `ControlBandComponent` の `collapse` を `'page' | 'box'` に改める。`'box'` は高さ固定のページ用で、`[data-control-band-scroll]` の中で利用者がスクロールしたら操作部を隠す。各ページのストアに `controlCollapsed` を持たせ、`withSettingsStorage` で保存する。

**Tech Stack:** Angular 22・@ngrx/signals・Tailwind（`tw-`）・Jest

**Spec:** `docs/superpowers/specs/2026-10-28-control-band-unify-design.md`

## Global Constraints

- テストは `npx jest --testPathPatterns=<path>`（サンドボックス内の `npm test` は落ちる）。
- コンポーネントは OnPush・standalone・`inject()`・private は `#`。クラスの付け外しは `[class]` で（`[ngClass]` 禁止）。
- 保存した `controlCollapsed` は `afterFirstRender`（`core/ssr/first-render.ts`）で包んでから帯に渡す（ADR-0014。SSR は開いた形）。
- コミットは `refactor: :recycle: …` などの Conventional Commits＋絵文字。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01FZB1eB3dTj4GQVxda71thf`。commit はサンドボックス外（GPG）。
- prettier はさわったファイルだけ（`npx prettier --write <file>`）。ディレクトリ単位で流さない。
- `.context/`・`.superpowers/` を add しない。

## Review Focus

- ダイヤグラムの「今」・時刻へ移る（プログラムのスクロール）で帯が隠れないこと。
- 重ねて開いた帯の中の `mat-select` を開いても、帯が閉じないこと（パネルは popover に出る。今の `onFocusOut` は `.cdk-overlay-container` しか見ていない）。
- ボタンで畳んだ状態でスクロールしても、「開く」がその場で広げる動きのままであること（スクロールで隠れた印を立てない）。
- 保存のないページに `withSettingsStorage` を足したら、route の `pageResolver(Store)` で `settingsReady` を待つこと（待たないと最初の描画で既定値が保存を上書きしうる）。
- 帯の中の選択欄・チップへの wheel・キーで隠れないこと（帯は `[data-control-band-scroll]` の外）。

---

### Task 1: 部品に `'box'` を足す

**Files:**
- Modify: `src/app/shared/control-band/control-band.component.ts`
- Modify: `src/app/shared/control-band/control-band.component.html`（要るときだけ）
- Test: `src/app/shared/control-band/control-band.component.spec.ts`

**Interfaces:**
- Produces: `export type ControlBandCollapse = 'page' | 'box';`、`collapse = input<ControlBandCollapse>('page')`。属性名 `data-control-band-scroll`（定数 `CONTROL_BAND_SCROLL_ATTR` として export）。`collapsed` は今の `model(false)` のまま。

- [ ] **Step 1: spec を `'scroll'`→`'page'`、`'manual'`→`'box'` に書き換え、`'box'` の失敗するテストを足す**
  - `box: [data-control-band-scroll] の中の wheel で操作部を隠し、ボタンは「開く」` — `contentHidden()` が true、`toggleLabel()` が `'開く'`、`collapsed()` は false のまま（保存しない）。
  - `box: touchmove と スクロールのキー（PageDown）でも隠す`
  - `box: 箱の外（帯の中を含む）の wheel では隠さない`
  - `box: scroll イベントだけでは隠さない`
  - `box: 隠れた後の「開く」は重ねて開き（open() が true・幕が出る）、閉じると隠れたまま`
  - `box: 畳む・広げるはその場（collapsed が切り替わり、open() は false のまま）`
  - `box: ボタンで畳んでいる間に箱をスクロールしてから「開く」と、その場で広げる`
  - `box: sticky にせず、--control-band-offset を入れない`

- [ ] **Step 2: 走らせて落ちるのを見る** — `npx jest --testPathPatterns=src/app/shared/control-band/control-band.component.spec.ts`

- [ ] **Step 3: 実装**
  - `'page'` は今の `'scroll'` の分岐をそのまま。`'box'` は今の `'manual'` の分岐を土台にする。
  - `'box'` に `readonly #scrolledAway = signal(false)` を足す。`document` の `wheel`・`touchmove`（`{ passive: true }`）・`keydown`（`SCROLL_KEYS`）を `afterNextRender` で `'box'` のときだけ聞き、`(event.target as Element | null)?.closest?.('[data-control-band-scroll]')` に当たり、かつ `!collapsed() && !open()` のときに true にする。DestroyRef で外す。
  - `'box'` の `contentHidden` は `(collapsed() || #scrolledAway()) && !open()`。
  - `'box'` の `#canCollapse` は `!open() && !collapsed() && !#scrolledAway()`。
  - `'box'` の `toggle()`: `open()` なら閉じる／`#canCollapse()` なら settle して畳む／`collapsed()` なら settle して広げる／それ以外（スクロールで隠れた）なら `open.set(true)`。
  - `'box'` で重ねて開くときの置き方は、今の `'scroll'` の dropdown（`tw-absolute tw-inset-x-0 tw-top-full …`）を使う。条件は「`'box'` で `#scrolledAway()` かつ `!collapsed()` かつ（`open()` か settle 中でない）」。
  - `onFocusOut` は popover に出る Material のパネルへ移るときも閉じない（`next.closest('.cdk-overlay-container, [popover]')`）。spec を 1 本足す。
  - ファイル先頭のコメント（貼り付きと折りたたみ）を `'page'`・`'box'` の説明に書き直す。

- [ ] **Step 4: 通るのを見る**（同じコマンド）

- [ ] **Step 5: Commit** — `refactor: :recycle: 操作帯の型を page と box にし、box は箱のスクロールで畳む`

### Task 2: 8 ページをつなぐ

**Files:**
- Modify: `src/app/pages/train-diagram/train-diagram.component.html`（`collapse="box"`）
- Modify: `src/app/pages/train-diagram/components/train-diagram-chart/train-diagram-chart.component.html`（`#scrollHost` に `data-control-band-scroll`）
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.html`（`collapse="box"`）
- Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-table/timetable-all-line-table.component.html:31`（`tw-overflow-auto` の箱に `data-control-band-scroll`）
- Modify（`page` の 6 ページ）: 各ページの `stores/*.store.ts`・`*.component.ts`・`*.component.html`、保存の無かった 4 ページ（timetable-station・operation-past-time・operation-route-diagram・train-location）は `*.route.ts` も。operation-route-diagram は `operation-route-diagram-route-filter` が帯を包むので、全線の route-filter と同じく `collapsed` の input と `collapsedChange` の output を通す。
- Test: さわったページの既存 spec

**Interfaces:**
- Consumes: Task 1 の `collapse` 型と属性名。
- Produces: 各ストアに `controlCollapsed: boolean`（初期値 false）と `setControlCollapsed(collapsed: boolean): void`。全線・ダイヤグラムの既存の名前と同じ形にそろえる（既存のメソッド名がちがうならそれに合わせる）。

- [ ] **Step 1: 各ストアの spec に `controlCollapsed` が `withSettingsStorage` の fields に入っていることのテストを足す**（既存の全線・ダイヤグラムの spec に同種のテストがあれば、それを写す。無ければ `setControlCollapsed(true)` で `controlCollapsed()` が true になることだけ）
- [ ] **Step 2: 落ちるのを見る**
- [ ] **Step 3: 実装**
  - 保存の無い 4 ページ: `withSettingsStorage<StoreProps>({ key: '<StoreName>', fields: ['controlCollapsed'] })` を足し、route を `pageResolver(<Store>)` にする。key はストアのクラス名（既存の慣習）。
  - 保存のある 2 ページ（operation-real-time・operation-table）: fields に `'controlCollapsed'` を足す。
  - 各ページのコンポーネント: `readonly controlCollapsed = afterFirstRender(this.#store.controlCollapsed, false)` などで包み（全線・ダイヤグラムの書き方をそのまま写す）、帯に `[collapsed]="controlCollapsed()" (collapsedChange)="onControlCollapsedChange($event)"`。
- [ ] **Step 4: 通るのを見る** — さわった spec と `control-band` の spec、それと `npx tsc -p tsconfig.app.json --noEmit`
- [ ] **Step 5: Commit** — 2 つに分ける: `refactor: :recycle: 列車ダイヤグラムと全線時刻表の操作帯を箱のスクロールで畳む` と `feat: :sparkles: 操作帯を畳んだ状態をページごとに保存する`

### Task 3: 実画面で確かめる（Opus が行う）

- [ ] 手元の dev（`npm run dev`、本番 DB）で、412px と 1440px。spec の「確かめ方」の 3 つ目を全部。8 ページで畳む→再読み込み→畳んだまま。
- [ ] `npm run lint`（サンドボックス外）と `npx jest`（全体）。

### Task 4: 文書

- [ ] `docs/design.md`「操作帯は貼り付き、どこからでも開ける」に、page と box・保存を書き足す（2026-10-28・ユーザー判断 4 つ）。
- [ ] `docs/adr/0019-control-band-unify.md`（背景・決定・高さ固定をやめない理由）。
- [ ] ADR-0018 の結果に本番 Lighthouse（v2.19.1）を足す（前回からの持ち越し）。
- [ ] Commit — `docs: :memo: 操作帯をそろえた決定を ADR と design.md に書く`
