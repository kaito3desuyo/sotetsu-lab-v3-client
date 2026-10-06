# 操作帯の貼り付きと折りたたみ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 操作系がある 8 ページで、どのスクロール位置からでも絞り込みを変えられるようにする。絞り込みが効いていることも常に見えるようにする。

**Architecture:** 共通の帯 `app-control-band` に、2 つの動きを持たせる。

-   `scroll`：帯が画面の外へ出たら、ヘッダー直下に 40px の細帯として貼り付く。開くと、同じ操作部の DOM をページに重ねて広げる。
-   `manual`：ボタンで畳み、開くと押し広げる。

細帯の間は `<html>` の CSS 変数 `--control-band-offset` に 40px を入れる。貼り付く見出しや、画面の高さに合わせた箱は、その値を差し引く。要約の文は、帯を置くコンポーネントがページごとの純粋な関数で作る。

**Tech Stack:** Angular 20（standalone・signals・OnPush）、Angular Material M2、Tailwind 3.4（接頭辞 `tw-`・preflight 無効）、elf ＋ `@ngneat/elf-persist-state` ＋ localForage、Jest ＋ @testing-library/jest-dom。

**Spec:** `docs/superpowers/specs/2026-10-06-sticky-control-band-design.md`

## Global Constraints

-   細帯・畳んだ 1 行の高さは 40px（`tw-h-10`）に固定する。
-   ヘッダーの高さは 48px、md（768px）以上は 64px。
-   CSS 変数の名前は `--control-band-offset`。値は `40px`。使う側は必ず `var(--control-band-offset,0px)` と初めの値を付けて書く。
-   要約の文の形（spec の表どおり）：
    -   絞り込み中は「絞り込み中：A・B」、無いときは「絞り込み：なし」。
    -   路線は「路線：…」か「全路線」。
    -   ダイヤは「2026/3/14改正 平日」（`formatCalendarSummaryLabel`）。
-   絞り込みは「空＝全部」。何も選んでいなければ絞り込み中ではない。
-   Tailwind：
    -   クラスは必ず `tw-` 接頭辞を付ける。
    -   枠線は `tw-border-solid` を併記する。
    -   任意のプロパティは接頭辞なしで `[prop:value]` と書く。
    -   calc の中の空白は `_` で書く（例 `tw-max-h-[calc(100dvh_-_80px_-_var(--control-band-offset,0px))]`）。
    -   `[ngClass]` は使わず、native の `[class]` を使う。
-   Material で表せる部品は Material を使う（ボタンは `mat-button`、アイコンは `mat-icon`）。
-   prettier はファイル単位で `npx prettier --write <file>` を流す。ディレクトリ単位では流さない。
-   jest は `npx jest --testPathPattern=<pattern> > .context/jest-<name>.txt 2>&1` で流し、`Tests:` の行をファイルから読む（`npm test` は使わない）。
-   Bash でパイプはつながない。1 コマンド 1 目的で書く。
-   コミット：

    -   Conventional Commits ＋絵文字（例 `feat: :sparkles: …`）。本文は日本語。
    -   末尾に次の 2 行を付ける。

        ```
        Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
        Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH
        ```

    -   署名つきコミットは sandbox の外で打つ。打ったら `git log --format="%h %G? %s" -1` で `G` を確かめる。

-   ロック済みのページなので、コードより先に `docs/design.md` を直す（Task 1）。
-   `git push` はしない。

## Review Focus

1. 絞り込みでページが短くなり、ブラウザがスクロール位置を詰めたとき。展開したパネルは閉じない（scroll イベントで閉じない）。Task 3 にテストを入れる。
2. 細帯や展開のままで、帯の無いページへ移ったとき。`--control-band-offset` が残らない。Task 3 のテスト（destroy で消える）。
3. 768px をまたいで画面幅が変わったとき。細帯に切り替わる位置がヘッダーの高さに追従する。Task 3 のテスト（matchMedia の change で作り直す）。
4. 保存した群名・会社 ID が、もう存在しないとき。要約に「undefined」や空の名前が出ない。Task 6・8 のテスト（名前を引けない ID は飛ばす）。
5. 路線の選択肢がまだ空のとき（データ取得前）。「全路線」と出て、絞り込み中にならない。Task 2 のテスト。

---

## File Structure

