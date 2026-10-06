# リアルタイム運用情報の帳票化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** リアルタイム運用情報の運用順・編成順のカード列を「1 枚の白地を罫線で区切る帳票」にして、情報を削らずに縦の密度を約 2 割上げる。

**Architecture:** 変えるのはテンプレートのクラスだけ。一覧（`-operation-table` / `-formation-table`）の外側を「角丸の白地（overflow-hidden）＋負のマージン 1px の grid」にする。各行（カードのホスト要素）に右と下の罫線を引き、端の罫線は白地の外にはみ出させて切り落とす。カード本体は角丸・白地を外し、余白を詰め、`h-full` で同じ段の高さにそろえる。ストア・サービス・カードの中身は触らない。

**Tech Stack:** Angular 20 standalone（OnPush）、Tailwind 3（`tw-` 接頭辞・preflight 無効）、Jest（`npx jest`）、Playwright MCP（実データ検証）

**Spec:** `docs/superpowers/specs/2026-10-06-real-time-ledger-layout-design.md`

## Global Constraints

- 情報は削らない（カードの中の要素・並び・鮮度の色・取得中の表示・空の状態はそのまま）
- 横スクロールは 1440 / 768 / 375 / 320px のどれでも出さない
- Tailwind は `tw-` 接頭辞。枠は `tw-border-solid` を必ず併記（preflight 無効のため）。`divide-*` は使わない
- class は native `[class]` / 静的 `class`。`[ngClass]` は使わない
- 罫線の色はトークン `rule`（`tw-border-rule`）
- 行の余白は上下 8px・左右 12px（`tw-px-3 tw-py-2`）、行の中の段の間は 2px（`tw-gap-y-0.5`）
- スマホ（lg 未満）1 列、PC（lg 以上）2 列
- ロック済みページなので **docs/design.md を先に改訂**し、docs のコミットをコードのコミットより先に置く
- prettier はファイル単位でのみ実行（ディレクトリ単位の `--write` 禁止）
- jest は `npx jest --testPathPattern=operation-real-time > .context/rt-jest.txt 2>&1`（`npm test` 禁止）
- コミットは Conventional Commits + 絵文字、GPG 署名（サンドボックス外で実行）、末尾に
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` と
  `Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH`

## Review Focus

1. PC で件数が奇数（絞り込みで 1 件・3 件など）→ 最後の空きマスは白、罫線は欠けず二重にもならない（Task 2 Step 5 の検査 `oddCheck`）
2. 絞り込みで 0 件 → `app-empty-state` だけが出て、空の白地や罫線の切れ端が出ない（Task 2 Step 5 の検査 `emptyCheck`）
3. 同じ段の 2 件で高さが違う（片方だけ履歴あり）→ 低い方も段の高さいっぱいに白く、縦の罫線が段の下まで通る（Task 2 Step 5 の検査 `rowFill`）
4. 上段 3 要素の縦中央そろえ（中心の差 0px）が、余白を詰めた後も崩れない（Task 2 Step 5 の検査 `centerDiff`）
5. 320px の細い画面で行の中身が溢れて横スクロールが出ない（Task 2 Step 5 の検査 `overflowX`）

---

## File Structure

| ファイル | 役割 | 変更 |
|---|---|---|
| `docs/design.md` | 掟 | 面の掟に帳票の例外、real-time ロック節の実測表と改訂履歴、ドメインの表示規則に 1 文 |
| `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-table/operation-real-time-operation-table.component.html` | 運用順の一覧 | 外側を帳票の白地に、各行に罫線 |
| `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-table/operation-real-time-formation-table.component.html` | 編成順の一覧 | 同上 |
| `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.html` | 運用順の 1 行 | 角丸・白地を外し、余白を詰め、`h-full` |
| `src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.html` | 編成順の 1 行 | 同上 |

これらの部品に既存の spec は無い。見た目だけの変更でロジックは増えないため、新しい jest は書かない。検証は Playwright の実データ検査（Task 2 Step 5）と既存の real-time 配下の jest で行う。

---

### Task 1: docs/design.md の掟を改訂する

**Files:**
- Modify: `docs/design.md`（面の掟 197〜202 行付近、real-time ロック節 402 行・428 行付近、「リアルタイム運用情報のカード」1197 行付近）

**Interfaces:**
- Consumes: なし
- Produces: Task 2 が従う掟の文言（帳票の例外）

- [ ] **Step 1: 面の掟に帳票の例外を足す**

`docs/design.md` の次の行の直後（「186 枚並ぶ画面では 1px の枠が視覚的な雑音になる」の行の後）に足す。

```markdown
-   **例外: 帳票**（ユーザー判断 2026-10-06）。同じ形の小さな記録が多数並ぶリストは、
    カードを並べず、**1 枚の白地を罫線で区切る**。罫線を引くのは白地の中の行の境だけで、
    カード同士の境に罫線を引かない掟はそのまま。
    使う所: `operation/real-time` の運用順・編成順。
    経緯: 利用者から「縦に間延びした」「帳票形式みたいな前の圧縮してた方が見やすかった」と声が上がった。
    実カードを複製して比べると、カードの縁の余白と間 12px を消すだけで、
    スマホ −21%・PC −20% 縮んだ（設計 `docs/superpowers/specs/2026-10-06-real-time-ledger-layout-design.md`）。
    上の「1px の枠は雑音」はカードごとに枠で囲うことへの判断で、行の境の罫線 1 本とは別物
