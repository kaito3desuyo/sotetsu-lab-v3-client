# 押せる範囲・見つからない表示の見出し・320px の横スクロール Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 小さすぎるリンクの押せる範囲を 24px 以上にし、見つからない表示のときヘッダーの見出しも「ページが見つかりません」にし、320px 幅のリアルタイムで出る 6px の横スクロールを無くす。

**Architecture:** 押せる範囲は、リンクの `::after` を上下に広げて作る（レイアウトの寸法は変えない）。見つからない状態は `PageNotFound` に signal を持たせ、layout のヘッダーの題がそれを読む。横スクロールは `app-filter-chips` の幅の決め方を直す。

**Tech Stack:** Angular 22・Tailwind（`tw-` 接頭辞）・jest

**Spec:** spec は無い。根拠はリポの外の `../.context/review-2026-11-12/fable-a11y.md` の中 5・9、低 12。

## Global Constraints

- 押せる範囲を広げても、見た目（文字・下線・位置・行の高さ）とレイアウト（要素の寸法）を変えない。WCAG 2.2 の 2.5.8（24×24 CSS px）を満たす高さにする。横は文字の幅のままでよい（同じ行の隣のリンクとの間に重なりを作らない）。
- 対象は、編成番号のリンク（`app-formation-number-link`）、列車番号のリンク（`app-trip-label`）、リアルタイムの 2 種類のカードで素の `<a>` で出している編成番号。運用番号のチップは 24px 高あるので対象外。駅別時刻表の「この運用で投稿」は 24×24 で基準を満たしているので触らない。
- 見つからない表示のときのヘッダーの見出しは `PageNotFound.title`（「ページが見つかりません」）。ページを移ったら元に戻る。見つかる状態に戻ったとき（`clear()`）も元に戻る。
- 320px の修正は `app-filter-chips` の中で行い、320px より広い幅の見た目を変えない。リアルタイム運用情報はロック済みのページなので、これ以外の変更をしない。

## Review Focus

- `::after` を広げたリンクが、同じ行や上下の行の別のリンクの押せる範囲を覆わないこと（上下に広げるのは行の高さに収まる分だけ）。
- `position: relative` を足したことで、親の `overflow` や `z-index` の重なりが変わらないこと（ヘッダーの sticky の上に出ない等）。
- 見つからない状態から別のページに移ったとき、ヘッダーの見出しが残らないこと。同じページで matrix だけ変えて正しい値に戻ったときも戻ること。

---

### Task 1: リンクの押せる範囲

**Files:** `src/app/shared/formation-number-link/formation-number-link.component.ts`・`src/app/shared/trip-label/trip-label.component.ts`・リアルタイムの運用順・編成順カードのテンプレート（素の `<a>` の編成番号）。各 spec。

- [ ] 落ちるテスト: 対象のリンクに押せる範囲を広げるクラス（例 `app-hit-area`）が付く。
- [ ] 実装: `styles.scss` に `.app-hit-area { position: relative; } .app-hit-area::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 24px; transform: translateY(-50%); }` のような規則を 1 つ置き、対象に付ける（Tailwind の任意値で書けるならそれでもよい）。
- [ ] テストが通る → コミット `fix: :wheelchair: 編成番号と列車番号のリンクの押せる範囲を 24px の高さにする`

### Task 2: 見つからない表示のヘッダーの見出し

**Files:** `src/app/core/page-not-found/page-not-found.ts`（＋ spec）・`src/app/layout/layout.component.ts`（＋ spec）。

- [ ] 落ちるテスト: `mark()` で `PageNotFound.active()` が true、`clear()` で false。Router の `NavigationStart` で false に戻る。layout の `pageTitle` は active のとき `PageNotFound.title`。
- [ ] 実装 → テストが通る → コミット `fix: :bug: 見つからない表示のとき、ヘッダーの見出しもページが見つかりませんにする`

### Task 3: 320px の横スクロール

**Files:** `src/app/shared/filter-chips/`（＋ spec）。

- [ ] 原因を確かめる: 320×640 のリアルタイムで chip が右 420px まで伸び、`scrollWidth` が 326 になる（レビューの実測）。どの要素の幅が viewport を超えるかをテンプレートとスタイルから特定し、報告に書く。
- [ ] 落ちるテスト（クラスや構造で押さえられる範囲で）→ 実装（幅が親を超えないようにする。折り返す作りならそのまま折り返し、横スクロールの作りなら中だけでスクロールさせる）→ コミット `fix: :lipstick: 320px の幅で絞り込みの chip が画面からはみ出さないようにする`

### 最後に

- 全体の `npx jest --ci --watchAll=false` と `npx ng lint`。
- コントローラが手元の画面で、390・1440 の前後のスクリーンショット（駅別時刻表・リアルタイム）と 320 のリアルタイムの `scrollWidth`、リンクの押せる範囲（`elementFromPoint` で上下 4px の所がリンクになるか）を確かめる。