| ファイル                                                                  | 役割                                                                              |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/design.md`（変更）                                                  | 「操作帯の貼り付きと折りたたみ」の節と、各ページの行                              |
| `docs/superpowers/specs/2026-10-06-sticky-control-band-design.md`（変更） | 読み込み中のバーの重なり順を、実装に合わせて直す（Task 1 の Ruling）              |
| `src/app/shared/control-band/control-band-summary.util.ts`（新規）        | 要約の部品：`formatFilterPart`・`formatRouteFilterSummary`・`isRouteFilterActive` |
| `src/app/shared/control-band/control-band.component.ts`（変更）           | 状態・観測・CSS 変数・開閉                                                        |
| `src/app/shared/control-band/control-band.component.html`（新規）         | 帯のテンプレート                                                                  |
| `src/app/shared/control-band/control-band.component.spec.ts`（新規）      | 帯のテスト                                                                        |
| 各ページの `utils/*-summary.util.ts`（新規）                              | ページごとの要約の文                                                              |
| 各ページのコンポーネント（変更）                                          | 帯に summary などを渡す                                                           |
| `train-diagram/stores/train-diagram.store.ts`（変更）                     | `controlCollapsed` と persistState                                                |
| `train-diagram/services/train-diagram-resolver.service.ts`（変更）        | `persistInitialized$` を待つ                                                      |

---

### Task 1: design.md に掟を書く

**Files:**

-   Modify: `docs/design.md`
    -   「面の掟」の中の「ページ上端の操作部…全幅の白い帯」の箇条（214〜226 行あたり）の直後に節を足す。
    -   各ロック済みページの節（365・447・518・584・679・749・846・919 行あたり）に 1 行ずつ足す。
-   Modify: `docs/superpowers/specs/2026-10-06-sticky-control-band-design.md`（読み込み中のバーの行）

**Interfaces:** なし（文書だけ）

> **Ruling（計画を書くときに決めた）：** spec は、読み込み中のバーを「変えない。細帯の上に重なる」としている。しかし帯は、ページ内の貼り付く物（最大 `tw-z-30`）より上に出す必要がある。そのため `tw-z-40`（幕）と `tw-z-50`（帯）を使う。すると、z の無いバーや `tw-z-30` のバーは細帯の下に隠れる。
> 細帯の上に出すため、8 ページのバーを `tw-z-[60]` にそろえる（Task 4）。spec のこの行も直す。
> 間違っていた場合の代償：バーの class が 1 語ずつ増えるだけで、戻すのは簡単。

-   [ ] **Step 1: spec の行を直す**

    `docs/superpowers/specs/2026-10-06-sticky-control-band-design.md` の、読み込み中のバーの表の行を次に置き換える。

    ```markdown
    | 読み込み中のバー（ヘッダーのすぐ下に固定） | `tw-top-[48px] md:tw-top-[64px]` | 位置は変えない。z を `tw-z-[60]` にそろえ、細帯（`tw-z-50`）の上に 4px の線として出す |
    ```

    重なりの順の箇条も直す。

    ```markdown
    -   重なりの順は、上から ヘッダー（ページの外・`tw-z-30`）＞ 読み込み中のバー `tw-z-[60]` ＞ 細帯・パネル `tw-z-50` ＞ 透明な幕 `tw-z-40` ＞ ページの中の貼り付く物（最大 `tw-z-30`）。
        ページは `layout` の `tw-relative tw-z-0` の中にあるので、どの値もヘッダーとドロワーより下になる。
    ```

-   [ ] **Step 2: design.md に節を足す**

    「ページ上端の操作部…」の箇条の最後の行（`帯の下とラベルの下だけ 4px 広がっていたので…打ち消す`）の直後に、空行を挟んで次を足す。

    ```markdown
    **操作帯は貼り付き、どこからでも開ける**（ユーザー指示 2026-10-06「絞り込みを、スクロールしても上に貼り付けたままにしてほしい（PC・スマホ）」「画面上のどの位置にいても折りたたまれた状態を開いて絞り込みを変更できるように」）。

    -   `app-control-band` の `collapse` は `scroll`（初めの値）と `manual` の 2 つ。
    -   `scroll`: 帯の下端がヘッダーの下に隠れたら、ヘッダー直下に高さ 40px の**細帯**として固定する。
        帯の元の位置には同じ高さの空きを残し、ページを跳ねさせない。
        細帯の「開く」で、同じ操作部をページに重ねて広げる（パネルの高さの上限は「画面 − ヘッダー − 40px」。はみ出す分はパネルの中でスクロール）。
    -   展開は「閉じる」・パネルの外を押す・Esc・利用者のスクロール（パネルの外での wheel・touchmove・スクロールするキー）で閉じる。
        チップや選択欄を操作しても閉じない。**scroll イベントでは閉じない**: 絞り込むとページが短くなり、
        ブラウザがスクロール位置を詰めるので、scroll イベントで閉じるとチップを押した瞬間に閉じてしまう。
        帯の元の位置が画面に戻ったら通常の状態に戻す。
    -   細帯の間は `<html>` に `--control-band-offset: 40px` を入れる。貼り付く見出し（駅別時刻表）と、
        画面の高さに合わせた箱（全線時刻表・過去の運用情報・運用行路図）は `var(--control-band-offset,0px)` を差し引く。
    -   `manual`（列車ダイヤグラム）: 帯の右端の「畳む」で 40px の 1 行にする。固定も重ねもしない。浮いた高さは図が使う。
        「開く」で押し広げて戻す。畳んだ状態は `TrainDiagramStore` の `controlCollapsed` に保存する（persistState）。
    -   細帯・畳んだ 1 行の中身: 要約の文（1 行・はみ出しは「…」）、［解除］、開閉のボタン。
        **絞り込み中は左端にアクセント色（`accent-500`）の縦線**を出す。［解除］は絞り込み中で、チップの絞り込みがあるページだけ。
    -   重なりの順: 読み込み中のバー `tw-z-[60]` ＞ 帯 `tw-z-50` ＞ 幕 `tw-z-40` ＞ ページの中の貼り付く物（最大 `tw-z-30`）。
    -   比べた代案: 細帯を別の部品にして操作部をもう 1 組出す案（テンプレートが二重になる）、ページごとに作る案（動きがそろわない）。
    ```

-   [ ] **Step 3: 各ページの節に 1 行ずつ足す**

    8 つのロック済みページの節で、既存の箇条の末尾に次の行を足す（ページごとに文を変える）。

    -   リアルタイム運用情報：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「絞り込み中：東急・K群（目黒線） 36/120 運用」か「絞り込み：なし」。［解除］は会社・運用群の選択を空にする`
    -   運用表：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「2026/3/14改正 平日 絞り込み中：G群（東横線） 5/90 運用」。［解除］は運用群の選択を空にする`
    -   過去の運用情報：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「10/6 から 7 日間 絞り込み中：東急」。［解除］は会社の選択を空にする`
    -   運用行路図：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「路線：本線・厚木線」か「全路線」。箱の高さは var(--control-band-offset,0px) を差し引く`
    -   全線時刻表：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「路線：相鉄の 4 路線」か「全路線」。箱の高さは var(--control-band-offset,0px) を差し引く`
    -   駅別時刻表：
        `-   操作帯は貼り付く（2026-10-06）。細帯の要約は「横浜 2026/3/14改正 平日 下り」。上り下りの帯と表の見出しの top は var(--control-band-offset,0px) を足す`
    -   列車位置情報：
        `-   操作帯は共通の app-control-band（外周の打ち消しなし）に載せ替えて貼り付く（2026-10-06）。細帯の要約は「本線 現在時刻（今日のダイヤ）」か「本線 8:00 指定 平日」`
    -   列車ダイヤグラム：
        `-   操作帯は共通の app-control-band（manual・外周の打ち消しなし）に載せ替え、畳めるようにした（2026-10-06）。畳んだ 1 行の要約は「本線 平日 下り」。畳んだ状態は保存する`

    過去の運用情報と運用行路図の節では、「画面の高さに合わせた箱」の記述がある行の近くに足す。

-   [ ] **Step 4: 整形してコミット**

    ```bash
    npx prettier --write docs/design.md
    npx prettier --write docs/superpowers/specs/2026-10-06-sticky-control-band-design.md
    git add docs/design.md docs/superpowers/specs/2026-10-06-sticky-control-band-design.md
    git commit -m "docs: :memo: 操作帯の貼り付きと折りたたみの掟を書く"
    ```

---

### Task 2: 要約の共通部品

**Files:**

-   Create: `src/app/shared/control-band/control-band-summary.util.ts`
-   Test: `src/app/shared/control-band/control-band-summary.util.spec.ts`

**Interfaces:**

-   Produces:

    -   `formatFilterPart(labels: string[]): string`
        -   空なら `'絞り込み：なし'`、それ以外は `'絞り込み中：' + labels.join('・')`。
    -   `formatRouteFilterSummary(options: FilterChipOption[], selected: FilterChipValue[]): string`
        -   「全路線」か、「相鉄の 4 路線・本線」のような本体。「路線：」は付けない。
    -   `isRouteFilterActive(options: FilterChipOption[], selected: FilterChipValue[]): boolean`
    -   `joinSummaryParts(parts: (string | null | undefined)[]): string`
        -   空でない部分を半角空白でつなぐ。

-   [ ] **Step 1: 落ちるテストを書く**

    ```ts
    import { FilterChipOption } from '../filter-chips/filter-chip-option.type';
    import {
        formatFilterPart,
        formatRouteFilterSummary,
        isRouteFilterActive,
        joinSummaryParts,
    } from './control-band-summary.util';

    const options: FilterChipOption[] = [
        { value: 'r1', label: '本線', group: '相鉄' },
        { value: 'r2', label: 'いずみ野線', group: '相鉄' },
        { value: 'r3', label: '厚木線', group: '相鉄' },
        { value: 'r4', label: '新横浜線', group: '相鉄' },
        { value: 'j1', label: '相鉄直通線', group: 'JR東日本' },
        { value: 't1', label: '東横線', group: '東急' },
        { value: 't2', label: '目黒線', group: '東急', disabled: true },
    ];

    describe('formatFilterPart', () => {
        it('空なら「絞り込み：なし」', () => {
            expect(formatFilterPart([])).toBe('絞り込み：なし');
        });
        it('選択を「・」でつなぐ', () => {
            expect(formatFilterPart(['東急', 'K群（目黒線）'])).toBe(
                '絞り込み中：東急・K群（目黒線）',
            );
        });
    });

    describe('formatRouteFilterSummary', () => {
        it('何も選んでいなければ全路線', () => {
            expect(formatRouteFilterSummary(options, [])).toBe('全路線');
        });
        it('押せる路線を全部選んでいれば全路線（disabled は数えない）', () => {
            expect(
                formatRouteFilterSummary(options, [
                    'r1',
                    'r2',
                    'r3',
                    'r4',
                    'j1',
                    't1',
                ]),
            ).toBe('全路線');
        });
        it('会社の路線が 2 本以上そろっていれば「会社の N 路線」にまとめる', () => {
            expect(
                formatRouteFilterSummary(options, ['r1', 'r2', 'r3', 'r4']),
            ).toBe('相鉄の 4 路線');
        });
        it('そろっていない会社は路線名を並べる', () => {
            expect(formatRouteFilterSummary(options, ['r1', 'r3', 't1'])).toBe(
                '本線・厚木線・東横線',
            );
        });
        it('1 本しかない会社はまとめない', () => {
            expect(
                formatRouteFilterSummary(options, [
                    'r1',
                    'r2',
                    'r3',
                    'r4',
                    'j1',
                ]),
            ).toBe('相鉄の 4 路線・相鉄直通線');
        });
        it('選択肢がまだ空なら全路線', () => {
            expect(formatRouteFilterSummary([], ['r1'])).toBe('全路線');
        });
        it('group の無い選択肢は路線名を並べる', () => {
            const plain: FilterChipOption[] = [
                { value: 'a', label: '本線' },
                { value: 'b', label: '厚木線' },
                { value: 'c', label: '東横線' },
            ];
            expect(formatRouteFilterSummary(plain, ['a', 'b'])).toBe(
                '本線・厚木線',
            );
        });
    });

    describe('isRouteFilterActive', () => {
        it('空・全部・選択肢なしは絞り込み中ではない', () => {
            expect(isRouteFilterActive(options, [])).toBe(false);
            expect(
                isRouteFilterActive(options, [
                    'r1',
                    'r2',
                    'r3',
                    'r4',
                    'j1',
                    't1',
                ]),
            ).toBe(false);
            expect(isRouteFilterActive([], ['r1'])).toBe(false);
        });
        it('一部だけなら絞り込み中', () => {
            expect(isRouteFilterActive(options, ['r1'])).toBe(true);
        });
    });

    describe('joinSummaryParts', () => {
        it('空の部分を飛ばして空白でつなぐ', () => {
            expect(
                joinSummaryParts(['横浜', null, '', undefined, '下り']),
            ).toBe('横浜 下り');
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=control-band-summary > .context/jest-control-band-summary.txt 2>&1
    ```

    期待する結果：`Cannot find module './control-band-summary.util'` で FAIL。

-   [ ] **Step 3: 実装する**

    ```ts
    import {
        FilterChipOption,
        FilterChipValue,
    } from '../filter-chips/filter-chip-option.type';

    /**
     * 操作帯の細帯に出す要約の部品（docs/design.md「操作帯は貼り付き、どこからでも開ける」）。
     * ページごとの文はページの utils で組み立て、共通の言い回しだけここに置く。
     */
    export function formatFilterPart(labels: string[]): string {
        return labels.length === 0
            ? '絞り込み：なし'
            : `絞り込み中：${labels.join('・')}`;
    }

    export function joinSummaryParts(
        parts: (string | null | undefined)[],
    ): string {
        return parts.filter((part): part is string => !!part).join(' ');
    }

    function selectedEnabled(
        options: FilterChipOption[],
        selected: FilterChipValue[],
    ): { enabled: FilterChipOption[]; picked: FilterChipOption[] } {
        const enabled = options.filter((option) => !option.disabled);
        const picked = enabled.filter((option) =>
            selected.includes(option.value),
        );
        return { enabled, picked };
    }

    /** 絞り込みは「空＝全部」。押せる路線を全部選んでいるときも絞り込み中ではない。 */
    export function isRouteFilterActive(
        options: FilterChipOption[],
        selected: FilterChipValue[],
    ): boolean {
        const { enabled, picked } = selectedEnabled(options, selected);
        return picked.length > 0 && picked.length < enabled.length;
    }

    /**
     * 「全路線」か、選んだ路線を並べた文。会社の押せる路線が 2 本以上あって全部選んでいれば
     * 「相鉄の 4 路線」にまとめる。「路線：」の前置きは呼ぶ側で付ける。
     */
    export function formatRouteFilterSummary(
        options: FilterChipOption[],
        selected: FilterChipValue[],
    ): string {
        if (!isRouteFilterActive(options, selected)) return '全路線';

        const { enabled, picked } = selectedEnabled(options, selected);
        const parts: string[] = [];
        const doneGroups = new Set<string>();
        for (const option of picked) {
            const group = option.group;
            if (!group) {
                parts.push(option.label);
                continue;
            }
            if (doneGroups.has(group)) continue;
            doneGroups.add(group);
            const enabledInGroup = enabled.filter((o) => o.group === group);
            const pickedInGroup = picked.filter((o) => o.group === group);
            if (
                enabledInGroup.length >= 2 &&
                pickedInGroup.length === enabledInGroup.length
            ) {
                parts.push(`${group}の ${pickedInGroup.length} 路線`);
            } else {
                parts.push(...pickedInGroup.map((o) => o.label));
            }
        }
        return parts.join('・');
    }
    ```

-   [ ] **Step 4: 通ることを確かめる**

    Step 2 と同じコマンドを流す。期待する結果：`Tests:` の行がすべて passed。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    npx prettier --write src/app/shared/control-band/control-band-summary.util.ts
    npx prettier --write src/app/shared/control-band/control-band-summary.util.spec.ts
    git add src/app/shared/control-band/control-band-summary.util.ts src/app/shared/control-band/control-band-summary.util.spec.ts
    git commit -m "feat: :sparkles: 操作帯の要約の共通部品を足す"
    ```

---

### Task 3: 共通の帯に貼り付きと折りたたみを持たせる

**Files:**

-   Modify: `src/app/shared/control-band/control-band.component.ts`
-   Create: `src/app/shared/control-band/control-band.component.html`
-   Test: `src/app/shared/control-band/control-band.component.spec.ts`

**Interfaces:**

-   Produces（ページが使う）：
    ```ts
    export type ControlBandCollapse = 'scroll' | 'manual';
    // ControlBandComponent の入力と出力
    summary = input('');
    filterActive = input(false);
    clearable = input(false);
    collapse = input<ControlBandCollapse>('scroll');
    flush = input(false); // true: 外周の負のマージンと内側の余白を持たない（列車位置情報・列車ダイヤグラム）
    collapsed = model(false); // manual の開閉
    clear = output<void>();
    ```
-   data-testid（テストと Playwright で使う）：
    -   `control-band-bar`（細帯・畳んだ 1 行）
    -   `control-band-summary`（要約の文）
    -   `control-band-filter-mark`（絞り込み中の縦線）
    -   `control-band-clear`（［解除］）
    -   `control-band-toggle`（開く・閉じる）
    -   `control-band-collapse`（manual の畳む）
    -   `control-band-content`（操作部）
    -   `control-band-scrim`（透明な幕）