```

- [ ] **Step 2: real-time ロック節の実測表を書き換える**

次の行を置き換える。

```markdown
| カード                        | 角丸 8px・**影なし・枠なし**                                                                          |
```

を

```markdown
| カード                        | **帳票**: 角丸 8px の白地 1 枚を罫線（`rule`）で区切る。行は余白 8/12px・PC は 2 列（面の掟の例外）  |
```

（表の列幅の空白は prettier に任せる。Step 5 で `docs/design.md` 単体に prettier をかける。）

- [ ] **Step 3: 改訂履歴に 1 行足す**

「5 項目（太字・下線・赤字・緑字・〇〇?）はそのまま。…」の行の直後に足す。

```markdown
-   2026-10-06 — 運用順・編成順のカード列を帳票（1 枚の白地を罫線で区切る）にした（面の掟の例外・ユーザー判断）。
    行の余白を 12px → 上下 8px・左右 12px、段の間を 4px → 2px。スマホ 1 列・PC 2 列はそのまま。
    カードの中身は変えていない。実測で 1 運用あたり約 96px → 約 76px（390px）
```

- [ ] **Step 4: ドメインの表示規則に 1 文足す**

「**下段は主キーの列に合わせず、カードの左端から全幅を使う**（同指示）。」の行の直後に足す。

```markdown
カードは帳票の 1 行として並ぶ（2026-10-06・面の掟の例外）。外側の作りが変わっただけで、以下の中身の規則はそのまま。
```

- [ ] **Step 5: 整形して差分を確かめる**

Run: `npx prettier --write docs/design.md`
Run: `git diff --stat`
Expected: `docs/design.md` だけが変わっている（`.serena/project.yml` の既存の差分は触らない・add しない）。

- [ ] **Step 6: コミット（サンドボックス外）**

```bash
git add docs/design.md
git diff --cached --stat
git commit -m "docs: :memo: リアルタイム運用情報の帳票化を掟に書く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 --format="%h %G? %s"
```

Expected: `--cached --stat` は `docs/design.md` の 1 ファイルだけ。署名は `G`。

---

### Task 2: 運用順・編成順を帳票にする

**Files:**
- Modify: `.../operation-real-time-operation-table/operation-real-time-operation-table.component.html`
- Modify: `.../operation-real-time-formation-table/operation-real-time-formation-table.component.html`
- Modify: `.../operation-real-time-operation-card/operation-real-time-operation-card.component.html`（外側の `<div>` の class とその上のコメント）
- Modify: `.../operation-real-time-formation-card/operation-real-time-formation-card.component.html`（外側の `<div>` の class）

（`...` = `src/app/pages/operation/operation-real-time/components`）

**Interfaces:**
- Consumes: Task 1 の掟
- Produces: なし（最終タスク）

**罫線の作り方（決定）:** 各行（カードのホスト要素）に**右と下**の罫線を引く。grid に `-tw-mb-px -tw-mr-px` を付け、外側の `tw-overflow-hidden` の白地で、一番下の段の下線と右端の列の右線を切り落とす。

- 行ごとの nth-child の判定が無いので、絞り込みで件数が変わっても罫線は欠けず、二重にもならない。
- 奇数件の最後の空きマスは白地の地色（白）のまま。その左の行の右線だけが縦に残り、表として自然に見える。
- スマホ 1 列では、右線は全部切り落とされる。

白地の中に sticky は無いので、`overflow-hidden` で角を丸めてよい（design.md「sticky を含むカードに付けてはならない」には当たらない）。

- [ ] **Step 1: 運用順の一覧を帳票にする**

`operation-real-time-operation-table.component.html` の

```html
    <div class="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-2">
        @for (operation of filteredOperations(); track operation.operationId) {
            <app-operation-real-time-operation-card
                [operation]="operation"
```

を次に置き換える（`@for` の中のほかの入力はそのまま。閉じタグ側は `</div>` を 1 つ増やす）。

```html
    <!-- 帳票: 1 枚の白地を罫線で区切る（docs/design.md 面の掟の例外・2026-10-06）。
         各行に右と下の罫線を引き、grid の負のマージン 1px で一番下の段の下線と
         右端の列の右線を白地の外へ出して切り落とす。件数が奇数でも欠けない -->
    <div class="tw-overflow-hidden tw-rounded-card tw-bg-white">
        <div class="-tw-mb-px -tw-mr-px tw-grid tw-grid-cols-1 lg:tw-grid-cols-2">
            @for (
                operation of filteredOperations();
                track operation.operationId
            ) {
                <app-operation-real-time-operation-card
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule"
                    [operation]="operation"
```

ファイル末尾は

```html
            ></app-operation-real-time-operation-card>
        }
    </div>
}
```

を

```html
                ></app-operation-real-time-operation-card>
            }
        </div>
    </div>
}
```

にする（インデントは Step 4 の prettier でそろう）。

- [ ] **Step 2: 編成順の一覧を帳票にする**

`operation-real-time-formation-table.component.html` も同じにする。

```html
    <div class="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-2">
        @for (formation of filteredFormations(); track formation.formationId) {
            <app-operation-real-time-formation-card
                [formation]="formation"
```

を

```html
    <!-- 帳票: 1 枚の白地を罫線で区切る（docs/design.md 面の掟の例外・2026-10-06）。
         作りは運用順の一覧と同じ -->
    <div class="tw-overflow-hidden tw-rounded-card tw-bg-white">
        <div class="-tw-mb-px -tw-mr-px tw-grid tw-grid-cols-1 lg:tw-grid-cols-2">
            @for (
                formation of filteredFormations();
                track formation.formationId
            ) {
                <app-operation-real-time-formation-card
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule"
                    [formation]="formation"
```

に、末尾の

```html
            ></app-operation-real-time-formation-card>
        }
    </div>
}
```

を

```html
                ></app-operation-real-time-formation-card>
            }
        </div>
    </div>
}
```

にする。

- [ ] **Step 3: カード本体を帳票の 1 行にする**

`operation-real-time-operation-card.component.html` の外側の `<div>`:

```html
    class="tw-grid tw-grid-cols-[auto_1fr_auto] tw-items-start tw-gap-x-3 tw-gap-y-1 tw-rounded-card tw-bg-white tw-p-3"
