# 番号のリンクの名前と一覧の構造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 読み上げで「54」「8709」「6000」と番号だけが聞こえる所を「運用 54」「編成 8709」「列車 6000」にし、駅別時刻表・運用表・トップの最新目撃を一覧として読めるようにする。見た目は変えない。

**Architecture:** 番号を出す 3 つの共通部品（`app-operation-number-tag`・`app-formation-number-link`・`app-trip-label`）のリンクに `aria-label` を付ける（見える文字を含むので WCAG 2.5.3 を満たす。DOM の文字を増やさないので、コピーとページ内検索も今のまま）。一覧は `ul`/`li` にし、ブラウザ既定の余白と黒丸を Tailwind で消す。

**Tech Stack:** Angular 22・Tailwind（`tw-` 接頭辞・preflight 無効）・jest

**Spec:** spec は無い。根拠はリポの外の `../.context/review-2026-11-12/fable-a11y.md` の 3 と 8（必要な所はこの計画に写した）。

## Global Constraints

- 見た目は変えない（文字・色・余白・行の高さ・折り返し）。`ul`/`li` にするときは `tw-m-0 tw-list-none tw-p-0` を付け、`li` は元の要素と同じ display（block・flex・grid など）を保つ。
- `aria-label` の文言（全角空白でなく半角空白 1 つ）:
  - 運用番号のリンク: `運用 {番号}`（例「運用 54」「運用 01K」）
  - 編成番号のリンク: `編成 {番号}`（例「編成 8709」）
  - 列車番号のリンク: `列車 {番号}`（例「列車 6000」）
  - 番号の終わりが「?」（推測）なら、「?」を外して後ろに「（推測）」を付ける（例「編成 10706（推測）」「運用 11（推測）」）。「?」がリンクの外の文字として出ている所（リアルタイムの運用順カードなど）は、その「?」を `aria-hidden="true"` にし、リンクの名前に「（推測）」を入れる。
- リンクでない番号（span）には付けない。
- 駅別時刻表は 1 ページに 500 前後のセルがある。セルごとに要素を増やさない（`li` への置き換えと `aria-label` だけ）。時ごとの見出しは 1 時につき 1 個の `sr-only` の `h2`（文言「{時} 時」、例「5 時」）。
- 既存の spec が見える文字（`textContent`）で番号を探している所は、`aria-label` を足しても変わらないので直さなくてよいはず。アクセシブルな名前（`getByRole('link', { name })`）で探している spec が落ちたら、新しい名前に合わせる。

## Review Focus

- 「?」付きの番号のリンク名に「?」が残らず「（推測）」になること。リンクの外の「?」が二重に読まれないこと。
- `ul`/`li` にした所で、余白・黒丸・行の高さが変わらないこと（Playwright で前後のスクリーンショットを比べる）。
- `@for` の中で `li` を出すとき、`ul` の直下に `li` 以外（`@if` の中の div など）を置かないこと。

---

### Task 1: 3 つの共通部品のリンクの名前

**Files:** `src/app/shared/operation-number-tag/`・`src/app/shared/formation-number-link/`・`src/app/shared/trip-label/`（各 component と spec）。「?」をリンクの外に出しているページのテンプレート（`operation-real-time-operation-card.component.html` ほか、grep で探す）。

- [ ] 落ちるテスト: 各部品でリンクの `aria-label` が上の文言になる。「?」付きは「（推測）」。リンクでないとき（span）は `aria-label` が無い。
- [ ] 実装: 名前は computed で作る（`?` の扱いを 1 つの小さな関数 `toAccessibleNumber(prefix, value)` にまとめ、`src/app/shared/` に置いて 3 部品で使う）。
- [ ] リンクの外の「?」を出しているページは、その「?」を `aria-hidden="true"` にして、部品に推測であることを渡す（入力を足すか、番号に「?」を付けて渡すかは既存の作りに合わせて決める）。
- [ ] テストが通る → コミット `fix: :wheelchair: 運用・編成・列車の番号のリンクに、読み上げで何の番号か分かる名前を付ける`

### Task 2: 一覧を ul/li にする

**Files:** トップの最新目撃（`pages/dashboard/components/dashboard-latest-sightings/`）・運用表のカードの行（`pages/operation/operation-table/components/operation-table-card/`）・駅別時刻表（`pages/timetable/timetable-station/components/timetable-station-table/` と `timetable-station-trip-cell`）。

- [ ] 落ちるテスト: 最新目撃は 1 件ごとに `li`、運用表のカードは行ごとに `li`、駅別時刻表は時ごとに `section` の中に `sr-only` の `h2`「{時} 時」とセルの `ul > li`。
- [ ] 実装（Global Constraints の見た目の決まりを守る）。
- [ ] テストが通る → コミット `fix: :wheelchair: 最新目撃・運用表・駅別時刻表を一覧として読めるようにする`

### 最後に

- 全体の `npx jest --ci --watchAll=false` と `npx ng lint`。
- 手元の dev サーバー（`npx ng serve --host 0.0.0.0 --proxy-config .context/proxy.local.json`・サンドボックスの外・コントローラが立てる）で、変更前と変更後の 390・1440 のスクリーンショットを比べる。