> **Ruling：** spec の `flush` は「入力を足すか class で上書きするか、実物を見て決める」となっていた。ここでは入力 `flush` に決めた。
> 理由：帯の中の要素（内側の余白・細帯の横の余白）まで切り替える必要があり、ページ側の class では届かない。
> 間違っていた場合の代償：入力が 1 つ余計に残るだけ。

-   [ ] **Step 1: 落ちるテストを書く**

    `control-band.component.spec.ts`：

    ```ts
    import '@testing-library/jest-dom';
    import { Component, signal } from '@angular/core';
    import { ComponentFixture, TestBed } from '@angular/core/testing';
    import { NoopAnimationsModule } from '@angular/platform-browser/animations';
    import {
        ControlBandCollapse,
        ControlBandComponent,
    } from './control-band.component';

    type IOCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

    class FakeIntersectionObserver {
        static instances: FakeIntersectionObserver[] = [];
        disconnected = false;
        constructor(
            public callback: IOCallback,
            public options: IntersectionObserverInit,
        ) {
            FakeIntersectionObserver.instances.push(this);
        }
        observe(): void {}
        disconnect(): void {
            this.disconnected = true;
        }
    }

    class FakeResizeObserver {
        constructor(public callback: ResizeObserverCallback) {}
        observe(): void {}
        disconnect(): void {}
    }

    let mediaListeners: (() => void)[] = [];
    let desktop = false;

    function installGlobals(): void {
        FakeIntersectionObserver.instances = [];
        mediaListeners = [];
        desktop = false;
        Object.defineProperty(window, 'IntersectionObserver', {
            writable: true,
            value: FakeIntersectionObserver,
        });
        Object.defineProperty(window, 'ResizeObserver', {
            writable: true,
            value: FakeResizeObserver,
        });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockImplementation(() => ({
                get matches() {
                    return desktop;
                },
                addEventListener: (_: string, fn: () => void) =>
                    mediaListeners.push(fn),
                removeEventListener: jest.fn(),
            })),
        });
    }

    @Component({
        template: `
            @if (shown()) {
                <app-control-band
                    [summary]="summary()"
                    [filterActive]="filterActive()"
                    [clearable]="clearable()"
                    [collapse]="collapse()"
                    [(collapsed)]="collapsed"
                    (clear)="cleared = cleared + 1"
                >
                    <button type="button" class="chip">チップ</button>
                </app-control-band>
            }
            <p class="outside">本文</p>
        `,
        imports: [ControlBandComponent],
    })
    class HostComponent {
        shown = signal(true);
        summary = signal('絞り込み中：東急 3/10 運用');
        filterActive = signal(true);
        clearable = signal(true);
        collapse = signal<ControlBandCollapse>('scroll');
        collapsed = false;
        cleared = 0;
    }

    describe('ControlBandComponent', () => {
        let fixture: ComponentFixture<HostComponent>;
        let host: HostComponent;
        const q = (id: string): HTMLElement | null =>
            fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

        async function setup(
            configure?: (h: HostComponent) => void,
        ): Promise<void> {
            installGlobals();
            await TestBed.configureTestingModule({
                imports: [HostComponent, NoopAnimationsModule],
            }).compileComponents();
            fixture = TestBed.createComponent(HostComponent);
            host = fixture.componentInstance;
            configure?.(host);
            fixture.detectChanges();
            await fixture.whenStable();
        }

        function observer(): FakeIntersectionObserver {
            const list = FakeIntersectionObserver.instances;
            return list[list.length - 1];
        }

        /** 帯が画面の外（ヘッダーの下）へ出た / 戻った */
        function scrollOut(): void {
            observer().callback([
                {
                    isIntersecting: false,
                    boundingClientRect: { bottom: 10 } as DOMRectReadOnly,
                    rootBounds: { top: 48 } as DOMRectReadOnly,
                },
            ]);
            fixture.detectChanges();
        }
        function scrollBack(): void {
            observer().callback([
                {
                    isIntersecting: true,
                    boundingClientRect: { bottom: 300 } as DOMRectReadOnly,
                    rootBounds: { top: 48 } as DOMRectReadOnly,
                },
            ]);
            fixture.detectChanges();
        }
        const offset = (): string =>
            document.documentElement.style.getPropertyValue(
                '--control-band-offset',
            );

        afterEach(() => {
            document.documentElement.style.removeProperty(
                '--control-band-offset',
            );
        });

        describe('scroll', () => {
            it('はじめは通常の状態で、細帯は出ない', async () => {
                await setup();
                expect(q('control-band-bar')).toBeNull();
                expect(q('control-band-content')).not.toHaveClass('tw-hidden');
                expect(offset()).toBe('0px');
            });

            it('ヘッダーの高さを rootMargin で差し引く（md 未満 48px）', async () => {
                await setup();
                expect(observer().options.rootMargin).toBe('-48px 0px 0px 0px');
            });

            it('768px をまたぐと 64px で作り直す', async () => {
                await setup();
                const first = observer();
                desktop = true;
                mediaListeners.forEach((fn) => fn());
                expect(first.disconnected).toBe(true);
                expect(observer().options.rootMargin).toBe('-64px 0px 0px 0px');
            });

            it('帯が外へ出たら細帯になり、操作部を隠して空きを残す', async () => {
                await setup();
                scrollOut();
                expect(q('control-band-bar')).toBeInTheDocument();
                expect(q('control-band-summary')).toHaveTextContent(
                    '絞り込み中：東急 3/10 運用',
                );
                expect(q('control-band-content')).toHaveClass('tw-hidden');
                expect(offset()).toBe('40px');
                const hostEl: HTMLElement =
                    fixture.nativeElement.querySelector('app-control-band');
                expect(hostEl.style.height).not.toBe('');
            });

            it('絞り込み中は縦線と［解除］を出し、［解除］で clear を出す', async () => {
                await setup();
                scrollOut();
                expect(q('control-band-filter-mark')).toBeInTheDocument();
                q('control-band-clear')!.click();
                expect(host.cleared).toBe(1);
            });

            it('絞り込み中でなければ縦線も［解除］も出さない', async () => {
                await setup((h) => h.filterActive.set(false));
                scrollOut();
                expect(q('control-band-filter-mark')).toBeNull();
                expect(q('control-band-clear')).toBeNull();
            });

            it('clearable でなければ［解除］を出さない', async () => {
                await setup((h) => h.clearable.set(false));
                scrollOut();
                expect(q('control-band-filter-mark')).toBeInTheDocument();
                expect(q('control-band-clear')).toBeNull();
            });

            it('開くと操作部をページに重ねて出し、幕を敷く', async () => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                expect(q('control-band-content')).not.toHaveClass('tw-hidden');
                expect(q('control-band-scrim')).toBeInTheDocument();
                expect(q('control-band-toggle')).toHaveAttribute(
                    'aria-expanded',
                    'true',
                );
                expect(offset()).toBe('40px');
            });

            it('操作部を押しても閉じない', async () => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                (
                    fixture.nativeElement.querySelector('.chip') as HTMLElement
                ).click();
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeInTheDocument();
            });

            it('ページが勝手にスクロール位置を詰めても閉じない（scroll イベントでは閉じない）', async () => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                window.dispatchEvent(new Event('scroll'));
                document.dispatchEvent(new Event('scroll'));
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeInTheDocument();
            });

            it.each([
                ['幕を押す', (el: HTMLElement) => el.click()],
                [
                    '幕の上で wheel',
                    (el: HTMLElement) => el.dispatchEvent(new Event('wheel')),
                ],
                [
                    '幕の上で touchmove',
                    (el: HTMLElement) =>
                        el.dispatchEvent(new Event('touchmove')),
                ],
            ])('%s と閉じる', async (_, act) => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                act(q('control-band-scrim')!);
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeNull();
                expect(q('control-band-content')).toHaveClass('tw-hidden');
            });

            it('Esc とスクロールするキーで閉じる。操作部の中のキーでは閉じない', async () => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                (
                    fixture.nativeElement.querySelector('.chip') as HTMLElement
                ).dispatchEvent(
                    new KeyboardEvent('keydown', {
                        key: 'ArrowDown',
                        bubbles: true,
                    }),
                );
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeInTheDocument();

                document.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'PageDown' }),
                );
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeNull();

                q('control-band-toggle')!.click();
                fixture.detectChanges();
                document.dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'Escape' }),
                );
                fixture.detectChanges();
                expect(q('control-band-scrim')).toBeNull();
            });

            it('元の位置が戻ってきたら通常に戻り、展開も閉じて変数を 0px にする', async () => {
                await setup();
                scrollOut();
                q('control-band-toggle')!.click();
                fixture.detectChanges();
                scrollBack();
                expect(q('control-band-bar')).toBeNull();
                expect(q('control-band-scrim')).toBeNull();
                expect(q('control-band-content')).not.toHaveClass('tw-hidden');
                expect(offset()).toBe('0px');
            });

            it('部品が消えたら変数を消す', async () => {
                await setup();
                scrollOut();
                expect(offset()).toBe('40px');
                host.shown.set(false);
                fixture.detectChanges();
                expect(offset()).toBe('');
            });
        });

        describe('manual', () => {
            it('観測せず、変数も使わない', async () => {
                await setup((h) => h.collapse.set('manual'));
                expect(FakeIntersectionObserver.instances).toHaveLength(0);
                expect(offset()).toBe('');
            });

            it('「畳む」で 1 行になり、collapsed を書き戻す。「開く」で戻る', async () => {
                await setup((h) => h.collapse.set('manual'));
                expect(q('control-band-bar')).toBeNull();
                q('control-band-collapse')!.click();
                fixture.detectChanges();
                expect(host.collapsed).toBe(true);
                expect(q('control-band-bar')).toBeInTheDocument();
                expect(q('control-band-content')).toHaveClass('tw-hidden');
                expect(q('control-band-scrim')).toBeNull();

                q('control-band-toggle')!.click();
                fixture.detectChanges();
                expect(host.collapsed).toBe(false);
                expect(q('control-band-bar')).toBeNull();
                expect(q('control-band-content')).not.toHaveClass('tw-hidden');
            });

            it('collapsed=true で始めたら畳んだまま出る', async () => {
                await setup((h) => {
                    h.collapse.set('manual');
                    h.collapsed = true;
                });
                expect(q('control-band-bar')).toBeInTheDocument();
                expect(q('control-band-content')).toHaveClass('tw-hidden');
            });
        });

        it('IntersectionObserver が無い環境では通常のまま', async () => {
            installGlobals();
            Object.defineProperty(window, 'IntersectionObserver', {
                writable: true,
                value: undefined,
            });
            await TestBed.configureTestingModule({
                imports: [HostComponent, NoopAnimationsModule],
            }).compileComponents();
            fixture = TestBed.createComponent(HostComponent);
            fixture.detectChanges();
            expect(q('control-band-bar')).toBeNull();
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=shared/control-band/control-band.component > .context/jest-control-band.txt 2>&1
    ```

    期待する結果：入力が無いため FAIL（`Can't bind to 'summary'` など）。