```

を

```html
    class="tw-box-border tw-grid tw-h-full tw-grid-cols-[auto_1fr_auto] tw-items-start tw-gap-x-3 tw-gap-y-0.5 tw-px-3 tw-py-2"
```

にする。その直前の 2 行構成のコメントの末尾（`-->` の前）に 1 行足す。

```html
     外側は帳票の 1 行（角丸・白地は一覧側の白地が持つ。2026-10-06）。h-full で同じ段の高さにそろえる。
```

`operation-real-time-formation-card.component.html` の外側の `<div>`:

```html
    class="tw-grid tw-grid-cols-[72px_1fr_auto] tw-items-start tw-gap-x-3 tw-gap-y-1 tw-rounded-card tw-bg-white tw-p-3"
```

を

```html
    class="tw-box-border tw-grid tw-h-full tw-grid-cols-[72px_1fr_auto] tw-items-start tw-gap-x-3 tw-gap-y-0.5 tw-px-3 tw-py-2"
```

にする。

ホスト要素は scss の `:host { display: block; }` のまま。grid の項目は既定で段の高さまで伸びるので、中の `tw-h-full` で白い行が段いっぱいになる。

- [ ] **Step 4: 整形・型・jest**

Run（1 ファイルずつ）:
`npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-operation-table/operation-real-time-operation-table.component.html`
`npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-formation-table/operation-real-time-formation-table.component.html`
`npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.html`
`npx prettier --write src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.html`

Run: `npx jest --testPathPattern=operation-real-time > .context/rt-jest.txt 2>&1`
Then: `grep -n "Tests:" .context/rt-jest.txt`
Expected: 失敗 0（変更前と同じ件数が通る）。

Run: `git diff --stat`
Expected: 上の 4 つの html だけ（prettier が無関係な行まで書き換えていたら、その部分は戻す）。

- [ ] **Step 5: Playwright で実データを検査する**

開発サーバー（`http://localhost:4200/operation/real-time`）で行う。`browser_console_messages` は呼ばない。

まず 390×844 で開き、5 秒待つ。それから次を `browser_evaluate` で流す。

