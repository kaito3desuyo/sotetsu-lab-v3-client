# 目撃の投稿フォームで推測の投稿を禁じる Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 投稿フォームに推測の投稿を禁じる警告を出し、端末ごとに最初の 1 回だけ「目撃した編成のみを投稿します」にチェックを入れさせる。

**Architecture:** チェックはフォームの `FormControl<boolean>`（`Validators.requiredTrue`）にして、今の「足りない欄があれば送らずその欄に移る」流れに乗せる。値は `OperationPostCardStore` の新しい欄に写し、`withSettingsStorage` で端末に覚えさせる。

**Tech Stack:** Angular 22・Angular Material（`mat-checkbox`）・@ngrx/signals・Jest

**Spec:** `docs/superpowers/specs/2026-11-26-post-no-guess-warning-design.md`

## Global Constraints

- 警告の文：「実際に目撃した編成のみを投稿してください。順送りなどから推測した編成の投稿は禁止しています。繰り返される場合は、投稿権限を剥奪することがあります。」（一字も変えない）
- チェックの文：「目撃した編成のみを投稿します」
- チェックが無いまま押したときの文：「チェックを入れてください」
- 警告のアイコン：`error_outline`
- 置き場所：目撃時刻（時刻の切り替え）の後、`<footer>` の「投稿する」の前
- Tailwind は `tw-` 接頭辞・`[class]` で書き、`ngClass` を使わない。border には `tw-border-solid` を添える
- 端末に覚える欄の名前：`noGuessAgreed`（`OperationPostCardStore`、`withSettingsStorage` の `fields` に足す）

## Review Focus

- 投稿に成功してフォームが空に戻るとき、チェックまで外れないこと（端末に覚えた値のまま残る）
- 端末に覚えた値は起動のあとに遅れて戻る。戻った値でチェックが入ること、そのとき `sighting_form_start` の GA が送られないこと
- チェックを外したら覚えも外れること
- 送る値（api に渡す本体）にチェックの値が混ざらないこと
- 押せない印（`aria-disabled`）が、チェックが無いときにも付くこと

---

### Task 1: 警告とチェックを足す

**Files:**
- Modify: `src/app/shared/operation-post-card/operation-post-card.store.ts`
- Modify: `src/app/shared/operation-post-card/operation-post-form.component.ts`
- Modify: `src/app/shared/operation-post-card/operation-post-form.component.html`
- Test: `src/app/shared/operation-post-card/operation-post-card.store.spec.ts`
- Test: `src/app/shared/operation-post-card/operation-post-form.template.spec.ts`
- Test: `src/app/shared/operation-post-card/operation-post-form.component.spec.ts`（送る流れを見ている spec は、チェックを入れた状態で始める）

**Interfaces:**
- Produces: `OperationPostCardStore.noGuessAgreed(): boolean`（初期値 false）と `setNoGuessAgreed(agreed: boolean): void`

- [ ] **Step 1: 落ちるテストを書く**
  - store：`setNoGuessAgreed(true)` で `noGuessAgreed()` が true になる
  - template：警告の文とチェックの文が出る／チェックが無いと「投稿する」に `aria-disabled` が付き、押しても送らず「チェックを入れてください」が出てチェックにフォーカスが移る／チェックを入れると store の `noGuessAgreed` が true になる／store が true ならフォームを開いたときチェックが入っている／投稿に成功したあともチェックが入ったまま
- [ ] **Step 2: `npx jest --testPathPatterns=src/app/shared/operation-post-card` で落ちるのを見る**
- [ ] **Step 3: 実装する**
  - store に `noGuessAgreed` と `setNoGuessAgreed` を足し、`fields: ['serviceAgencies', 'noGuessAgreed']` にする
  - フォームに `noGuessAgreed: FormControl<boolean>`（`nonNullable`・`Validators.requiredTrue`）を足す。初期値は store の値。store の値が後から変わったら `{ emitEvent: false }` で写す。チェックの変化は store に書く
  - 成功のあとにフォームを空に戻す所では、チェックを store の値に戻す
  - テンプレートに警告（`error_outline` と文）と `mat-checkbox formControlName="noGuessAgreed"` を置き、触れたあと無効なら下に「チェックを入れてください」を出す（`role` や `aria-describedby` は隣の欄の作りにそろえる）
- [ ] **Step 4: 同じ jest と、変えたファイルに `npx eslint`・`npx prettier --check` を流して通す**
- [ ] **Step 5: コミット** `feat: :sparkles: 目撃の投稿フォームで推測の投稿を禁じる`