-   [ ] **Step 3: テンプレートを書く**

    `control-band.component.html`：

    ```html
    <div [class]="bandClass()" data-testid="control-band-band">
        @if (showBar()) {
        <div data-testid="control-band-bar" [class]="barClass()">
            @if (filterActive()) {
            <span
                data-testid="control-band-filter-mark"
                class="tw-absolute tw-inset-y-0 tw-left-0 tw-w-1 tw-bg-accent-500"
            ></span>
            }
            <span
                data-testid="control-band-summary"
                class="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm tw-text-ink"
                >{{ summary() }}</span
            >
            @if (filterActive() && clearable()) {
            <button
                mat-button
                type="button"
                data-testid="control-band-clear"
                class="tw-shrink-0"
                (click)="clear.emit()"
            >
                解除
            </button>
            }
            <button
                mat-button
                type="button"
                data-testid="control-band-toggle"
                class="tw-shrink-0"
                [attr.aria-expanded]="expanded()"
                (click)="toggle()"
            >
                <mat-icon
                    >{{ expanded() ? 'expand_less' : 'expand_more' }}</mat-icon
                >
                {{ expanded() ? '閉じる' : '開く' }}
            </button>
        </div>
        }

        <div data-testid="control-band-content" [class]="contentClass()">
            <div class="tw-min-w-0 tw-flex-1">
                <ng-content></ng-content>
            </div>
            @if (collapse() === 'manual' && !collapsed()) {
            <button
                mat-button
                type="button"
                data-testid="control-band-collapse"
                class="tw-shrink-0 tw-self-start"
                [attr.aria-expanded]="true"
                (click)="collapsed.set(true)"
            >
                <mat-icon>expand_less</mat-icon>
                畳む
            </button>
            }
        </div>
    </div>

    @if (scrollState() === 'open') {
    <div
        data-testid="control-band-scrim"
        class="tw-fixed tw-inset-0 tw-z-40"
        (click)="close()"
        (wheel)="close()"
        (touchmove)="close()"
    ></div>
    }
    ```

-   [ ] **Step 4: コンポーネントを書く**

    `control-band.component.ts`（全体を置き換える。既存の doc コメントの内容は残して書き足す）：

    ```ts
    import {
        afterNextRender,
        ChangeDetectionStrategy,
        Component,
        computed,
        DestroyRef,
        effect,
        ElementRef,
        inject,
        input,
        model,
        output,
        signal,
    } from '@angular/core';
    import { MatButtonModule } from '@angular/material/button';
    import { MatIconModule } from '@angular/material/icon';

    export type ControlBandCollapse = 'scroll' | 'manual';
    type ScrollState = 'inline' | 'slim' | 'open';

    const HEADER_HEIGHT = { mobile: 48, desktop: 64 } as const;
    const DESKTOP_QUERY = '(min-width: 768px)';
    const OFFSET_PROPERTY = '--control-band-offset';
    const BAR_HEIGHT = '40px';
    /** 利用者のスクロールとみなすキー。操作部の中で押されたものは数えない */
    const SCROLL_KEYS = new Set([
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
        'ArrowUp',
        'ArrowDown',
    ]);

    const GUTTER_MARGIN =
        '-tw-mx-4 -tw-mt-4 md:-tw-mx-6 md:-tw-mt-6 lg:-tw-mx-8 lg:-tw-mt-8 xl:-tw-mx-16 xl:-tw-mt-16';
    const GUTTER_PADDING_X = 'tw-px-4 md:tw-px-6 lg:tw-px-8 xl:tw-px-16';

    /**
     * ページ上端の操作部（選択欄・チップ・切り替え）を載せる全幅の白い帯。
     * （既存のコメント：main の余白を負のマージンで打ち消す・帯の中の余白の決まり、をここに残す）
     *
     * 貼り付きと折りたたみ（docs/design.md「操作帯は貼り付き、どこからでも開ける」・2026-10-06）:
     * - scroll: 帯がヘッダーの下に隠れたら 40px の細帯としてヘッダー直下に固定する。帯の元の位置には
     *   同じ高さの空き（host の height）を残す。「開く」で同じ操作部をページに重ねて広げる。
     *   細帯の間は <html> に --control-band-offset: 40px を入れ、貼り付く見出しや箱が差し引く。
     * - manual: 「畳む」で 40px の 1 行にする。固定も重ねもしない（列車ダイヤグラム）。
     * - 展開は scroll イベントでは閉じない。絞り込むとページが短くなりブラウザがスクロール位置を
     *   詰めるので、scroll イベントで閉じるとチップを押した瞬間に閉じる。幕の上の wheel・touchmove と
     *   スクロールするキーで閉じる。
     */
    @Component({
        selector: 'app-control-band',
        templateUrl: './control-band.component.html',
        styles: `
            :host ::ng-deep app-filter-chips {
                display: block;
                margin-block: -4px;
            }
        `,
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [MatButtonModule, MatIconModule],
        host: {
            '[class]': 'hostClass()',
            '[style.height.px]': 'placeholderHeight()',
            '(document:keydown)': 'onDocumentKeydown($event)',
        },
    })
    export class ControlBandComponent {
        readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
        readonly #destroyRef = inject(DestroyRef);

        readonly summary = input('');
        readonly filterActive = input(false);
        readonly clearable = input(false);
        readonly collapse = input<ControlBandCollapse>('scroll');
        readonly flush = input(false);
        readonly collapsed = model(false);
        readonly clear = output<void>();

        readonly scrollState = signal<ScrollState>('inline');
        readonly #inlineHeight = signal(0);

        readonly showBar = computed(() =>
            this.collapse() === 'manual'
                ? this.collapsed()
                : this.scrollState() !== 'inline',
        );
        readonly expanded = computed(() =>
            this.collapse() === 'manual'
                ? !this.collapsed()
                : this.scrollState() === 'open',
        );
        readonly placeholderHeight = computed(() =>
            this.collapse() === 'scroll' && this.scrollState() !== 'inline'
                ? this.#inlineHeight()
                : null,
        );

        readonly hostClass = computed(() =>
            this.flush() ? 'tw-block' : `tw-block ${GUTTER_MARGIN}`,
        );
        readonly bandClass = computed(() => {
            const base =
                'tw-block tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white';
            return this.collapse() === 'scroll' &&
                this.scrollState() !== 'inline'
                ? `${base} tw-fixed tw-inset-x-0 tw-top-12 tw-z-50 tw-shadow-md md:tw-top-16`
                : base;
        });
        readonly barClass = computed(
            () =>
                `tw-relative tw-box-border tw-flex tw-h-10 tw-items-center tw-gap-2 ${
                    this.flush() ? 'tw-px-3' : GUTTER_PADDING_X
                }`,
        );
        readonly contentClass = computed(() => {
            const hidden =
                this.collapse() === 'manual'
                    ? this.collapsed()
                    : this.scrollState() === 'slim';
            if (hidden) return 'tw-hidden';
            const padding = this.flush() ? '' : `tw-py-4 ${GUTTER_PADDING_X}`;
            const scrollBox =
                this.scrollState() === 'open'
                    ? 'tw-overflow-y-auto tw-max-h-[calc(100dvh_-_88px)] md:tw-max-h-[calc(100dvh_-_104px)]'
                    : '';
            return `tw-flex tw-items-start ${padding} ${scrollBox}`.trim();
        });

        constructor() {
            effect(() => {
                if (this.collapse() !== 'scroll') return;
                document.documentElement.style.setProperty(
                    OFFSET_PROPERTY,
                    this.scrollState() === 'inline' ? '0px' : BAR_HEIGHT,
                );
            });
            this.#destroyRef.onDestroy(() => {
                if (this.collapse() === 'scroll') {
                    document.documentElement.style.removeProperty(
                        OFFSET_PROPERTY,
                    );
                }
            });
            afterNextRender(() => {
                if (this.collapse() === 'scroll') this.#observe();
            });
        }

        toggle(): void {
            if (this.collapse() === 'manual') {
                this.collapsed.update((value) => !value);
                return;
            }
            this.scrollState.update((state) =>
                state === 'open' ? 'slim' : 'open',
            );
        }

        close(): void {
            if (this.scrollState() === 'open') this.scrollState.set('slim');
        }

        onDocumentKeydown(event: KeyboardEvent): void {
            if (this.scrollState() !== 'open') return;
            if (event.key === 'Escape') {
                this.close();
                return;
            }
            const target = event.target as Node | null;
            if (target && this.#host.nativeElement.contains(target)) return;
            if (SCROLL_KEYS.has(event.key)) this.close();
        }

        #observe(): void {
            if (
                typeof IntersectionObserver === 'undefined' ||
                typeof ResizeObserver === 'undefined'
            ) {
                return;
            }
            const hostEl = this.#host.nativeElement;
            const bandEl = hostEl.firstElementChild as HTMLElement;

            // 通常の状態の高さを覚えておき、細帯の間は host の高さにして空きを残す
            const resize = new ResizeObserver(() => {
                if (this.scrollState() === 'inline') {
                    this.#inlineHeight.set(
                        bandEl.getBoundingClientRect().height,
                    );
                }
            });
            resize.observe(bandEl);

            const media = window.matchMedia(DESKTOP_QUERY);
            let intersection: IntersectionObserver | null = null;
            const connect = (): void => {
                intersection?.disconnect();
                const header = media.matches
                    ? HEADER_HEIGHT.desktop
                    : HEADER_HEIGHT.mobile;
                intersection = new IntersectionObserver(
                    ([entry]) => {
                        const above =
                            !entry.isIntersecting &&
                            entry.boundingClientRect.bottom <=
                                (entry.rootBounds?.top ?? header);
                        if (above) {
                            if (this.scrollState() === 'inline') {
                                this.#inlineHeight.set(
                                    bandEl.getBoundingClientRect().height,
                                );
                                this.scrollState.set('slim');
                            }
                        } else {
                            this.scrollState.set('inline');
                        }
                    },
                    { rootMargin: `-${header}px 0px 0px 0px`, threshold: 0 },
                );
                intersection.observe(hostEl);
            };
            connect();
            media.addEventListener('change', connect);

            this.#destroyRef.onDestroy(() => {
                intersection?.disconnect();
                resize.disconnect();
                media.removeEventListener('change', connect);
            });
        }
    }
    ```

    注意：

    -   既存の doc コメントの中身（負のマージン・帯の中の余白・チップの `margin-block: -4px`）は削らずに残す。
    -   `tw-text-ink`・`tw-bg-accent-500`・`tw-border-rule` が tailwind.config.js にあることを確かめる。`ink` は train-location で使っている。
    -   `effect` の中で `this.collapse()` を読むので、manual では何も書かない。