```js
async () => {
  const vis = (s) => [...document.querySelectorAll(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const ops = vis('app-operation-real-time-operation-card');
  const fms = vis('app-operation-real-time-formation-card');
  const avg = (a) => Math.round(a.reduce((s, e) => s + e.getBoundingClientRect().height, 0) / Math.max(a.length, 1));
  const centerDiff = (cards, sels) => Math.max(0, ...cards.map((c) => {
    const g = c.firstElementChild;
    const ys = sels.map((s) => g.querySelector(':scope > ' + s)).filter(Boolean).map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
    return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
  }));
  const rowFill = [...ops, ...fms].every((c) => Math.abs(c.firstElementChild.getBoundingClientRect().height - c.clientHeight) <= 1);
  return {
    opCount: ops.length, opAvgHeight: avg(ops), fmCount: fms.length, fmAvgHeight: avg(fms),
    centerDiffOp: centerDiff(ops, ['.tw-col-start-1.tw-row-start-1', '.tw-col-start-2.tw-row-start-1', '.tw-col-start-3.tw-row-start-1']),
    centerDiffFm: centerDiff(fms, ['.tw-col-start-1.tw-row-start-1', '.tw-col-start-2.tw-row-start-1', '.tw-col-start-3.tw-row-start-1']),
    rowFill,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}
```

Expected（390px）:
- `opAvgHeight` が約 76 以下（変更前は 76〜100 に間 12px）。罫線 1px を含む。
- `centerDiffOp` と `centerDiffFm` は 1 以下（小数の丸めの誤差だけ）。
- `rowFill` は true、`overflowX` は false。

同じ検査を 1440×900 で流す（`fmCount` は PC の編成順側）。

Expected（1440px）:
- 運用順の最初の 12 件（6 段）の高さの合計が約 540px 以下。確かめ方は、12 件目の bottom から 1 件目の top を引く。
- `rowFill` は true、`overflowX` は false、`centerDiff` は 1 以下。

768×1024、375×812、320×640 でも `overflowX` が false であることを確かめる。

**oddCheck（奇数件）:** 1440px で操作帯を開く。運用群チップを 1 つだけ選び、運用順が奇数件になる群を探す（件数は帯の要約の「n/36 運用」で分かる）。そのうえで次を流す。

```js
() => {
  const sheet = document.querySelector('app-operation-real-time-operation-table .tw-overflow-hidden');
  const cards = [...sheet.querySelectorAll('app-operation-real-time-operation-card')].filter((e) => e.getBoundingClientRect().height > 0);
  const last = cards.at(-1).getBoundingClientRect();
  const s = sheet.getBoundingClientRect();
  return { count: cards.length, lastRight: Math.round(last.right), sheetRight: Math.round(s.right), lastBottomClipped: last.bottom >= s.bottom - 0.5 };
}
```

Expected: `count` が奇数。`lastRight` はおよそ白地の中央（`sheetRight` よりも 300px 前後左）。`lastBottomClipped` は true（最後の段の下線は切り落とされている）。

そのうえでスクリーンショットを撮り、次を目視で確かめる。
- 最後の空きマスは白い。
- 縦の罫線は最後の行の右だけに見え、その下に罫線の切れ端が無い。

**emptyCheck（0 件）:** 一致する運用が無い絞り込みにする。たとえば、ある会社のチップだけを選び、その会社の編成が今日は 1 件も目撃されていない状態を作る。作れなければ、そう報告して飛ばしてよい。

Expected:
- `app-empty-state` が出る。
- `.tw-overflow-hidden.tw-rounded-card` の白地は出ない（`@if` で空の状態と分かれているため）。

最後に、390px と 1440px で運用順・編成順のスクリーンショットを撮って目視で確かめる。390px は運用順と編成順のタブを両方開いて撮る。
- 罫線の色
- 角丸
- 縦の罫線が段の下まで通っているか
- 余白
- 文字の重なりが無いか

- [ ] **Step 6: コミット（サンドボックス外）**

```bash
git add src/app/pages/operation/operation-real-time/components/operation-real-time-operation-table/operation-real-time-operation-table.component.html src/app/pages/operation/operation-real-time/components/operation-real-time-formation-table/operation-real-time-formation-table.component.html src/app/pages/operation/operation-real-time/components/operation-real-time-operation-card/operation-real-time-operation-card.component.html src/app/pages/operation/operation-real-time/components/operation-real-time-formation-card/operation-real-time-formation-card.component.html
git diff --cached --stat
git commit -m "feat: :lipstick: リアルタイム運用情報のカード列を帳票にして縦を詰める

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 --format="%h %G? %s"
```

Expected: `--cached --stat` は 4 ファイル。署名は `G`。
