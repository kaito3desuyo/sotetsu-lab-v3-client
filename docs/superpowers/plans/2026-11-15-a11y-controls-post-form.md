# 操作部品の名前・投稿フォーム・見出しの段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 読み上げで「何を選ぶ群か」「どこが見出しか」が分かるようにし、投稿フォームをキーボードと読み上げで迷わず送れるようにする。見た目は変えない。

**Architecture:** 共通部品（`app-filter-chips`・`app-segment-toggle`）に名前の入力を足して各所から渡す。投稿フォームは送信ボタンを `disabled` から `aria-disabled` に替え、押せない理由を欄のエラーとして見せる。サイドナビの小見出しを h2 にし、二重の navigation をやめる。

**Tech Stack:** Angular 22・Angular Material / CDK・Tailwind（`tw-` 接頭辞）・jest

**Spec:** spec は無い。根拠はリポの外の `../.context/review-2026-11-12/fable-a11y.md` の中 4・6・7、低 11、11/12 から残る「ダイヤグラムのスクロール領域」。

## Global Constraints

- 見た目は変えない。送信ボタンの半透明（押せないときの見た目）も今のまま残す。
- 足す文言は次だけ（読み上げ用で、画面には出ない）:
  - 絞り込みの chip の群: 近くに見える見出しやラベルの文言をそのまま使う。無ければ「{対象}で絞り込み」（例「会社で絞り込み」「運用群で絞り込み」「路線で絞り込み」）。
  - `app-segment-toggle` の群: 投稿フォームの時刻の指定は「目撃時刻の指定」、上り／下りは「方向」、列車位置情報の表示の切り替えは選択肢の中身から短く（例「表示」）。
  - リアルタイムのスマホのタブ帯: 「並び順」。
  - ダイヤグラムのスクロール領域: 「ダイヤグラム」。
  - 投稿の失敗: snackbar と同じ文をそのまま、画面に出さない `role="alert"` の領域にも入れる。
- リアルタイム運用情報はロック済みのページ。見た目に触れる変更はしない（属性だけ）。
- `design-heading.spec.ts`（h2 は 18px）の対象から、サイドナビの小見出しを外してよい（見た目を変えないため。#319 で空の状態を外したのと同じ扱い）。

## Review Focus

- 送信ボタンを `aria-disabled` にしたあと、送信中・一覧の取り直し中に二重送信できないこと（押しても何もしない）。
- 入力が足りないときに押すと、最初の足りない欄にフォーカスが移り、`mat-error` が出ること。
- 投稿ダイアログの最初のフォーカスが最初の欄になること。ログインしていないゲストの表示（欄が無い）でも落ちず、ダイアログの中にフォーカスが入ること。
- サイドナビの小見出しを h2 にしても、文字の大きさ・太さ・余白が変わらないこと。

---

### Task 1: 群の名前（chip・segment-toggle・タブ帯）とダイヤグラムのスクロール領域

**Files:** `src/app/shared/filter-chips/`・`src/app/shared/segment-toggle/`・`app-filter-chips` と `app-segment-toggle` を使う各テンプレート（grep で探す）・`pages/operation/operation-real-time/operation-real-time.component.html`（`mat-tab-group`）・ダイヤグラムのスクロール領域（`pages/train-diagram/` の `tw-overflow-auto` の div）。

- [ ] 落ちるテスト: 部品に `ariaLabel` の入力があり、`mat-chip-listbox`／`mat-button-toggle-group` に `aria-label` として出る。各使い所で名前が渡っている（使い所ごとの spec か、テンプレートを読む spec のどちらか）。train-diagram の `app-segment-toggle` は今ホストに `aria-label="方向"` を付けているので、入力に移す。タブ帯の `aria-label="並び順"`。ダイヤグラムのスクロール領域が `tabindex="0"`・`role="region"`・`aria-label="ダイヤグラム"`。
- [ ] 実装 → テストが通る → コミット `fix: :wheelchair: 絞り込み・切り替え・タブの群とダイヤグラムの領域に名前を付ける`

### Task 2: 投稿フォーム

**Files:** `src/app/shared/operation-post-dialog/operation-post-dialog.service.ts`・`src/app/shared/operation-post-card/operation-post-form.component.*`・`app-button`（`aria-disabled` を受けられないなら入力を足す）・ヘルプのシート（`layout/components/header/header.component.ts` の `bottomSheet.open`）。

- [ ] 落ちるテスト:
  - ダイアログを開いた直後のフォーカスが最初の欄（今は「所属」）。欄が無いゲストの表示では、ダイアログの中のどこか（閉じるボタンでよい）。
  - 送信ボタンは `disabled` 属性を持たず、押せないとき `aria-disabled="true"`。押せない間に押しても送信しない。
  - 入力が足りないときに押すと、全部の欄を touched にし、最初の足りない欄にフォーカスが移る。
  - 送信が失敗したとき、snackbar と同じ文が `role="alert"` の見えない領域に入る。次に送るときに空にする。
  - ヘルプのシートに名前が付く（`ariaLabel` にシートの見出しの文言）。
- [ ] 実装 → テストが通る → コミット `fix: :wheelchair: 投稿フォームの最初のフォーカス・押せないときの知らせ・失敗の読み上げを直す`

### Task 3: サイドナビの見出しと navigation の入れ子、動きの抑制

**Files:** `src/app/layout/components/sidenav/sidenav.component.html`（＋ spec）・`src/app/design-heading.spec.ts`・`src/styles.scss`。

- [ ] 落ちるテスト: サイドナビの小見出し（時刻表・列車・運用情報・ライブラリ・このサイトについて など）が h2。`role="navigation"` はサイドナビの中で 1 つだけで、名前は「メインナビゲーション」。
- [ ] 実装: `h3 matSubheader` を `h2 matSubheader` に（見た目が変わるなら h3 と同じになるクラスを足す）。外側の `<nav>` を `div` にし、`mat-nav-list` に `aria-label="メインナビゲーション"`（`mat-nav-list` が `role="navigation"` を持つことを確かめてから。持たないなら外側の nav を残し、`mat-nav-list` の role を外す）。
- [ ] `prefers-reduced-motion: reduce` のとき、`mat-progress-bar` の不定の動きを止める（`styles.scss` に `.mdc-linear-progress__bar-inner` などのアニメーションを止める規則。動きを止めても読み込み中だと分かる帯は残す）。テストは CSS の規則がファイルにあることを確かめる程度でよい。
- [ ] テストが通る → コミット `fix: :wheelchair: サイドナビの見出しの段と navigation の重なりを直し、動きを抑える設定で読み込みのバーを止める`

### 最後に

- 全体の `npx jest --ci --watchAll=false` と `npx ng lint`。
- 手元の dev サーバーで、変更前後のスクリーンショット（サイドナビを開いた状態・投稿ダイアログ・列車ダイヤグラム）を比べる（コントローラが行う）。