-   [ ] **Step 5: 通ることを確かめる**

    Step 2 と同じコマンドを流す。期待する結果：すべて passed。

    落ちたときは実装を直す。テストの意図（Review Focus 1〜3）は変えない。jsdom が `afterNextRender` を走らせないときは、テストの `setup` で `fixture.detectChanges()` のあとに `TestBed.inject(ApplicationRef).tick()` を足す。

-   [ ] **Step 6: 既存の 6 ページの spec が壊れていないか確かめる**

    ```bash
    npx jest --testPathPattern="(timetable-all-line|timetable-station|operation-route-diagram|operation-real-time|operation-past-time|operation-table)" > .context/jest-band-pages.txt 2>&1
    ```

    期待する結果：落ちたテストが 0（帯の見た目は通常の状態で今と同じ）。

    host に付いていた `tw-px-4 tw-py-4 …` と白地は、中の `div` に移っている。host の class を見ているテストがあれば、中の `div` を見るように直す。

-   [ ] **Step 7: 整形してコミット**

    ```bash
    npx prettier --write src/app/shared/control-band/control-band.component.ts
    npx prettier --write src/app/shared/control-band/control-band.component.html
    npx prettier --write src/app/shared/control-band/control-band.component.spec.ts
    git add src/app/shared/control-band/
    git commit -m "feat: :sparkles: 操作帯に貼り付きと折りたたみを持たせる"
    ```

---

### Task 4: 貼り付く見出し・箱・読み込み中のバーを細帯に合わせる

**Files:**

-   Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.html:90`（`tw-top-12 … md:tw-top-16`）
-   Modify: `src/app/pages/timetable/timetable-station/components/timetable-station-table/timetable-station-table.component.html:30`（`tw-top-[114px] md:tw-top-[130px]`）
-   Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-table/timetable-all-line-table.component.html:29`
-   Modify: `src/app/pages/operation/operation-past-time/components/operation-past-time-table/operation-past-time-table.component.html:19`
-   Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component.html:11`
-   Modify: 読み込み中のバー（8 ページ）
    -   `operation-real-time.component.html:2`
    -   `operation-table.component.html:2`
    -   `operation-past-time.component.html:2`
    -   `operation-route-diagram.component.html:2`
    -   `timetable-all-line.component.html:11`
    -   `timetable-station.component.html:3`
    -   `train-location.component.html:7`
    -   `train-diagram.component.html:12`

**Interfaces:**

-   Consumes: Task 3 が `<html>` に入れる `--control-band-offset`。

-   [ ] **Step 1: 置き換える**

    | 今                                          | 置き換え後                                                           |
    | ------------------------------------------- | -------------------------------------------------------------------- |
    | `tw-top-12`（駅別の上り下りの帯）           | `tw-top-[calc(48px_+_var(--control-band-offset,0px))]`               |
    | `md:tw-top-16`（同）                        | `md:tw-top-[calc(64px_+_var(--control-band-offset,0px))]`            |
    | `tw-top-[114px]`                            | `tw-top-[calc(114px_+_var(--control-band-offset,0px))]`              |
    | `md:tw-top-[130px]`                         | `md:tw-top-[calc(130px_+_var(--control-band-offset,0px))]`           |
    | `tw-max-h-[calc(100dvh-80px)]`（3 か所）    | `tw-max-h-[calc(100dvh_-_80px_-_var(--control-band-offset,0px))]`    |
    | `md:tw-max-h-[calc(100dvh-96px)]`（3 か所） | `md:tw-max-h-[calc(100dvh_-_96px_-_var(--control-band-offset,0px))]` |
    | バーの `tw-z-30`、または z の無いバー       | `tw-z-[60]`（z の無いバーには足す）                                  |

    時刻表の入力（`timetable-edit-form-grid`）の箱は触らない。

-   [ ] **Step 2: 該当ページの spec を流す**

    ```bash
    npx jest --testPathPattern="(timetable-station|timetable-all-line|operation-past-time|operation-route-diagram|operation-real-time|operation-table|train-location|train-diagram)" > .context/jest-offsets.txt 2>&1
    ```

    期待する結果：落ちたテストが 0。

    `train-location.component.spec.ts:143-144` のように、class の文字列を見ているテストは、新しい class に合わせて直す（`tw-top-[48px]` は残っている）。

-   [ ] **Step 3: CSS が生成されることを確かめる**

    ```bash
    npx ng build --configuration development > .context/build-offsets.txt 2>&1
    ```

    期待する結果：ビルドが通る。

    生成された `styles*.css` の中に `--control-band-offset,0px` と `calc(100dvh - 80px - var(` があることを Grep で確かめる。空白に置き換わっていることを確かめるためだ。

-   [ ] **Step 4: 整形してコミット**

    変えたファイルだけ、1 つずつ `npx prettier --write <file>` を流す。そのあとコミットする。

    ```bash
    git add <変えた html と spec>
    git commit -m "feat: :sparkles: 貼り付く見出しと箱を細帯の高さだけずらす"
    ```

---

### Task 5: リアルタイム運用情報

**Files:**

-   Modify: `src/app/pages/operation/operation-real-time/utils/operation-real-time-filter.util.ts`（`filterRealTimeOperations` を足す）
-   Modify: `src/app/pages/operation/operation-real-time/components/operation-real-time-operation-table/operation-real-time-operation-table.component.ts`（`filteredOperations` を util に寄せる）
-   Create: `src/app/pages/operation/operation-real-time/utils/operation-real-time-summary.util.ts`
-   Test: `src/app/pages/operation/operation-real-time/utils/operation-real-time-summary.util.spec.ts`、`operation-real-time-filter.util.spec.ts`（あれば足す、無ければ作る）
-   Modify: `src/app/pages/operation/operation-real-time/operation-real-time.component.ts` / `.html`

**Interfaces:**

-   Consumes: `formatFilterPart`（Task 2）。帯の `summary`・`filterActive`・`clearable`・`(clear)`（Task 3）。
-   Produces:

    ```ts
    export function filterRealTimeOperations<
        T extends { operationNumber: string },
    >(
        operations: T[],
        selectedAgencyIds: string[],
        selectedGroupNames: string[],
        timeCrossSections: Record<
            string,
            | {
                  expectedSighting?: {
                      formation?: { formationId: string } | null;
                  } | null;
              }
            | undefined
        >,
        formations: { formationId: string; agencyId: string }[],
    ): T[];
    export function formatRealTimeSummary(params: {
        agencies: { agencyId: string; agencyName: string }[];
        selectedAgencyIds: string[];
        selectedGroupNames: string[];
        shown: number;
        total: number;
    }): string;
    ```

-   [ ] **Step 1: 落ちるテストを書く**

    `operation-real-time-summary.util.spec.ts`：

    ```ts
    import { formatRealTimeSummary } from './operation-real-time-summary.util';

    const agencies = [
        { agencyId: 'a-sotetsu', agencyName: '相鉄' },
        { agencyId: 'a-tokyu', agencyName: '東急' },
    ];

    describe('formatRealTimeSummary', () => {
        it('何も選んでいなければ「絞り込み：なし」（件数は出さない）', () => {
            expect(
                formatRealTimeSummary({
                    agencies,
                    selectedAgencyIds: [],
                    selectedGroupNames: [],
                    shown: 120,
                    total: 120,
                }),
            ).toBe('絞り込み：なし');
        });

        it('会社 → 運用群の順に並べ、件数を付ける', () => {
            expect(
                formatRealTimeSummary({
                    agencies,
                    selectedAgencyIds: ['a-tokyu'],
                    selectedGroupNames: ['K群（目黒線）'],
                    shown: 36,
                    total: 120,
                }),
            ).toBe('絞り込み中：東急・K群（目黒線） 36/120 運用');
        });

        it('名前を引けない会社 ID は飛ばす', () => {
            expect(
                formatRealTimeSummary({
                    agencies,
                    selectedAgencyIds: ['gone'],
                    selectedGroupNames: ['1群'],
                    shown: 5,
                    total: 120,
                }),
            ).toBe('絞り込み中：1群 5/120 運用');
        });
    });
    ```

    `operation-real-time-filter.util.spec.ts` に足す：

    ```ts
    import { filterRealTimeOperations } from './operation-real-time-filter.util';

    describe('filterRealTimeOperations', () => {
        const operations = [
            { operationNumber: '11' },
            { operationNumber: '01K' },
            { operationNumber: '51K' },
        ];
        const crossSections = {
            '11': { expectedSighting: { formation: { formationId: 'f1' } } },
            '01K': { expectedSighting: { formation: { formationId: 'f2' } } },
        };
        const formations = [
            { formationId: 'f1', agencyId: 'a-sotetsu' },
            { formationId: 'f2', agencyId: 'a-tokyu' },
        ];

        it('空なら全部', () => {
            expect(
                filterRealTimeOperations(
                    operations,
                    [],
                    [],
                    crossSections,
                    formations,
                ),
            ).toHaveLength(3);
        });
        it('会社で絞ると予想編成の会社で判定し、編成が分からない運用は外す', () => {
            expect(
                filterRealTimeOperations(
                    operations,
                    ['a-tokyu'],
                    [],
                    crossSections,
                    formations,
                ).map((o) => o.operationNumber),
            ).toEqual(['01K']);
        });
        it('運用群で絞る', () => {
            expect(
                filterRealTimeOperations(
                    operations,
                    [],
                    ['K群（目黒線）'],
                    crossSections,
                    formations,
                ).map((o) => o.operationNumber),
            ).toEqual(['01K']);
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-real-time/utils > .context/jest-rt-utils.txt 2>&1
    ```

    期待する結果：モジュールや関数が無いため FAIL。

-   [ ] **Step 3: 実装する**

    `operation-real-time-filter.util.ts` に足す（`matchesGroupFilter` は `src/app/shared/operation-group.util` から import する）：

    ```ts
    /**
     * 運用順の表と細帯の件数で同じ絞り込みを使う。運用群は運用番号、会社は予想編成の所属会社で見る。
     */
    export function filterRealTimeOperations<
        T extends { operationNumber: string },
    >(
        operations: T[],
        selectedAgencyIds: string[],
        selectedGroupNames: string[],
        timeCrossSections: Record<
            string,
            | {
                  expectedSighting?: {
                      formation?: { formationId: string } | null;
                  } | null;
              }
            | undefined
        >,
        formations: { formationId: string; agencyId: string }[],
    ): T[] {
        return operations.filter((operation) => {
            if (
                !matchesGroupFilter(
                    operation.operationNumber,
                    selectedGroupNames,
                )
            ) {
                return false;
            }
            const expectedFormation =
                timeCrossSections[operation.operationNumber]?.expectedSighting
                    ?.formation;
            const agencyId = expectedFormation
                ? formations.find(
                      (f) => f.formationId === expectedFormation.formationId,
                  )?.agencyId
                : undefined;
            return matchesAgencyFilter(agencyId, selectedAgencyIds);
        });
    }
    ```

    DTO の型と構造的に合わずにコンパイルが通らないときは、引数の型だけを DTO に合わせて直す。判定は変えない。

    `operation-real-time-operation-table.component.ts` の `filteredOperations` を次にする。

    ```ts
    readonly filteredOperations = computed(() =>
        filterRealTimeOperations(
            this.operations() ?? [],
            this.selectedAgencyIds(),
            this.selectedGroupNames(),
            this.timeCrossSections() ?? {},
            this.formations() ?? [],
        ),
    );
    ```

    使わなくなった import（`matchesGroupFilter` など）は消す。

    `operation-real-time-summary.util.ts`：

    ```ts
    import { formatFilterPart } from 'src/app/shared/control-band/control-band-summary.util';

    /** 細帯の要約。例「絞り込み中：東急・K群（目黒線） 36/120 運用」。 */
    export function formatRealTimeSummary(params: {
        agencies: { agencyId: string; agencyName: string }[];
        selectedAgencyIds: string[];
        selectedGroupNames: string[];
        shown: number;
        total: number;
    }): string {
        const agencyNames = params.selectedAgencyIds
            .map(
                (id) =>
                    params.agencies.find((a) => a.agencyId === id)?.agencyName,
            )
            .filter((name): name is string => !!name);
        const labels = [...agencyNames, ...params.selectedGroupNames];
        if (labels.length === 0) return formatFilterPart([]);
        return `${formatFilterPart(labels)} ${params.shown}/${params.total} 運用`;
    }
    ```

    `operation-real-time.component.ts` に足す（`computed` と、`AgencyListStateQuery` の import を足す）：

    ```ts
    readonly #agencies = toSignal(inject(AgencyListStateQuery).agencies$, { initialValue: [] });
    readonly #operations = toSignal(OperationRealTimeStore.operations$, { initialValue: [] });
    readonly #formations = toSignal(OperationRealTimeStore.formations$, { initialValue: [] });
    readonly #timeCrossSections = toSignal(
        OperationRealTimeStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );
    readonly #selectedAgencyIds = toSignal(OperationRealTimeStore.selectedAgencyIds$, { initialValue: [] });
    readonly #selectedGroupNames = toSignal(OperationRealTimeStore.selectedGroupNames$, { initialValue: [] });

    readonly filterActive = computed(
        () => this.#selectedAgencyIds().length > 0 || this.#selectedGroupNames().length > 0,
    );
    readonly bandSummary = computed(() => {
        const operations = this.#operations() ?? [];
        const shown = filterRealTimeOperations(
            operations,
            this.#selectedAgencyIds(),
            this.#selectedGroupNames(),
            this.#timeCrossSections() ?? {},
            this.#formations() ?? [],
        ).length;
        return formatRealTimeSummary({
            agencies: this.#agencies(),
            selectedAgencyIds: this.#selectedAgencyIds(),
            selectedGroupNames: this.#selectedGroupNames(),
            shown,
            total: operations.length,
        });
    });

    onClearFilter(): void {
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    }
    ```

    `operation-real-time.component.html` の帯：

    ```html
    <app-control-band
        [summary]="bandSummary()"
        [filterActive]="filterActive()"
        [clearable]="true"
        (clear)="onClearFilter()"
    ></app-control-band>
    ```

    （中身はそのまま）

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-real-time > .context/jest-rt.txt 2>&1
    ```

    期待する結果：すべて passed。

    ページの spec が `AgencyListStateQuery` の provider 不足で落ちたら、spec の providers に既存のテストと同じモックを足す。

-   [ ] **Step 5: 整形してコミット**

    変えたファイルを 1 つずつ `npx prettier --write` してからコミットする。

    ```bash
    git add src/app/pages/operation/operation-real-time/
    git commit -m "feat: :sparkles: リアルタイム運用情報の細帯に絞り込みの要約を出す"
    ```

---

### Task 6: 運用表

**Files:**

-   Create: `src/app/pages/operation/operation-table/utils/operation-table-summary.util.ts`
-   Test: `src/app/pages/operation/operation-table/utils/operation-table-summary.util.spec.ts`
-   Modify: `src/app/pages/operation/operation-table/operation-table.component.ts` / `.html`

**Interfaces:**

-   Consumes: `formatFilterPart`、`joinSummaryParts`（Task 2）。`formatCalendarSummaryLabel`（`src/app/core/utils/format-calendar-summary-label.util`）。`matchesGroupFilter`。
-   Produces:

    ```ts
    export function formatOperationTableSummary(params: {
        calendar:
            | { calendarName: string; startDate: string }
            | null
            | undefined;
        selectedGroupNames: string[];
        shown: number;
        total: number;
    }): string;
    ```

-   [ ] **Step 1: 落ちるテストを書く**

    ```ts
    import { formatOperationTableSummary } from './operation-table-summary.util';

    const calendar = { calendarName: '平日', startDate: '2026-03-14' };

    describe('formatOperationTableSummary', () => {
        it('ダイヤと「絞り込み：なし」', () => {
            expect(
                formatOperationTableSummary({
                    calendar,
                    selectedGroupNames: [],
                    shown: 90,
                    total: 90,
                }),
            ).toBe('2026/3/14改正 平日 絞り込み：なし');
        });
        it('絞り込み中は件数を付ける', () => {
            expect(
                formatOperationTableSummary({
                    calendar,
                    selectedGroupNames: ['G群（東横線）'],
                    shown: 5,
                    total: 90,
                }),
            ).toBe('2026/3/14改正 平日 絞り込み中：G群（東横線） 5/90 運用');
        });
        it('ダイヤがまだ無ければ絞り込みだけ', () => {
            expect(
                formatOperationTableSummary({
                    calendar: null,
                    selectedGroupNames: [],
                    shown: 0,
                    total: 0,
                }),
            ).toBe('絞り込み：なし');
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-table-summary > .context/jest-ot-summary.txt 2>&1
    ```

    期待する結果：FAIL。

-   [ ] **Step 3: 実装する**

    ```ts
    import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
    import {
        formatFilterPart,
        joinSummaryParts,
    } from 'src/app/shared/control-band/control-band-summary.util';

    /** 細帯の要約。例「2026/3/14改正 平日 絞り込み中：G群（東横線） 5/90 運用」。 */
    export function formatOperationTableSummary(params: {
        calendar:
            | { calendarName: string; startDate: string }
            | null
            | undefined;
        selectedGroupNames: string[];
        shown: number;
        total: number;
    }): string {
        const filter =
            params.selectedGroupNames.length === 0
                ? formatFilterPart([])
                : `${formatFilterPart(params.selectedGroupNames)} ${params.shown}/${params.total} 運用`;
        return joinSummaryParts([
            params.calendar
                ? formatCalendarSummaryLabel(params.calendar)
                : null,
            filter,
        ]);
    }
    ```

    `operation-table.component.ts` に足す：

    ```ts
    readonly filterActive = computed(() => this.selectedGroupNames().length > 0);
    readonly bandSummary = computed(() => {
        const trips = this.operationTrips();
        const shown = trips.filter((t) =>
            matchesGroupFilter(t.operation.operationNumber, this.selectedGroupNames()),
        ).length;
        return formatOperationTableSummary({
            calendar: this.calendar(),
            selectedGroupNames: this.selectedGroupNames(),
            shown,
            total: trips.length,
        });
    });

    onClearFilter(): void {
        OperationTableStore.setSelectedGroupNames([]);
    }
    ```

    `.html` の帯：`<app-control-band [summary]="bandSummary()" [filterActive]="filterActive()" [clearable]="true" (clear)="onClearFilter()">`

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-table > .context/jest-ot.txt 2>&1
    ```

    期待する結果：すべて passed。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    git add src/app/pages/operation/operation-table/
    git commit -m "feat: :sparkles: 運用表の細帯にダイヤと絞り込みの要約を出す"
    ```

---

### Task 7: 過去の運用情報

**Files:**

-   Create: `src/app/pages/operation/operation-past-time/utils/operation-past-time-summary.util.ts`
-   Test: `src/app/pages/operation/operation-past-time/utils/operation-past-time-summary.util.spec.ts`
-   Modify: `src/app/pages/operation/operation-past-time/operation-past-time.component.ts` / `.html`

**Interfaces:**

-   Produces:

    ```ts
    export function formatPastTimeSummary(params: {
        referenceDate: string | null; // 'yyyy-MM-dd'
        days: number | null;
        agencies: { agencyId: string; agencyName: string }[];
        selectedAgencyIds: string[];
    }): string;
    ```

-   [ ] **Step 1: 落ちるテストを書く**

    ```ts
    import { formatPastTimeSummary } from './operation-past-time-summary.util';

    const agencies = [{ agencyId: 'a-tokyu', agencyName: '東急' }];

    describe('formatPastTimeSummary', () => {
        it('日付と日数と絞り込み', () => {
            expect(
                formatPastTimeSummary({
                    referenceDate: '2026-10-06',
                    days: 7,
                    agencies,
                    selectedAgencyIds: ['a-tokyu'],
                }),
            ).toBe('10/6 から 7 日間 絞り込み中：東急');
        });
        it('検索前は絞り込みだけ', () => {
            expect(
                formatPastTimeSummary({
                    referenceDate: null,
                    days: null,
                    agencies,
                    selectedAgencyIds: [],
                }),
            ).toBe('絞り込み：なし');
        });
        it('名前を引けない会社 ID は飛ばし、残らなければ「なし」', () => {
            expect(
                formatPastTimeSummary({
                    referenceDate: '2026-10-06',
                    days: 3,
                    agencies,
                    selectedAgencyIds: ['gone'],
                }),
            ).toBe('10/6 から 3 日間 絞り込み：なし');
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-past-time-summary > .context/jest-pt-summary.txt 2>&1
    ```

    期待する結果：FAIL。

-   [ ] **Step 3: 実装する**

    ```ts
    import { format, parse } from 'date-fns';
    import {
        formatFilterPart,
        joinSummaryParts,
    } from 'src/app/shared/control-band/control-band-summary.util';

    /** 細帯の要約。例「10/6 から 7 日間 絞り込み中：東急」。 */
    export function formatPastTimeSummary(params: {
        referenceDate: string | null;
        days: number | null;
        agencies: { agencyId: string; agencyName: string }[];
        selectedAgencyIds: string[];
    }): string {
        const range =
            params.referenceDate && params.days
                ? `${format(parse(params.referenceDate, 'yyyy-MM-dd', new Date()), 'M/d')} から ${params.days} 日間`
                : null;
        const names = params.selectedAgencyIds
            .map(
                (id) =>
                    params.agencies.find((a) => a.agencyId === id)?.agencyName,
            )
            .filter((name): name is string => !!name);
        return joinSummaryParts([range, formatFilterPart(names)]);
    }
    ```

    `operation-past-time.component.ts` に、`referenceDate$`・`days$`・`selectedAgencyIds$`（`OperationPastTimeStore`）と `AgencyListStateQuery.agencies$` の signal を足す。

    -   `filterActive = computed(() => selectedAgencyIds().length > 0)`
    -   `bandSummary = computed(() => formatPastTimeSummary({...}))`
    -   `onClearFilter()` は `OperationPastTimeStore.setSelectedAgencyIds([])` を呼ぶ。
    -   `.html` の帯に `[summary]`・`[filterActive]`・`[clearable]="true"`・`(clear)` を渡す。

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=operation-past-time > .context/jest-pt.txt 2>&1
    ```

    期待する結果：すべて passed。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    git add src/app/pages/operation/operation-past-time/
    git commit -m "feat: :sparkles: 過去の運用情報の細帯に期間と絞り込みの要約を出す"
    ```

---

### Task 8: 全線時刻表・運用行路図（路線の絞り込み）

**Files:**

-   Modify: `src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/timetable-all-line-route-filter.component.ts` / `.html`
-   Modify: `src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component.ts` / `.html`
-   Test: それぞれの既存の `.component.spec.ts` に足す（無ければ作る）

**Interfaces:**

-   Consumes: `formatRouteFilterSummary`・`isRouteFilterActive`（Task 2）。

-   [ ] **Step 1: 落ちるテストを書く**

    2 つの部品の spec に、同じ形のテストを足す。既存の spec のストアの準備に合わせて書く。

    ```ts
    it('細帯の要約は「路線：…」か「全路線」で、絞り込み中を帯に渡す', () => {
        // 準備: 選択肢 r1(本線)/r2(厚木線)（group なし）、選択 ['r1']
        // TimetableAllLineStore（または OperationRouteDiagramStore）の
        // setSelectedRouteIds と選択肢の元データを、既存の spec と同じ方法で入れる
        fixture.detectChanges();
        const band = fixture.debugElement.query(
            By.directive(ControlBandComponent),
        ).componentInstance as ControlBandComponent;
        expect(band.summary()).toBe('路線：本線');
        expect(band.filterActive()).toBe(true);
        expect(band.clearable()).toBe(false);
    });
    ```

    コメントの「準備」は、既存の spec がストアに選択肢を入れている手順を写して、実際のコードにする。

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern="(timetable-all-line-route-filter|operation-route-diagram-route-filter)" > .context/jest-route-filter.txt 2>&1
    ```

    期待する結果：FAIL（summary が空）。

-   [ ] **Step 3: 実装する**

    両方の部品に足す（`computed` を import に足す）：

    ```ts
    readonly filterActive = computed(() =>
        isRouteFilterActive(this.routeOptions(), this.selectedRouteIds()),
    );
    readonly bandSummary = computed(() => {
        const routes = formatRouteFilterSummary(this.routeOptions(), this.selectedRouteIds());
        return routes === '全路線' ? routes : `路線：${routes}`;
    });
    ```

    `.html`：`<app-control-band [summary]="bandSummary()" [filterActive]="filterActive()">`

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern="(timetable-all-line|operation-route-diagram)" > .context/jest-route-pages.txt 2>&1
    ```

    期待する結果：すべて passed。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    git add src/app/pages/timetable/timetable-all-line/components/timetable-all-line-route-filter/ src/app/pages/operation/operation-route-diagram/components/operation-route-diagram-route-filter/
    git commit -m "feat: :sparkles: 全線時刻表と運用行路図の細帯に路線の要約を出す"
    ```

---

### Task 9: 駅別時刻表

**Files:**

-   Create: `src/app/pages/timetable/timetable-station/utils/timetable-station-summary.util.ts`
-   Test: `src/app/pages/timetable/timetable-station/utils/timetable-station-summary.util.spec.ts`
-   Modify: `src/app/pages/timetable/timetable-station/timetable-station.component.ts` / `.html`

**Interfaces:**

-   Produces:

    ```ts
    export function formatTimetableStationSummary(params: {
        stationName: string | null | undefined;
        calendar:
            | { calendarName: string; startDate: string }
            | null
            | undefined;
        directionLabel: string | null | undefined;
    }): string;
    ```

-   [ ] **Step 1: 落ちるテストを書く**

    ```ts
    import { formatTimetableStationSummary } from './timetable-station-summary.util';

    describe('formatTimetableStationSummary', () => {
        it('駅・ダイヤ・方向', () => {
            expect(
                formatTimetableStationSummary({
                    stationName: '横浜',
                    calendar: { calendarName: '平日', startDate: '2026-03-14' },
                    directionLabel: '下り',
                }),
            ).toBe('横浜 2026/3/14改正 平日 下り');
        });
        it('欠けた部分は飛ばす', () => {
            expect(
                formatTimetableStationSummary({
                    stationName: '横浜',
                    calendar: null,
                    directionLabel: null,
                }),
            ).toBe('横浜');
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=timetable-station-summary > .context/jest-ts-summary.txt 2>&1
    ```

    期待する結果：FAIL。

-   [ ] **Step 3: 実装する**

    ```ts
    import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
    import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

    /** 細帯の要約。例「横浜 2026/3/14改正 平日 下り」。 */
    export function formatTimetableStationSummary(params: {
        stationName: string | null | undefined;
        calendar:
            | { calendarName: string; startDate: string }
            | null
            | undefined;
        directionLabel: string | null | undefined;
    }): string {
        return joinSummaryParts([
            params.stationName,
            params.calendar
                ? formatCalendarSummaryLabel(params.calendar)
                : null,
            params.directionLabel,
        ]);
    }
    ```

    `timetable-station.component.ts`：

    -   駅名は、今選んでいる `stationId()` を `stationOptions()`（または `stationGroups()`）から引く。どちらにどの項目名で入っているかは、ファイルの中で確かめる。
    -   ダイヤは `selectedCalendar()`。
    -   方向の文字は、`tripDirectionOptions` の中で値が `tripDirection()` の要素の `label`。

    これで `bandSummary = computed(...)` を作り、`.html` の帯に `[summary]="bandSummary()"` を渡す（絞り込み中は出さない）。

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=timetable-station > .context/jest-ts.txt 2>&1
    ```

    期待する結果：すべて passed。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    git add src/app/pages/timetable/timetable-station/
    git commit -m "feat: :sparkles: 駅別時刻表の細帯に駅・ダイヤ・方向の要約を出す"
    ```

---

### Task 10: 列車位置情報を共通の帯に載せ替える

**Files:**

-   Modify: `src/app/pages/train-location/components/train-location-controller/train-location-controller.component.html:4-6`（外側の `div` から白地と罫線を外す）
-   Create: `src/app/pages/train-location/utils/train-location-summary.util.ts`
-   Test: `src/app/pages/train-location/utils/train-location-summary.util.spec.ts`
-   Modify: `src/app/pages/train-location/train-location.component.ts` / `.html`

**Interfaces:**

-   Consumes: 帯の `flush`（Task 3）。
-   Produces:
    ```ts
    export function formatTrainLocationSummary(params: {
        routeName: string | null | undefined;
        mode: 'now' | 'specified';
        timeText: string; // 'HH:mm'
        calendarName: string | null | undefined;
    }): string;
    ```

> **Ruling：** spec には「中のコントローラーには手を入れない」とある。しかし今の白帯は、コントローラーのテンプレートの外側の `div` そのものだ。白帯を共通の帯に移すため、その `div` から `tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white` だけを外す。余白（`tw-px-3 tw-pt-2`）と中身は残す。Task 11 の列車ダイヤグラムも同じ。
> 間違っていた場合の代償：class 4 語を戻すだけ。

-   [ ] **Step 1: 落ちるテストを書く**

    ```ts
    import { formatTrainLocationSummary } from './train-location-summary.util';

    describe('formatTrainLocationSummary', () => {
        it('現在時刻', () => {
            expect(
                formatTrainLocationSummary({
                    routeName: '本線',
                    mode: 'now',
                    timeText: '08:00',
                    calendarName: '平日',
                }),
            ).toBe('本線 現在時刻（今日のダイヤ）');
        });
        it('時刻指定は時刻（先頭の 0 を落とす）とダイヤ名', () => {
            expect(
                formatTrainLocationSummary({
                    routeName: '本線',
                    mode: 'specified',
                    timeText: '08:00',
                    calendarName: '平日',
                }),
            ).toBe('本線 8:00 指定 平日');
        });
    });
    ```

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern=train-location-summary > .context/jest-tl-summary.txt 2>&1
    ```

    期待する結果：FAIL。

-   [ ] **Step 3: 実装する**

    ```ts
    import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

    /** 細帯の要約。例「本線 現在時刻（今日のダイヤ）」「本線 8:00 指定 平日」。 */
    export function formatTrainLocationSummary(params: {
        routeName: string | null | undefined;
        mode: 'now' | 'specified';
        timeText: string;
        calendarName: string | null | undefined;
    }): string {
        if (params.mode === 'now') {
            return joinSummaryParts([
                params.routeName,
                '現在時刻（今日のダイヤ）',
            ]);
        }
        return joinSummaryParts([
            params.routeName,
            `${params.timeText.replace(/^0(\d)/, '$1')} 指定`,
            params.calendarName,
        ]);
    }
    ```

    `train-location.component.ts`：

    -   路線名は `#routeStations()` から `selectedRouteId()` で引く（項目名 `routeName`）。
    -   ダイヤ名は `CalendarListStateQuery.calendars$`（`src/app/global-states/calendar-list.state`）を `toSignal` して、`calendarId()` で `calendarName` を引く。
    -   `timeText` は `timeInputValue()`。

    これで `bandSummary = computed(...)` を作る。`ControlBandComponent` を imports に足す。

    `train-location.component.html`：

    ```html
    <app-control-band [flush]="true" [summary]="bandSummary()">
        <app-train-location-controller
            ...（今のまま）
        ></app-train-location-controller>
    </app-control-band>
    ```

    コントローラーの外側の `div` から、白地と罫線の 4 語を外す（Ruling）。

-   [ ] **Step 4: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=train-location > .context/jest-tl.txt 2>&1
    ```

    期待する結果：すべて passed。白帯の class を見ているテストは、`app-control-band` の中の `div` を見るように直す。

-   [ ] **Step 5: 整形してコミット**

    ```bash
    git add src/app/pages/train-location/
    git commit -m "feat: :sparkles: 列車位置情報の操作部を共通の帯に載せて貼り付ける"
    ```

---

### Task 11: 列車ダイヤグラム（manual と保存）

**Files:**

-   Modify: `src/app/pages/train-diagram/stores/train-diagram.store.ts`
-   Modify: `src/app/pages/train-diagram/stores/train-diagram.store.spec.ts`
-   Modify: `src/app/pages/train-diagram/services/train-diagram-resolver.service.ts`
-   Modify: `src/app/pages/train-diagram/services/train-diagram-resolver.service.spec.ts`
-   Create: `src/app/pages/train-diagram/utils/train-diagram-summary.util.ts`
-   Test: `src/app/pages/train-diagram/utils/train-diagram-summary.util.spec.ts`
-   Modify: `src/app/pages/train-diagram/components/train-diagram-controller/train-diagram-controller.component.html:4-6`（外側の `div` から白地と罫線を外す）
-   Modify: `src/app/pages/train-diagram/train-diagram.component.ts` / `.html`

**Interfaces:**

-   Consumes: 帯の `collapse="manual"`・`[(collapsed)]`・`flush`（Task 3）。`formatRouteFilterSummary`（Task 2）。
-   Produces（ストア）：
    -   `TrainDiagramStore.setControlCollapsed(collapsed: boolean): void`
    -   `TrainDiagramStore.controlCollapsed$: Observable<boolean>`
    -   `TrainDiagramStore.persistInitialized$: Observable<boolean>`
-   Produces（要約）：

    ```ts
    export function formatTrainDiagramSummary(params: {
        routes: string; // formatRouteFilterSummary の結果
        calendarName: string | null | undefined;
        direction: 'up' | 'down' | 'both';
    }): string;
    ```

-   [ ] **Step 1: 落ちるテストを書く**

    `train-diagram-summary.util.spec.ts`：

    ```ts
    import { formatTrainDiagramSummary } from './train-diagram-summary.util';

    describe('formatTrainDiagramSummary', () => {
        it('路線・ダイヤ名・方向', () => {
            expect(
                formatTrainDiagramSummary({
                    routes: '本線',
                    calendarName: '平日',
                    direction: 'down',
                }),
            ).toBe('本線 平日 下り');
        });
        it('両方は「上り・下り」', () => {
            expect(
                formatTrainDiagramSummary({
                    routes: '全路線',
                    calendarName: '土休日',
                    direction: 'both',
                }),
            ).toBe('全路線 土休日 上り・下り');
        });
    });
    ```

    `train-diagram.store.spec.ts` に足す（ファイル冒頭の既存の import に合わせる）：

    ```ts
    import localForage from 'localforage';

    describe('controlCollapsed の保存', () => {
        it('初めは false で、set すると流れる', (done) => {
            TrainDiagramStore.setControlCollapsed(true);
            TrainDiagramStore.controlCollapsed$.subscribe((value) => {
                expect(value).toBe(true);
                done();
            });
        });

        it('localForage には controlCollapsed だけを書く', async () => {
            const spy = jest.spyOn(localForage, 'setItem');
            TrainDiagramStore.setControlCollapsed(true);
            TrainDiagramStore.setControlCollapsed(false);
            await Promise.resolve();
            const calls = spy.mock.calls.filter(
                ([key]) => key === 'TrainDiagramStore',
            );
            expect(calls.length).toBeGreaterThan(0);
            for (const [, value] of calls) {
                expect(Object.keys(value as object)).toEqual([
                    'controlCollapsed',
                ]);
            }
        });
    });
    ```

    `train-diagram-resolver.service.spec.ts` に足す：

    ```ts
    it('ストアの保存した値を読み終えてから解決する', (done) => {
        // InitializeStateQuery.isInitialized$ を of(true) にしたモックを providers に入れる（TitleService も同様にモック）
        const resolver = TestBed.inject(TrainDiagramResolverService);
        const subject = new ReplaySubject<boolean>(1);
        jest.spyOn(
            TrainDiagramStore,
            'persistInitialized$',
            'get',
        ).mockReturnValue(subject);
        let resolved = false;
        resolver
            .resolve({
                data: { title: '列車ダイヤグラム' },
            } as unknown as ActivatedRouteSnapshot)
            .subscribe(() => (resolved = true));
        expect(resolved).toBe(false);
        subject.next(true);
        subject.complete();
        expect(resolved).toBe(true);
        done();
    });
    ```

    `persistInitialized$` をプロパティで出すと `spyOn(..., 'get')` は使えない。そのときは `TrainDiagramStore.persistInitialized$` を getter にする（`get persistInitialized$() { return persist.initialized$; }`）。運用表のストアと同じ書き方で書けないことは ledger に Ruling として書く。

-   [ ] **Step 2: 落ちることを確かめる**

    ```bash
    npx jest --testPathPattern="train-diagram/(utils/train-diagram-summary|stores|services)" > .context/jest-td-store.txt 2>&1
    ```

    期待する結果：FAIL。

-   [ ] **Step 3: ストアと resolver を実装する**

    `train-diagram.store.ts`：

    -   import に次を足す。

        ```ts
        import { persistState } from '@ngneat/elf-persist-state';
        import localForage from 'localforage';
        ```

    -   `StoreProps` に足す。

        ```ts
        /** 操作帯を畳んでいるか。これだけを persistState で保存する（docs/design.md 列車ダイヤグラム）。 */
        controlCollapsed: boolean;
        ```

    -   初めの値に `controlCollapsed: false` を足す。
    -   `createStore` の直後に足す。

        ```ts
        // 保存するのは操作帯の開閉だけ。全部保存すると列車データ（数 MB）まで書き、
        // 開いたときに前のダイヤ・路線へ戻ってしまう
        const persist = persistState(store, {
            key: 'TrainDiagramStore',
            storage: localForage,
            source: (s) =>
                s.pipe(
                    select((state) => state.controlCollapsed),
                    map((controlCollapsed) => ({ controlCollapsed })),
                ),
        });
        ```

    -   `TrainDiagramStore` に足す。

        ```ts
        persistInitialized$: persist.initialized$,
        setControlCollapsed(collapsed: boolean): void {
            store.update(setProp('controlCollapsed', () => collapsed));
        },
        controlCollapsed$: store.pipe(select((state) => state.controlCollapsed)),
        ```

    `train-diagram-resolver.service.ts`：

    -   `TrainDiagramStore` を import する。
    -   `isInitialized$` を待つ `mergeMap` の後、`map` の前に、`mergeMap(() => TrainDiagramStore.persistInitialized$),` を足す（運用表の resolver と同じ形）。

-   [ ] **Step 4: 要約とページを実装する**

    `train-diagram-summary.util.ts`：

    ```ts
    import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';

    const DIRECTION_LABEL = {
        up: '上り',
        down: '下り',
        both: '上り・下り',
    } as const;

    /** 畳んだ 1 行の要約。例「本線 平日 下り」。 */
    export function formatTrainDiagramSummary(params: {
        routes: string;
        calendarName: string | null | undefined;
        direction: 'up' | 'down' | 'both';
    }): string {
        return joinSummaryParts([
            params.routes,
            params.calendarName,
            DIRECTION_LABEL[params.direction],
        ]);
    }
    ```

    `train-diagram.component.ts`：

    -   `controlCollapsed = toSignal(TrainDiagramStore.controlCollapsed$, { initialValue: false })`
    -   `#routeStations = toSignal(this.#routeStationListStateQuery.routeStations$, { initialValue: [] })`（同じ名前のものが既にあれば、それを使う）
    -   `#calendars = toSignal(inject(CalendarListStateQuery).calendars$, { initialValue: [] })`
    -   要約：

        ```ts
        readonly bandSummary = computed(() => {
            const options = this.#routeStations().map((r) => ({ value: r.routeId, label: r.routeName }));
            return formatTrainDiagramSummary({
                routes: formatRouteFilterSummary(options, this.selectedRouteIds()),
                calendarName: this.#calendars().find((c) => c.calendarId === this.calendarId())?.calendarName,
                direction: this.directionFilter(),
            });
        });
        onControlCollapsedChange(collapsed: boolean): void {
            TrainDiagramStore.setControlCollapsed(collapsed);
        }
        ```

    -   `ControlBandComponent` を imports に足す。

    `train-diagram.component.html`：

    ```html
    <app-control-band
        collapse="manual"
        [flush]="true"
        [summary]="bandSummary()"
        [collapsed]="controlCollapsed()"
        (collapsedChange)="onControlCollapsedChange($event)"
    >
        <app-train-diagram-controller
            ...（今のまま）
        ></app-train-diagram-controller>
    </app-control-band>
    ```

    コントローラーの外側の `div` から、白地と罫線の 4 語を外す（Task 10 の Ruling と同じ）。

-   [ ] **Step 5: 通ることを確かめる**

    ```bash
    npx jest --testPathPattern=train-diagram > .context/jest-td.txt 2>&1
    ```

    期待する結果：すべて passed。

    ページの spec が `CalendarListStateQuery` の不足で落ちたら、モックを足す。`train-diagram-info-panel.component.spec.ts` は前から落ちることがある。master で同じテストが落ちるかを確かめ、同じなら ledger に書いて先へ進む。

-   [ ] **Step 6: 整形してコミット**

    ```bash
    git add src/app/pages/train-diagram/
    git commit -m "feat: :sparkles: 列車ダイヤグラムの操作部を畳めるようにし、畳んだ状態を覚える"
    ```

---

### Task 12: 全体の確認（コントローラー自身が行う）

**Files:** なし（直すものが見つかれば、該当タスクのファイル）

-   [ ] **Step 1: 型・lint・全 jest**

    ```bash
    npx tsc --noEmit -p tsconfig.app.json > .context/tsc.txt 2>&1
    npm run lint > .context/lint.txt 2>&1
    npx jest --testPathPattern=src/app > .context/jest-all.txt 2>&1
    ```

    期待する結果：

    -   tsc はエラー 0。
    -   lint は旧コードの 50 件だけ（master と同じ件数）。
    -   jest は落ちたテストが 0。前から落ちる `train-diagram-info-panel` は、master と同じなら可。

-   [ ] **Step 2: 実物で確かめる（Playwright・本番データ・390px と 1440px）**

    ローカルの client（:4200）と api（:3000）を立てて、8 ページで次を確かめる。

    1. 下までスクロールすると細帯が出て、要約が spec の形になっている。
    2. 細帯の「開く」→ チップか選択欄を変える → 結果がその場で変わり、パネルが閉じない。
    3. 幕を押す・wheel・Esc で閉じる。上端へ戻ると通常の状態に戻る。
    4. 細帯に切り替わる前後で、先頭に見えている要素の `getBoundingClientRect().top` の差が 0px（跳ねない）。
    5. 細帯の下端と、駅別時刻表の上り下りの帯・表の見出し、箱の中の見出し、行路図の駅名の行の上端の間に、重なりが無い。
    6. 細帯の要約・［解除］・開閉のボタンの中心 Y の差が 1px 以内。
    7. 390px で、展開したパネルがはみ出すとき、パネルの中でスクロールして最後の部品まで届く。
    8. 列車ダイヤグラム：畳むと図のカードが 40px を残して伸びる。再読み込みしても畳んだまま出る。
    9. 読み込み中のバーが細帯の上に見える。

    スクリーンショットで目でも確かめる。モックとの比較は、要約の言い回しと縦線の色について行う。

-   [ ] **Step 3: 直したらコミットし、PR 本文を `.context/pr-body-sticky-control-band.md` に書く**

    PR 本文の末尾には次を付ける。

    ```
    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH
    ```

    push はユーザーに頼む（`! git push origin feature/sticky-control-band`）。
