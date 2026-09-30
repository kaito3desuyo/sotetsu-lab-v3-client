# 列車情報の入力（timetable-edit-form）見直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 列車情報の入力ページ（`timetable/add|copy|update`）の時刻入力を表計算風の自前の格子に置き換え、1 つの配置だけを描き、取得を並列にして軽くする。

**Architecture:** 新規の `TimetableEditFormGridComponent` が、今の Reactive Forms（`FormArray<ITimetableEditFormTrip>`）をそのまま受け取って格子を描く。時刻の書式と「前の駅より早い」検出は純関数（utils）に切り出し、格子の赤・誤りの一言・保存の可否（検証器）が同じ関数を使う。`TimetableEditFormTripsComponent` は上の部分（見出し・初期値・路線・個別保存・操作）と、PC／スマホの切り替え（`BreakpointObserver`）だけを持つ。

**Tech Stack:** Angular 20（standalone・OnPush・signals・`@let`/`@if`/`@for`）、Reactive Forms、Angular Material 20（M2）、@angular/cdk 20 `BreakpointObserver`、Tailwind 3.4（`tw-` 接頭辞）、Jest（jsdom）

**Spec:** `docs/superpowers/specs/2026-09-30-timetable-edit-form-design.md`

## Global Constraints

-   対象: `src/app/pages/timetable/timetable-edit-form/**` と `docs/design.md` だけ。API・保存の契約（DTO 変換・`createTripBlocks`/`replaceTripBlock`）は変えない
-   コンポーネントはすべて `ChangeDetectionStrategy.OnPush`・standalone・`inject()`・private は `#`
-   Tailwind は `tw-` 接頭辞。任意プロパティは接頭辞なし（`[font-variant-numeric:tabular-nums]`。`tw-[…]` は生成されない）
-   罫線は `tw-border-solid` を必ず併記（preflight 無効）。`divide-*` は使わない
-   class/style は native `[class]`・`[class.x]`・`[style.x]`。`[ngClass]`/`[ngStyle]` は使わない
-   カード: 白（`tw-bg-white`）・`tw-rounded-card`・影なし・`tw-overflow-hidden` を付けない（sticky を殺す）
-   大きい表はカードの中で縦横スクロール: 箱の高さ `tw-max-h-[calc(100dvh-80px)] md:tw-max-h-[calc(100dvh-96px)]`、`border-separate` ＋各セルの右・下の罫線
-   操作部品の地は白。小見出しは 16px 太字（`tw-text-base tw-font-bold`）
-   時刻の値は今と同じ `HH:mm`。24 時以降（保存時 `hour < 4` → days = 2）は今のまま
-   格子の境目: 600px 未満がスマホ（`Breakpoints.XSmall` = `(max-width: 599.98px)`）。CSS の `hidden` で隠さず `@if` で片方だけ描く
-   jest は `npx jest --testPathPattern=<path>`（sandbox 下の `npm test` は全 spec が落ちる）。結果の `Tests:` 行はファイルに書き出して読む
-   prettier はファイル単位（`npx prettier --write <file>`）。ディレクトリ単位は禁止
-   Bash はパイプでつながない（1 コマンド 1 目的）
-   コミットは署名付き。Bash の `dangerouslyDisableSandbox: true` で実行し、`git log -1 "--format=%G?"` が `G` であることを確かめる
-   コミットに含めない: `.serena/project.yml`・`docs/superpowers/plans/2026-07-03-redesign-implementation.md`
-   コミット形式: `feat: :sparkles: 日本語の要約` など（Conventional Commits ＋絵文字テキスト）。末尾に次の 2 行
    ```
    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH
    ```
-   push・merge はしない。git stash / reset / restore はしない
-   ローカルの api は本番 DB を読む（書く）。**「保存する」は押さない**（実際の保存の確認はユーザーに頼む）

## ファイルの地図

| ファイル                                               | 役割                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `utils/timetable-edit-form-time-input.util.ts`（新規） | 打った数字 ⇄ `HH:mm`                                              |
| `utils/timetable-edit-form-grid.util.ts`（新規）       | 停車種別の循環・記号、始発／終着の位置、前の駅より早い時刻の検出  |
| `interfaces/timetable-edit-form.interface.ts`          | 上の 2 つと格子が使う型を足す                                     |
| `validators/timetable-edit-form.validator.ts`          | 「前の駅より早い」を `findTimeOrderErrors` で判定する             |
| `components/timetable-edit-form-grid/`（新規）         | 格子（Material の上の段＋自前の時刻のセル、キー操作、誤りの一言） |
| `components/timetable-edit-form-trips/`                | 格子を組み込み、上の部分を掟に合わせ、駅ごとの購読をやめる        |
| `timetable-edit-form.component.ts`                     | 取得 5 本を `forkJoin`                                            |
| `docs/design.md`                                       | Material 部品の例外（格子）を書く                                 |

（パスはすべて `src/app/pages/timetable/timetable-edit-form/` から）

---

### Task 1: 時刻の打ち込みの変換（純関数）

**Files:**

-   Create: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.ts`
-   Test: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.spec.ts`

**Interfaces:**

-   Produces:

    -   `normalizeTimeDigits(raw: string | null | undefined): string | null | undefined` — 空は `null`、読めないものは `undefined`、それ以外は `'HH:mm'`
    -   `toEditDigits(time: string | null | undefined): string` — `'11:54'` → `'1154'`、空は `''`

-   [ ] **Step 1: 失敗するテストを書く**

```ts
import {
    normalizeTimeDigits,
    toEditDigits,
} from './timetable-edit-form-time-input.util';

describe('normalizeTimeDigits', () => {
    it('4 桁を HH:mm にする', () => {
        expect(normalizeTimeDigits('1154')).toBe('11:54');
        expect(normalizeTimeDigits('0003')).toBe('00:03');
    });

    it('3 桁は先頭に 0 を足す', () => {
        expect(normalizeTimeDigits('930')).toBe('09:30');
    });

    it('コロン入りでも数字だけを読む', () => {
        expect(normalizeTimeDigits('11:54')).toBe('11:54');
    });

    it('空は null（時刻を消す）', () => {
        expect(normalizeTimeDigits('')).toBeNull();
        expect(normalizeTimeDigits(null)).toBeNull();
        expect(normalizeTimeDigits(undefined)).toBeNull();
    });

    it('桁数が合わない・時分が範囲外なら undefined（読めない）', () => {
        expect(normalizeTimeDigits('9')).toBeUndefined();
        expect(normalizeTimeDigits('99')).toBeUndefined();
        expect(normalizeTimeDigits('12345')).toBeUndefined();
        expect(normalizeTimeDigits('2400')).toBeUndefined();
        expect(normalizeTimeDigits('1260')).toBeUndefined();
    });
});

describe('toEditDigits', () => {
    it('HH:mm を数字 4 桁にする', () => {
        expect(toEditDigits('11:54')).toBe('1154');
    });

    it('空は空文字', () => {
        expect(toEditDigits(null)).toBe('');
        expect(toEditDigits('')).toBe('');
    });
});
```

-   [ ] **Step 2: テストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.spec.ts`
Expected: FAIL（`Cannot find module './timetable-edit-form-time-input.util'`）

-   [ ] **Step 3: 実装する**

```ts
/**
 * 格子の時刻セルで打った文字を 'HH:mm' にする。
 * 数字だけを読み、3 桁は先頭に 0 を足す（930 → 09:30）。
 * 空は null（時刻を消す）、読めないものは undefined（呼び出し側で元に戻す）。
 */
export function normalizeTimeDigits(
    raw: string | null | undefined,
): string | null | undefined {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length === 0) return null;
    if (digits.length < 3 || digits.length > 4) return undefined;

    const padded = digits.padStart(4, '0');
    const hour = Number(padded.slice(0, 2));
    const minute = Number(padded.slice(2));
    if (hour > 23 || minute > 59) return undefined;

    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

/** フォーカス中の表示（数字 4 桁）。'11:54' → '1154' */
export function toEditDigits(time: string | null | undefined): string {
    return (time ?? '').replace(':', '');
}
```

-   [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.spec.ts`
Expected: PASS（7 tests）

-   [ ] **Step 5: 整形してコミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.spec.ts
git add src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.ts src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-time-input.util.spec.ts
git commit -m "feat: :sparkles: 列車情報の入力で打った数字を HH:mm にする関数を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

（commit は `dangerouslyDisableSandbox: true`。最後の出力が `G`）

---

### Task 2: 格子の判定（純関数）と検証器の置き換え

**Files:**

-   Modify: `src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts`（末尾に型を足す）
-   Create: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.ts`
-   Test: `src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.spec.ts`
-   Modify: `src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.ts`（`stopTimesShouldBeLaterThanPrevStopTimes` を置き換え）
-   Test: `src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.spec.ts`（新規）

**Interfaces:**

-   Consumes: なし
-   Produces（interface ファイル）:
    -   `type TimetableEditFormTimeField = 'arrivalTime' | 'departureTime'`
    -   `interface ITimetableEditFormTimeValue { stopType: ETimetableEditFormStopType; arrivalTime: string | null; departureTime: string | null; }`
    -   `interface ITimetableEditFormTimeOrderError { index: number; field: TimetableEditFormTimeField; time: string; prevIndex: number; prevTime: string; }`
-   Produces（grid util）:
    -   `timetableEditFormStopTypeMark: Map<ETimetableEditFormStopType, string>`（停／レ／‖）
    -   `timetableEditFormTimeFieldLabel: Map<TimetableEditFormTimeField, string>`（着／発）
    -   `nextStopType(current: ETimetableEditFormStopType): ETimetableEditFormStopType`（停 → レ → ‖ → 停）
    -   `toServiceMinutes(time: string): number`（04:00 起点の分。`00:30` → `1470`）
    -   `findEndpointIndexes(times: readonly ITimetableEditFormTimeValue[]): { first: number | null; last: number | null }`（‖ 以外の最初と最後）
    -   `findTimeOrderErrors(times: readonly ITimetableEditFormTimeValue[]): ITimetableEditFormTimeOrderError[]`

判定の規則（spec「誤りの見せ方」）: ‖ の駅は飛ばす。前の「時刻のある駅」の発（なければ着）と、この駅の着（なければ発）を 04:00 起点で比べ、この駅の方が早ければ誤り。時刻の無い通過駅はまたいで比べる。停車駅（‖ 以外）が 2 つ以上なら、始発の着・終着の発は保存時に捨てるので無いものとして扱う。

-   [ ] **Step 1: interface ファイルの末尾に型を足す**

```ts
export type TimetableEditFormTimeField = 'arrivalTime' | 'departureTime';

/** 格子の判定に使う 1 駅ぶんの値（times の getRawValue() と同じ形） */
export interface ITimetableEditFormTimeValue {
    stopType: ETimetableEditFormStopType;
    arrivalTime: string | null;
    departureTime: string | null;
}

/** 前の駅より早い時刻。index / prevIndex は times（= 全駅）の位置 */
export interface ITimetableEditFormTimeOrderError {
    index: number;
    field: TimetableEditFormTimeField;
    time: string;
    prevIndex: number;
    prevTime: string;
}
```

-   [ ] **Step 2: grid util の失敗するテストを書く**

```ts
import { ITimetableEditFormTimeValue } from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import {
    findEndpointIndexes,
    findTimeOrderErrors,
    nextStopType,
    timetableEditFormStopTypeMark,
    toServiceMinutes,
} from './timetable-edit-form-grid.util';

const S = ETimetableEditFormStopType;
const t = (
    stopType: ETimetableEditFormStopType,
    arrivalTime: string | null = null,
    departureTime: string | null = null,
): ITimetableEditFormTimeValue => ({ stopType, arrivalTime, departureTime });

describe('nextStopType / timetableEditFormStopTypeMark', () => {
    it('停 → レ → ‖ → 停 と循環する', () => {
        expect(nextStopType(S.STOP)).toBe(S.PASS);
        expect(nextStopType(S.PASS)).toBe(S.NOT_GOING_THROUGH);
        expect(nextStopType(S.NOT_GOING_THROUGH)).toBe(S.STOP);
    });

    it('記号は 停・レ・‖', () => {
        expect(timetableEditFormStopTypeMark.get(S.STOP)).toBe('停');
        expect(timetableEditFormStopTypeMark.get(S.PASS)).toBe('レ');
        expect(timetableEditFormStopTypeMark.get(S.NOT_GOING_THROUGH)).toBe(
            '‖',
        );
    });
});

describe('toServiceMinutes', () => {
    it('04:00 より前は翌日として数える', () => {
        expect(toServiceMinutes('04:00')).toBe(240);
        expect(toServiceMinutes('23:59')).toBe(1439);
        expect(toServiceMinutes('00:30')).toBe(1470);
    });
});

describe('findEndpointIndexes', () => {
    it('‖ 以外の最初と最後の位置を返す', () => {
        expect(
            findEndpointIndexes([
                t(S.NOT_GOING_THROUGH),
                t(S.STOP),
                t(S.PASS),
                t(S.STOP),
                t(S.NOT_GOING_THROUGH),
            ]),
        ).toEqual({ first: 1, last: 3 });
    });

    it('全部 ‖ なら null', () => {
        expect(findEndpointIndexes([t(S.NOT_GOING_THROUGH)])).toEqual({
            first: null,
            last: null,
        });
    });
});

describe('findTimeOrderErrors', () => {
    it('順に並んでいれば誤りなし', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '11:54'),
                t(S.PASS),
                t(S.STOP, '12:01', '12:02'),
                t(S.STOP, '12:10', null),
            ]),
        ).toEqual([]);
    });

    it('前の駅の発より早い着を誤りにする', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '12:15'),
                t(S.STOP, '12:10', '12:11'),
                t(S.STOP, '12:20', null),
            ]),
        ).toEqual([
            {
                index: 1,
                field: 'arrivalTime',
                time: '12:10',
                prevIndex: 0,
                prevTime: '12:15',
            },
        ]);
    });

    it('時刻の無い通過駅をまたいで比べる', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '10:10'),
                t(S.PASS),
                t(S.STOP, '10:05', null),
            ]),
        ).toEqual([
            {
                index: 2,
                field: 'arrivalTime',
                time: '10:05',
                prevIndex: 0,
                prevTime: '10:10',
            },
        ]);
    });

    it('着が無ければ発で比べ、‖ の駅は飛ばす', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '10:10'),
                t(S.NOT_GOING_THROUGH, '09:00', '09:00'),
                t(S.PASS, null, '10:08'),
                t(S.STOP, '10:20', null),
            ]),
        ).toEqual([
            {
                index: 2,
                field: 'departureTime',
                time: '10:08',
                prevIndex: 0,
                prevTime: '10:10',
            },
        ]);
    });

    it('0 時台は 23 時台より後として扱う', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, null, '23:58'),
                t(S.STOP, '00:03', null),
            ]),
        ).toEqual([]);
    });

    it('停車駅が 2 つ以上なら始発の着・終着の発は無いものとして扱う', () => {
        expect(
            findTimeOrderErrors([
                t(S.STOP, '13:00', '10:00'),
                t(S.STOP, '10:10', '09:00'),
            ]),
        ).toEqual([]);
    });
});
```

-   [ ] **Step 3: テストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.spec.ts`
Expected: FAIL（`Cannot find module './timetable-edit-form-grid.util'`）

-   [ ] **Step 4: grid util を実装する**

```ts
import {
    ITimetableEditFormTimeOrderError,
    ITimetableEditFormTimeValue,
    TimetableEditFormTimeField,
} from '../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';

export const timetableEditFormStopTypeMark = new Map<
    ETimetableEditFormStopType,
    string
>([
    [ETimetableEditFormStopType.STOP, '停'],
    [ETimetableEditFormStopType.PASS, 'レ'],
    [ETimetableEditFormStopType.NOT_GOING_THROUGH, '‖'],
]);

export const timetableEditFormTimeFieldLabel = new Map<
    TimetableEditFormTimeField,
    string
>([
    ['arrivalTime', '着'],
    ['departureTime', '発'],
]);

/** 停 → レ → ‖ → 停 */
export function nextStopType(
    current: ETimetableEditFormStopType,
): ETimetableEditFormStopType {
    switch (current) {
        case ETimetableEditFormStopType.STOP:
            return ETimetableEditFormStopType.PASS;
        case ETimetableEditFormStopType.PASS:
            return ETimetableEditFormStopType.NOT_GOING_THROUGH;
        default:
            return ETimetableEditFormStopType.STOP;
    }
}

/** 04:00 起点の分（04:00 より前は翌日として数える） */
export function toServiceMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return (hour < 4 ? hour + 24 : hour) * 60 + minute;
}

/** ‖ 以外の最初と最後の駅の位置（始発・終着） */
export function findEndpointIndexes(
    times: readonly ITimetableEditFormTimeValue[],
): { first: number | null; last: number | null } {
    let first: number | null = null;
    let last: number | null = null;

    times.forEach((time, index) => {
        if (time.stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            return;
        }
        if (first === null) first = index;
        last = index;
    });

    return { first, last };
}

/**
 * 前の駅より早い時刻を列挙する。格子の赤・誤りの一言・保存の可否（検証器）が共有する。
 * 前の「時刻のある駅」の発（なければ着）と、この駅の着（なければ発）を 04:00 起点で比べる。
 * 時刻の無い通過駅はまたいで比べる。停車駅が 2 つ以上なら、保存時に捨てる
 * 始発の着・終着の発は無いものとして扱う。
 */
export function findTimeOrderErrors(
    times: readonly ITimetableEditFormTimeValue[],
): ITimetableEditFormTimeOrderError[] {
    const { first, last } = findEndpointIndexes(times);
    const ignoresEndpoints = first !== last;
    const errors: ITimetableEditFormTimeOrderError[] = [];
    let prev: { index: number; time: string } | null = null;

    times.forEach((time, index) => {
        if (time.stopType === ETimetableEditFormStopType.NOT_GOING_THROUGH) {
            return;
        }

        const arrivalTime =
            ignoresEndpoints && index === first
                ? null
                : time.arrivalTime || null;
        const departureTime =
            ignoresEndpoints && index === last
                ? null
                : time.departureTime || null;

        const field: TimetableEditFormTimeField | null = arrivalTime
            ? 'arrivalTime'
            : departureTime
              ? 'departureTime'
              : null;
        const current = arrivalTime ?? departureTime;

        if (
            field &&
            prev &&
            toServiceMinutes(prev.time) > toServiceMinutes(current)
        ) {
            errors.push({
                index,
                field,
                time: current,
                prevIndex: prev.index,
                prevTime: prev.time,
            });
        }

        const outgoing = departureTime ?? arrivalTime;
        if (outgoing) prev = { index, time: outgoing };
    });

    return errors;
}
```

-   [ ] **Step 5: grid util のテストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.spec.ts`
Expected: PASS（11 tests）

-   [ ] **Step 6: 検証器の失敗するテストを書く**（`validators/timetable-edit-form.validator.spec.ts`）

```ts
import { FormBuilder } from '@angular/forms';
import { ETimetableEditFormStopType } from '../special/enums/timetable-edit-form.enum';
import { TimetableEditFormValidator } from './timetable-edit-form.validator';

const S = ETimetableEditFormStopType;
const fb = new FormBuilder();
const times = (
    rows: Array<[ETimetableEditFormStopType, string | null, string | null]>,
) =>
    fb.array(
        rows.map(([stopType, arrivalTime, departureTime]) =>
            fb.group({ stopType: [stopType], arrivalTime, departureTime }),
        ),
    ) as any;

describe('TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes', () => {
    it('順に並んでいれば null', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '10:00'],
                    [S.STOP, '10:05', null],
                ]),
            ),
        ).toBeNull();
    });

    it('時刻の無い通過駅をまたいでも前の駅より早ければ誤り（以前は見逃していた）', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '10:10'],
                    [S.PASS, null, null],
                    [S.STOP, '10:05', null],
                ]),
            ),
        ).toEqual({ stopTimesShouldBeLaterThanPrevStopTimes: true });
    });

    it('0 時台は 23 時台より後', () => {
        expect(
            TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes(
                times([
                    [S.STOP, null, '23:58'],
                    [S.STOP, '00:03', null],
                ]),
            ),
        ).toBeNull();
    });
});
```

-   [ ] **Step 7: 検証器のテストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.spec.ts`
Expected: FAIL（「時刻の無い通過駅をまたいでも…」が `null` を返して落ちる）

-   [ ] **Step 8: 検証器を置き換える**

`validators/timetable-edit-form.validator.ts` の `stopTimesShouldBeLaterThanPrevStopTimes`（16〜61 行）を次に置き換え、`dayjs` の import を消し、grid util の import を足す。`stopsStationCountShouldBeGreaterAndEqualThanTwo` と末尾の `TimetableEditFormValidator` はそのまま。

```ts
import { findTimeOrderErrors } from '../utils/timetable-edit-form-grid.util';
```

```ts
/** 格子の赤・誤りの一言と同じ判定（findTimeOrderErrors）で保存の可否を決める */
const stopTimesShouldBeLaterThanPrevStopTimes = (
    formArray: FormArray<ITimetableEditFormTripTime>,
): ValidationErrors | null => {
    return findTimeOrderErrors(formArray.getRawValue()).length > 0
        ? { stopTimesShouldBeLaterThanPrevStopTimes: true }
        : null;
};
```

-   [ ] **Step 9: テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form`
Expected: PASS（このディレクトリの既存 spec も含めて全部）

-   [ ] **Step 10: 整形してコミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.spec.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.spec.ts
git add src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.ts src/app/pages/timetable/timetable-edit-form/utils/timetable-edit-form-grid.util.spec.ts src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.ts src/app/pages/timetable/timetable-edit-form/validators/timetable-edit-form.validator.spec.ts
git commit -m "feat: :sparkles: 列車情報の入力で前の駅より早い時刻を通過駅をまたいで見つける" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

---

### Task 3: 時刻の格子コンポーネント

**Files:**

-   Modify: `src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts`（格子の表示用の型を足す）
-   Create: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.ts`
-   Create: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.html`
-   Test: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.spec.ts`

**Interfaces:**

-   Consumes（Task 1・2）: `normalizeTimeDigits`・`toEditDigits`・`findEndpointIndexes`・`findTimeOrderErrors`・`nextStopType`・`timetableEditFormStopTypeMark`・`timetableEditFormTimeFieldLabel`・`TimetableEditFormTimeField`
-   Produces（Task 4 が使う）: `<app-timetable-edit-form-grid>`
    -   inputs: `tripsForm: FormArray<ITimetableEditFormTrip>`（必須）、`stations: StationDetailsDto[]`（必須・全駅。times の並びと同じ）、`visibleStations: StationDetailsDto[]`（必須・表示する駅）、`tripIndexes: number[]`（必須・表示する列車の位置）、`compact: boolean`（既定 false）、`operations: OperationDetailsDto[]`、`tripClasses: TripClassDetailsDto[]`
    -   outputs: `addTrip: void`、`removeTrip: number`（列車の位置）
    -   public: `tripViews()`・`columns()`・`messages()`（テスト用にも使う）

振る舞い（spec「格子」〜「誤りの見せ方」）:

-   1 列車 = `停レ‖ ｜ 着 ｜ 発` の 3 欄。PC は 1 行 28px（`tw-h-7`）、スマホ（`compact`）は 40px（`tw-h-10`）・停レ‖ 44px（`tw-w-11`）
-   上の段（Material）: ＋／−、列車番号（`matInput`）、運用番号・種別（`mat-select`。種別は文字色、塗らない）、入出庫（`mat-checkbox`）、スマホだけ行先。ラベルは左の見出しの列
-   「駅｜列番｜着｜発」の行は上に sticky（PC `tw-top-0`、スマホ `tw-top-12` ＝トップバー 48px の下）、駅名の列は左に sticky
-   PC は箱の中で縦横スクロール、スマホは箱なし（ページがスクロールする）
-   時刻セル: フォーカスで数字 4 桁にして全選択、打鍵は数字 4 桁まで、外れたら `normalizeTimeDigits`。`undefined` は元に戻す。変わったときだけ `markAsDirty()` → `setValue()`（trips 側の下書き保存は `form.dirty` のときだけ走るため、この順）。値が入って停車種別が ‖ なら停にする（無効なセルは打てないので、主にフォーカス中に ‖ にされた場合の守り）
-   ‖ の駅の着・発、停車駅が 2 つ以上のときの始発の着・終着の発は、灰色（`tw-bg-paper-3`）・無効・空表示。control の値は消さない（保存時の切り捨てが二重の守り）
-   誤りのセルは `tw-bg-red-50 tw-text-red-800`。格子の下に「列番: 駅名の着／発（時刻）が前の駅（時刻）より早い」。停車駅が 2 つ未満の誤りは times が dirty のときだけ「列番: 停車駅が 2 つ以上必要」。一言は表示中でない列車（スマホで別の列車）のぶんも出す
-   停車種別のボタン: クリック／スペース（ボタンの既定）で `nextStopType`
-   キー: Enter・↓ で下、↑ で上、←→ で隣の欄。無効な欄は飛ばす。Tab は既定のまま。位置は `data-row`（表示中の駅の位置）・`data-col`（表示中の列の位置 × 3 ＋ {0 停レ‖, 1 着, 2 発}）
-   `role="grid"`、各セルに「列番 駅名 着／発」の `aria-label`
-   列番が空の列は「N本目」と呼ぶ

-   [ ] **Step 1: interface ファイルの末尾に表示用の型を足す**

先頭の import に `import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';` を足す。

```ts
export interface ITimetableEditFormGridTimeCell {
    /** 表示する 'HH:mm'（無効なセルは空） */
    value: string;
    disabled: boolean;
    error: boolean;
    label: string;
}

export interface ITimetableEditFormGridCell {
    /** times（= 全駅）の位置 */
    timeIndex: number;
    stopType: ETimetableEditFormStopType;
    mark: string;
    label: string;
    arrivalTime: ITimetableEditFormGridTimeCell;
    departureTime: ITimetableEditFormGridTimeCell;
}

export interface ITimetableEditFormGridTripView {
    tripIndex: number;
    tripForm: ITimetableEditFormTrip;
    tripNumber: string;
    destination: string;
    tripClass: TripClassDetailsDto | undefined;
    /** visibleStations と同じ並び */
    cells: ITimetableEditFormGridCell[];
    messages: string[];
}
```

-   [ ] **Step 2: 失敗するテストを書く**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ITimetableEditFormTrip } from '../../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';
import { TimetableEditFormGridComponent } from './timetable-edit-form-grid.component';

const S = ETimetableEditFormStopType;
type Row = [ETimetableEditFormStopType, string | null, string | null];

const stations = ['海老名', 'かしわ台', '大和', '二俣川'].map(
    (stationName, i) => ({ stationId: `s${i}`, stationName }),
) as StationDetailsDto[];

const NORMAL: Row[] = [
    [S.STOP, null, '11:54'],
    [S.PASS, null, null],
    [S.STOP, '12:01', '12:02'],
    [S.STOP, '12:10', null],
];

function makeTrip(tripNumber: string, rows: Row[]): ITimetableEditFormTrip {
    const fb = new FormBuilder();
    return fb.group({
        tripNumber: [tripNumber],
        tripClassId: [''],
        operationId: [''],
        depotIn: [false],
        depotOut: [false],
        times: fb.array(
            rows.map(([stopType, arrivalTime, departureTime], i) =>
                fb.group({
                    stationId: [`s${i}`],
                    stopType: [stopType],
                    arrivalTime: [arrivalTime],
                    departureTime: [departureTime],
                }),
            ),
            [
                TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
            ],
        ),
    }) as unknown as ITimetableEditFormTrip;
}

describe('TimetableEditFormGridComponent', () => {
    let fixture: ComponentFixture<TimetableEditFormGridComponent>;
    let component: TimetableEditFormGridComponent;
    let tripsForm: FormArray<ITimetableEditFormTrip>;

    function setup(trips: ITimetableEditFormTrip[], compact = false): void {
        tripsForm = new FormArray(trips);
        fixture = TestBed.createComponent(TimetableEditFormGridComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tripsForm', tripsForm);
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput('visibleStations', stations);
        fixture.componentRef.setInput(
            'tripIndexes',
            trips.map((_, i) => i),
        );
        fixture.componentRef.setInput('compact', compact);
        fixture.detectChanges();
    }

    const input = (label: string): HTMLInputElement =>
        fixture.nativeElement.querySelector(`input[aria-label="${label}"]`);
    const times = (tripIndex = 0) =>
        tripsForm.at(tripIndex).get('times') as FormArray;
    const keydown = (el: HTMLElement, key: string) =>
        el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableEditFormGridComponent],
        }).compileComponents();
    });

    it('始発の着・終着の発は無効で空表示、途中は打てる', () => {
        setup([makeTrip('3030', NORMAL)]);
        const [first, , middle, last] = component.columns()[0].cells;

        expect(first.arrivalTime).toEqual(
            expect.objectContaining({ disabled: true, value: '' }),
        );
        expect(first.departureTime).toEqual(
            expect.objectContaining({ disabled: false, value: '11:54' }),
        );
        expect(middle.arrivalTime.disabled).toBe(false);
        expect(middle.departureTime.disabled).toBe(false);
        expect(last.departureTime.disabled).toBe(true);
        expect(input('3030 海老名 着').disabled).toBe(true);
    });

    it('‖ の駅の着・発は無効', () => {
        setup([
            makeTrip('3030', [
                [S.NOT_GOING_THROUGH, null, null],
                [S.STOP, null, '12:00'],
                [S.STOP, '12:05', '12:06'],
                [S.STOP, '12:10', null],
            ]),
        ]);
        const [notGoing] = component.columns()[0].cells;

        expect(notGoing.mark).toBe('‖');
        expect(notGoing.arrivalTime.disabled).toBe(true);
        expect(notGoing.departureTime.disabled).toBe(true);
    });

    it('停車駅が 1 つだけなら始発の着・終着の発を無効にしない', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
        ]);
        const [only] = component.columns()[0].cells;

        expect(only.arrivalTime.disabled).toBe(false);
        expect(only.departureTime.disabled).toBe(false);
    });

    it('前の駅より早い時刻を赤くし、誤りの一言を出す', () => {
        setup([
            makeTrip('3040', [
                [S.STOP, null, '12:15'],
                [S.PASS, null, null],
                [S.STOP, '12:10', '12:11'],
                [S.STOP, '12:20', null],
            ]),
        ]);

        expect(component.columns()[0].cells[2].arrivalTime.error).toBe(true);
        expect(component.messages()).toEqual([
            '3040: 大和の着（12:10）が海老名（12:15）より早い',
        ]);
        expect(
            input('3040 大和 着').parentElement.classList.contains(
                'tw-bg-red-50',
            ),
        ).toBe(true);
        expect(tripsForm.invalid).toBe(true);
    });

    it('停車駅が 2 つ未満の一言は、触ってから出す', () => {
        setup([
            makeTrip('3030', [
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
        ]);
        expect(component.messages()).toEqual([]);

        const button: HTMLButtonElement = fixture.nativeElement.querySelector(
            'button[aria-label="3030 海老名 停車種別 ‖"]',
        );
        button.click();
        fixture.detectChanges();

        expect(times().at(0).get('stopType').value).toBe(S.STOP);
        expect(component.messages()).toEqual(['3030: 停車駅が 2 つ以上必要']);
    });

    it('停車種別のボタンは 停 → レ → ‖ → 停 と進め、dirty にする', () => {
        setup([makeTrip('3030', NORMAL)]);
        const control = times().at(2).get('stopType');
        const click = () => {
            fixture.nativeElement
                .querySelector(`button[aria-label^="3030 大和 停車種別"]`)
                .click();
            fixture.detectChanges();
        };

        click();
        expect(control.value).toBe(S.PASS);
        expect(control.dirty).toBe(true);
        click();
        expect(control.value).toBe(S.NOT_GOING_THROUGH);
        click();
        expect(control.value).toBe(S.STOP);
    });

    it('フォーカスで数字 4 桁、外れると HH:mm にして control へ入れる', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 大和 発');

        el.focus();
        expect(el.value).toBe('1202');

        el.value = '1203';
        el.dispatchEvent(new Event('blur'));

        expect(times().at(2).get('departureTime').value).toBe('12:03');
        expect(times().at(2).get('departureTime').dirty).toBe(true);
        expect(el.value).toBe('12:03');
    });

    it('3 桁は先頭に 0 を足す', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 海老名 発');

        el.focus();
        el.value = '958';
        el.dispatchEvent(new Event('blur'));

        expect(times().at(0).get('departureTime').value).toBe('09:58');
    });

    it('読めない入力は元に戻し、空は時刻を消す', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 海老名 発');

        el.focus();
        el.value = '99';
        el.dispatchEvent(new Event('blur'));
        expect(el.value).toBe('11:54');
        expect(times().at(0).get('departureTime').value).toBe('11:54');

        el.focus();
        el.value = '';
        el.dispatchEvent(new Event('blur'));
        expect(times().at(0).get('departureTime').value).toBeNull();
    });

    it('打鍵は数字 4 桁までに絞る', () => {
        setup([makeTrip('3030', NORMAL)]);
        const el = input('3030 大和 着');

        el.focus();
        el.value = '12:345';
        el.dispatchEvent(new Event('input'));

        expect(el.value).toBe('1234');
    });

    it('Enter で下の駅へ、無効な欄は飛ばす', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, '11:54'],
                [S.NOT_GOING_THROUGH, null, null],
                [S.STOP, '12:01', '12:02'],
                [S.STOP, '12:10', null],
            ]),
        ]);
        const from = input('3030 海老名 発');

        from.focus();
        keydown(from, 'Enter');

        expect(document.activeElement).toBe(input('3030 大和 発'));
    });

    it('→ で隣の欄へ、無効な欄は飛ばす（停レ‖ → 着は無効 → 発）', () => {
        setup([makeTrip('3030', NORMAL)]);
        const mark: HTMLButtonElement = fixture.nativeElement.querySelector(
            'button[aria-label^="3030 海老名 停車種別"]',
        );

        mark.focus();
        keydown(mark, 'ArrowRight');

        expect(document.activeElement).toBe(input('3030 海老名 発'));
    });

    it('行先は最後の停車駅、種別は tripClassId から引く', () => {
        setup([makeTrip('3030', NORMAL)]);
        fixture.componentRef.setInput('tripClasses', [
            {
                tripClassId: 'tc-1',
                tripClassName: '特急（SO）',
                tripClassColor: '#e60012',
            },
        ]);
        tripsForm.at(0).get('tripClassId').setValue('tc-1');
        fixture.detectChanges();

        expect(component.columns()[0].destination).toBe('二俣川');
        expect(component.columns()[0].tripClass?.tripClassName).toBe(
            '特急（SO）',
        );
    });

    it('スマホでは行先の段を出し、PC では出さない', () => {
        setup([makeTrip('3030', NORMAL)], true);
        expect(fixture.nativeElement.textContent).toContain('行先');

        fixture.componentRef.setInput('compact', false);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('行先');
    });

    it('tripIndexes の列車だけを描き、一言は全列車ぶん出す', () => {
        setup([
            makeTrip('3030', [
                [S.STOP, null, '12:15'],
                [S.STOP, '12:10', null],
                [S.NOT_GOING_THROUGH, null, null],
                [S.NOT_GOING_THROUGH, null, null],
            ]),
            makeTrip('3040', NORMAL),
        ]);
        fixture.componentRef.setInput('tripIndexes', [1]);
        fixture.detectChanges();

        expect(component.columns().map((c) => c.tripNumber)).toEqual(['3040']);
        expect(component.messages()).toEqual([
            '3030: かしわ台の着（12:10）が海老名（12:15）より早い',
        ]);
    });

    it('− は removeTrip に列車の位置を、＋ は addTrip を出す', () => {
        setup([makeTrip('3030', NORMAL), makeTrip('3040', NORMAL)]);
        const removed = jest.fn();
        const added = jest.fn();
        component.removeTrip.subscribe(removed);
        component.addTrip.subscribe(added);

        fixture.nativeElement
            .querySelector('button[aria-label="3040を削除する"]')
            .click();
        fixture.nativeElement
            .querySelector(
                'button[aria-label="列車を追加する"]:not([disabled])',
            )
            .click();

        expect(removed).toHaveBeenCalledWith(1);
        expect(added).toHaveBeenCalled();
    });
});
```

-   [ ] **Step 3: テストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid`
Expected: FAIL（`Cannot find module './timetable-edit-form-grid.component'`）

-   [ ] **Step 4: コンポーネントの TS を書く**

```ts
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { merge } from 'rxjs';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import {
    ITimetableEditFormGridCell,
    ITimetableEditFormGridTimeCell,
    ITimetableEditFormGridTripView,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
    TimetableEditFormTimeField,
} from '../../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../../special/enums/timetable-edit-form.enum';
import {
    findEndpointIndexes,
    findTimeOrderErrors,
    nextStopType,
    timetableEditFormStopTypeMark,
    timetableEditFormTimeFieldLabel,
} from '../../utils/timetable-edit-form-grid.util';
import {
    normalizeTimeDigits,
    toEditDigits,
} from '../../utils/timetable-edit-form-time-input.util';

/** キーと移動量（行, 欄） */
const GRID_MOVES: Readonly<Record<string, readonly [number, number]>> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    Enter: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
};

/**
 * 列車情報の時刻の格子。Material 部品の例外（docs/design.md「入力の格子」）。
 * 打ち込みの速さと重さのため、時刻と停車種別のセルは素の input / button で組む。
 * 値は親の Reactive Forms（tripsForm）にそのまま結ぶ。
 */
@Component({
    selector: 'app-timetable-edit-form-grid',
    templateUrl: './timetable-edit-form-grid.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'tw-block' },
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
    ],
})
export class TimetableEditFormGridComponent {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly tripsForm = input.required<FormArray<ITimetableEditFormTrip>>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly visibleStations = input.required<StationDetailsDto[]>();
    readonly tripIndexes = input.required<number[]>();
    readonly compact = input<boolean>(false);
    readonly operations = input<OperationDetailsDto[]>([]);
    readonly tripClasses = input<TripClassDetailsDto[]>([]);

    readonly addTrip = output<void>();
    readonly removeTrip = output<number>();

    readonly stopTypeEnum = ETimetableEditFormStopType;

    /** フォームの値・状態が変わるたびに進める（computed の再計算の合図） */
    readonly #revision = signal(0);

    readonly rowHeightClass = computed(() =>
        this.compact() ? 'tw-h-10' : 'tw-h-7',
    );

    readonly #stationIndexes = computed(
        () => new Map(this.stations().map((s, i) => [s.stationId, i])),
    );

    readonly #tripClassMap = computed(
        () => new Map(this.tripClasses().map((tc) => [tc.tripClassId, tc])),
    );

    readonly tripViews = computed<ITimetableEditFormGridTripView[]>(() => {
        this.#revision();
        const form = this.tripsForm();
        const stations = this.stations();

        return form.controls.map((tripForm, tripIndex) =>
            this.#buildTripView(tripForm, tripIndex, stations),
        );
    });

    readonly columns = computed(() => {
        const views = this.tripViews();
        // 駅が差し替わった直後は、フォームが作り直されるまで描かない
        const stationCount = this.stations().length;
        return this.tripIndexes()
            .map((i) => views[i])
            .filter(
                (view) =>
                    !!view &&
                    (view.tripForm.get('times') as FormArray).length ===
                        stationCount,
            );
    });

    readonly messages = computed(() =>
        this.tripViews().flatMap((view) => view.messages),
    );

    constructor() {
        effect((onCleanup) => {
            const form = this.tripsForm();
            const subscription = merge(
                form.valueChanges,
                form.statusChanges,
            ).subscribe(() => this.#revision.update((v) => v + 1));
            this.#revision.update((v) => v + 1);
            onCleanup(() => subscription.unsubscribe());
        });
    }

    onToggleStopType(
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
    ): void {
        const control = this.#timeForm(tripForm, timeIndex).get('stopType');
        control.markAsDirty();
        control.setValue(nextStopType(control.value));
    }

    onTimeFocus(event: FocusEvent): void {
        const el = event.target as HTMLInputElement;
        el.value = toEditDigits(el.value);
        el.select();
    }

    onTimeInput(event: Event): void {
        const el = event.target as HTMLInputElement;
        el.value = el.value.replace(/\D/g, '').slice(0, 4);
    }

    onTimeBlur(
        event: FocusEvent,
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
        field: TimetableEditFormTimeField,
    ): void {
        const el = event.target as HTMLInputElement;
        const timeForm = this.#timeForm(tripForm, timeIndex);
        const control = timeForm.get(field);
        const next = normalizeTimeDigits(el.value);

        if (next === undefined) {
            el.value = control.value ?? '';
            return;
        }

        el.value = next ?? '';
        if (next === (control.value || null)) return;

        // 下書き保存は form.dirty のときだけ走るので、setValue より先に dirty にする
        control.markAsDirty();
        control.setValue(next);

        const stopType = timeForm.get('stopType');
        if (
            next !== null &&
            stopType.value === ETimetableEditFormStopType.NOT_GOING_THROUGH
        ) {
            stopType.markAsDirty();
            stopType.setValue(ETimetableEditFormStopType.STOP);
        }
    }

    onGridKeydown(event: KeyboardEvent): void {
        const el = event.target as HTMLElement;
        const move = GRID_MOVES[event.key];
        if (!move || el.dataset['row'] === undefined) return;

        event.preventDefault();
        let row = Number(el.dataset['row']);
        let col = Number(el.dataset['col']);

        for (;;) {
            row += move[0];
            col += move[1];
            const next = this.#host.nativeElement.querySelector<
                HTMLInputElement | HTMLButtonElement
            >(`[data-row="${row}"][data-col="${col}"]`);
            if (!next) return;
            if (!next.disabled) {
                next.focus();
                return;
            }
        }
    }

    #timeForm(
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
    ): ITimetableEditFormTripTime {
        return (
            tripForm.get('times') as FormArray<ITimetableEditFormTripTime>
        ).at(timeIndex);
    }

    #buildTripView(
        tripForm: ITimetableEditFormTrip,
        tripIndex: number,
        stations: StationDetailsDto[],
    ): ITimetableEditFormGridTripView {
        const timesForm = tripForm.get(
            'times',
        ) as FormArray<ITimetableEditFormTripTime>;
        const times = timesForm.getRawValue();
        const tripNumber =
            tripForm.get('tripNumber').value || `${tripIndex + 1}本目`;
        const { first, last } = findEndpointIndexes(times);
        const disablesEndpoints = first !== last;
        const errors = findTimeOrderErrors(times);
        const errorKeys = new Set(errors.map((e) => `${e.index}:${e.field}`));
        const stationIndexes = this.#stationIndexes();

        const cells = this.visibleStations()
            .map((station) => {
                const timeIndex = stationIndexes.get(station.stationId);
                const time = times[timeIndex];
                if (!time) return null;

                const notGoing =
                    time.stopType ===
                    ETimetableEditFormStopType.NOT_GOING_THROUGH;
                const mark = timetableEditFormStopTypeMark.get(time.stopType);
                const timeCell = (
                    field: TimetableEditFormTimeField,
                    endpointIndex: number | null,
                ): ITimetableEditFormGridTimeCell => {
                    const disabled =
                        notGoing ||
                        (disablesEndpoints && timeIndex === endpointIndex);
                    return {
                        value: disabled ? '' : (time[field] ?? ''),
                        disabled,
                        error: errorKeys.has(`${timeIndex}:${field}`),
                        label: `${tripNumber} ${station.stationName} ${timetableEditFormTimeFieldLabel.get(field)}`,
                    };
                };

                return {
                    timeIndex,
                    stopType: time.stopType,
                    mark,
                    label: `${tripNumber} ${station.stationName} 停車種別 ${mark}`,
                    arrivalTime: timeCell('arrivalTime', first),
                    departureTime: timeCell('departureTime', last),
                } satisfies ITimetableEditFormGridCell;
            })
            .filter((cell): cell is ITimetableEditFormGridCell => !!cell);

        const messages = errors.map(
            (e) =>
                `${tripNumber}: ${stations[e.index]?.stationName}の${timetableEditFormTimeFieldLabel.get(e.field)}（${e.time}）が${stations[e.prevIndex]?.stationName}（${e.prevTime}）より早い`,
        );
        if (
            timesForm.dirty &&
            timesForm.hasError(
                'stopsStationCountShouldBeGreaterAndEqualThanTwo',
            )
        ) {
            messages.push(`${tripNumber}: 停車駅が 2 つ以上必要`);
        }

        return {
            tripIndex,
            tripForm,
            tripNumber,
            destination:
                last === null ? '' : (stations[last]?.stationName ?? ''),
            tripClass: this.#tripClassMap().get(
                tripForm.get('tripClassId').value,
            ),
            cells,
            messages,
        };
    }
}
```

-   [ ] **Step 5: テンプレートを書く**

```html
@let cols = columns(); @let heightClass = rowHeightClass();

<!-- PC はカードの中で縦横スクロール（design.md 面の掟）。スマホは箱なしでページがスクロールする -->
<div
    [class]="
        compact()
            ? ''
            : 'tw-max-h-[calc(100dvh-80px)] tw-overflow-auto md:tw-max-h-[calc(100dvh-96px)]'
    "
>
    <table
        role="grid"
        aria-label="列車の時刻"
        class="tw-border-separate tw-border-spacing-0 tw-text-sm [font-variant-numeric:tabular-nums]"
        [class.tw-w-full]="compact()"
        (keydown)="onGridKeydown($event)"
    >
        <thead>
            <!-- 上の段は Material（例外は時刻のセルだけ） -->
            <tr>
                <th
                    class="tw-sticky tw-left-0 tw-z-[5] tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2"
                ></th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-p-1"
                >
                    <div class="tw-flex tw-justify-end tw-gap-1">
                        <button
                            type="button"
                            mat-icon-button
                            [attr.aria-label]="col.tripNumber + 'を削除する'"
                            [disabled]="tripsForm().length === 1"
                            (click)="removeTrip.emit(col.tripIndex)"
                        >
                            <mat-icon>remove</mat-icon>
                        </button>
                        <button
                            type="button"
                            mat-icon-button
                            aria-label="列車を追加する"
                            [disabled]="
                                    !compact() &&
                                    col.tripIndex !== tripsForm().length - 1
                                "
                            (click)="addTrip.emit()"
                        >
                            <mat-icon>add</mat-icon>
                        </button>
                    </div>
                </td>
                }
            </tr>
            <tr>
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                >
                    列車番号
                </th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-p-1"
                >
                    <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
                        <input
                            matInput
                            aria-label="列車番号"
                            [formControl]="col.tripForm.controls.tripNumber"
                        />
                    </mat-form-field>
                </td>
                }
            </tr>
            <tr>
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                >
                    運用番号
                </th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-p-1"
                >
                    <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
                        <mat-select
                            aria-label="運用番号"
                            [formControl]="col.tripForm.controls.operationId"
                        >
                            @for ( operation of operations(); track
                            operation.operationId ) {
                            <mat-option [value]="operation.operationId">
                                {{ operation.operationNumber }}
                            </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                </td>
                }
            </tr>
            <tr>
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                >
                    種別
                </th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-p-1"
                >
                    <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
                        <!-- 種別は塗りチップにしない（ユーザー指示 2026-08-22）。系統付きの正式名を文字色で -->
                        <mat-select
                            aria-label="種別"
                            [formControl]="col.tripForm.controls.tripClassId"
                        >
                            <mat-select-trigger>
                                @if (col.tripClass; as tc) {
                                <span
                                    [style.color]="
                                                tc.tripClassColor ?? null
                                            "
                                    >{{ tc.tripClassName }}</span
                                >
                                }
                            </mat-select-trigger>
                            @for ( tripClass of tripClasses(); track
                            tripClass.tripClassId ) {
                            <mat-option [value]="tripClass.tripClassId">
                                <span
                                    [style.color]="
                                                tripClass.tripClassColor ?? null
                                            "
                                    >{{ tripClass.tripClassName }}</span
                                >
                            </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>
                </td>
                }
            </tr>
            <tr>
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                >
                    入出庫
                </th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-p-1"
                >
                    <div class="tw-flex tw-justify-center tw-gap-2">
                        <mat-checkbox
                            [formControl]="col.tripForm.controls.depotIn"
                            >入庫</mat-checkbox
                        >
                        <mat-checkbox
                            color="accent"
                            [formControl]="col.tripForm.controls.depotOut"
                            >出庫</mat-checkbox
                        >
                    </div>
                </td>
                }
            </tr>
            @if (compact()) {
            <tr>
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                >
                    行先
                </th>
                @for (col of cols; track col.tripForm) {
                <td
                    colspan="3"
                    class="tw-h-10 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-r-rule-strong tw-bg-white tw-px-2"
                >
                    {{ col.destination }}
                </td>
                }
            </tr>
            }
            <!-- 「駅｜列番｜着｜発」は上に sticky。スマホはトップバー（48px）の下 -->
            <tr>
                <th
                    class="tw-sticky tw-left-0 tw-z-20 tw-h-7 tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule-strong tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal tw-text-muted"
                    [class.tw-top-0]="!compact()"
                    [class.tw-top-12]="compact()"
                >
                    駅
                </th>
                @for (col of cols; track col.tripForm) {
                <th
                    class="tw-sticky tw-z-10 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-b-rule-strong tw-bg-paper-2 tw-px-1 tw-font-bold"
                    [class.tw-top-0]="!compact()"
                    [class.tw-top-12]="compact()"
                >
                    {{ col.tripNumber }}
                </th>
                <th
                    class="tw-sticky tw-z-10 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-border-b-rule-strong tw-bg-paper-2 tw-text-xs tw-font-normal tw-text-muted"
                    [class.tw-top-0]="!compact()"
                    [class.tw-top-12]="compact()"
                >
                    着
                </th>
                <th
                    class="tw-sticky tw-z-10 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-b-rule-strong tw-border-r-rule-strong tw-bg-paper-2 tw-text-xs tw-font-normal tw-text-muted"
                    [class.tw-top-0]="!compact()"
                    [class.tw-top-12]="compact()"
                >
                    発
                </th>
                }
            </tr>
        </thead>
        <tbody>
            @for (station of visibleStations(); track station.stationId; let r =
            $index) {
            <tr>
                <!-- 駅名は潰さない（scale をやめる）。最長「羽沢横浜国大」が 1 行に収まるよう nowrap -->
                <th
                    scope="row"
                    class="tw-sticky tw-left-0 tw-z-[5] tw-whitespace-nowrap tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-paper-2 tw-px-2 tw-text-right tw-font-normal"
                >
                    {{ station.stationName }}
                </th>
                @for (col of cols; track col.tripForm; let c = $index) { @let
                cell = col.cells[r];
                <td
                    class="tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-white tw-p-0 [outline-offset:-2px] focus-within:[outline:2px_solid_var(--color-focus)]"
                    [class.tw-w-10]="!compact()"
                    [class.tw-w-11]="compact()"
                >
                    <button
                        type="button"
                        class="tw-bg-transparent tw-block tw-w-full tw-cursor-pointer tw-border-0 tw-p-0 tw-text-sm tw-outline-none"
                        [class]="heightClass"
                        [class.tw-font-bold]="
                                    cell.stopType === stopTypeEnum.STOP
                                "
                        [class.tw-text-muted]="
                                    cell.stopType !== stopTypeEnum.STOP
                                "
                        [attr.data-row]="r"
                        [attr.data-col]="c * 3"
                        [attr.aria-label]="cell.label"
                        (click)="
                                    onToggleStopType(col.tripForm, cell.timeIndex)
                                "
                    >
                        {{ cell.mark }}
                    </button>
                </td>
                @for ( field of ['arrivalTime', 'departureTime']; track field;
                let k = $index ) { @let t = k === 0 ? cell.arrivalTime :
                cell.departureTime;
                <td
                    class="tw-min-w-16 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-p-0 [outline-offset:-2px] focus-within:[outline:2px_solid_var(--color-focus)]"
                    [class.tw-border-r-rule-strong]="k === 1"
                    [class.tw-bg-paper-3]="t.disabled"
                    [class.tw-bg-red-50]="t.error && !t.disabled"
                    [class.tw-text-red-800]="t.error && !t.disabled"
                    [class.tw-bg-white]="!t.disabled && !t.error"
                >
                    <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        size="4"
                        class="tw-bg-transparent tw-block tw-w-full tw-border-0 tw-p-0 tw-text-center tw-outline-none [color:inherit] [font:inherit]"
                        [class]="heightClass"
                        [attr.data-row]="r"
                        [attr.data-col]="c * 3 + 1 + k"
                        [attr.aria-label]="t.label"
                        [value]="t.value"
                        [disabled]="t.disabled"
                        (focus)="onTimeFocus($event)"
                        (input)="onTimeInput($event)"
                        (blur)="
                                        onTimeBlur(
                                            $event,
                                            col.tripForm,
                                            cell.timeIndex,
                                            $any(field)
                                        )
                                    "
                    />
                </td>
                } }
            </tr>
            }
        </tbody>
    </table>
</div>

@if (messages().length) {
<ul
    role="alert"
    class="tw-m-0 tw-mt-2 tw-flex tw-list-none tw-flex-col tw-gap-1 tw-p-0 tw-text-sm tw-text-red-800"
>
    @for (message of messages(); track $index) {
    <li>{{ message }}</li>
    }
</ul>
}
```

注意（実装者向け）:

-   `[class]="heightClass"` は native の class バインディングなので、静的な `class` と `[class.x]` とマージされる（Angular 20）
-   `tw-border-r-rule-strong` / `tw-border-b-rule-strong` は辺ごとの色（Tailwind 3.4 にある）。`tw-border-rule` の後に置いても、辺ごとの色の方が CSS で後に出るので勝つ。実画面で太い罫線が出ることを Task 6 で目視する

-   [ ] **Step 6: テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid`
Expected: PASS（16 tests）

-   [ ] **Step 7: 整形してコミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.html
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid/timetable-edit-form-grid.component.spec.ts
git add src/app/pages/timetable/timetable-edit-form/interfaces/timetable-edit-form.interface.ts src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-grid
git commit -m "feat: :sparkles: 列車情報の入力に表計算風の時刻の格子を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

---

### Task 4: 列車の入力カードに格子を組み込む

**Files:**

-   Modify: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.ts`（全体を下の内容に置き換え）
-   Modify: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.html`（全体を下の内容に置き換え）
-   Test: `src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.spec.ts`

**Interfaces:**

-   Consumes（Task 3）: `<app-timetable-edit-form-grid [tripsForm] [stations] [visibleStations] [tripIndexes] [compact] [operations] [tripClasses] (addTrip) (removeTrip)>`
-   Produces: inputs / outputs は今と同じ（root の `timetable-edit-form.component.html` は変えない）。public に `isCompact()`・`tripCount()`・`shownTripIndexes()` を足す。`stopTypeArray`・`isHolidayCalendar`・`isPassStopType`・`onToggleStopType`・`selectedTripClass`・`destinationLabel` は消す（格子に移った）

変えること（spec「ページの上の部分」「軽量化」）:

-   表とスマホの縦並びを格子 1 つに置き換える。`@if (isCompact())` で片方の配置だけ描く
-   駅ごとの `valueChanges` 購読（`#changeDisabledStateWhenChangeStopType`・`#unsubscriber$`）をやめる。control は無効にしない（格子が描画時に決める。保存は ‖ を捨て、下書きは `getRawValue`）
-   見出し: 平日／土休日の色の帯をやめ、16px 太字の `h2`「2026年03月14日改正 平日ダイヤ 上り時刻表」
-   初期値の取り込みは `tw-bg-paper-2` の面（枠線をやめる）
-   列車個別保存モード: `mat-slide-toggle`＋1 行の説明＋ⓘ（`matTooltip`。押しても開く）。4 行の長文は ⓘ に全文を残す（情報は削らない）
-   操作: PC はカードの下に「クリア・下書き保存・登録する／更新する」。スマホは「‹ n / m 列車目 › クリア」を格子の上、「下書き保存・登録する／更新する」を下に sticky（影あり＝design.md が許す「sticky な操作バー」）

-   [ ] **Step 1: 保存の DTO を今のコードで固定するテストを足す（特性テスト）**

`timetable-edit-form-trips.component.spec.ts` の最後の `describe` の後（ファイル末尾の `});` の前）に足す。

```ts
describe('保存の DTO（格子に置き換えても変えない）', () => {
    it('経由なしを除き、始発の着・終着の発を捨て、停車種別を乗降区分にする', () => {
        fixture.componentRef.setInput('stations', [
            makeStation('横浜'),
            makeStation('西谷'),
            makeStation('二俣川'),
        ]);
        fixture.componentRef.setInput('visibleStationIds', [
            '横浜',
            '西谷',
            '二俣川',
        ]);
        fixture.detectChanges();

        const tripForm = component.tripsForm.controls[0];
        tripForm.patchValue({ tripNumber: '1001', tripClassId: 'tc-1' });
        const times = tripForm.get('times') as FormArray;
        times.at(0).patchValue({
            stopType: 'stop',
            arrivalTime: '09:58',
            departureTime: '10:00',
        });
        times.at(1).patchValue({
            stopType: 'not-going-through',
            arrivalTime: '10:03',
            departureTime: '10:04',
        });
        times.at(2).patchValue({
            stopType: 'stop',
            arrivalTime: '10:08',
            departureTime: '10:09',
        });

        const spy = jest.fn();
        component.clickSubmit.subscribe(spy);
        component.onClickSubmit();

        const [dto] = spy.mock.calls[0][0];
        expect(dto.tripNumber).toBe('1001');
        expect(
            dto.times.map((t: any) => ({
                stationId: t.stationId,
                stopSequence: t.stopSequence,
                pickupType: t.pickupType,
                dropoffType: t.dropoffType,
                arrivalTime: t.arrivalTime,
                arrivalDays: t.arrivalDays,
                departureTime: t.departureTime,
                departureDays: t.departureDays,
            })),
        ).toEqual([
            {
                stationId: '横浜',
                stopSequence: 1,
                pickupType: 0,
                dropoffType: 1,
                arrivalTime: null,
                arrivalDays: null,
                departureTime: '10:00',
                departureDays: 1,
            },
            {
                stationId: '二俣川',
                stopSequence: 2,
                pickupType: 1,
                dropoffType: 0,
                arrivalTime: '10:08',
                arrivalDays: 1,
                departureTime: null,
                departureDays: null,
            },
        ]);
    });

    it('0 時台の時刻は days = 2', () => {
        const tripForm = component.tripsForm.controls[0];
        const times = tripForm.get('times') as FormArray;
        times.at(0).patchValue({ stopType: 'stop', departureTime: '23:58' });
        times.at(1).patchValue({ stopType: 'stop', arrivalTime: '00:03' });

        const spy = jest.fn();
        component.clickSubmit.subscribe(spy);
        component.onClickSubmit();

        const [dto] = spy.mock.calls[0][0];
        expect(dto.times[0].departureDays).toBe(1);
        expect(dto.times[1].arrivalDays).toBe(2);
    });
});
```

-   [ ] **Step 2: 今のコードで特性テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips`
Expected: PASS。**落ちたら**、それは今のコードの本当の出力と期待値の差なので、期待値を今のコードの出力に合わせる（`classTransformerOptions` による変換など）。コードは直さない。

-   [ ] **Step 3: spec を新しい形に書き換える**

1. import に足す:

```ts
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';
```

2. `describe` の中の変数宣言の後に `let breakpoint$: BehaviorSubject<BreakpointState>;` を足し、`beforeEach` の `configureTestingModule` を次にする:

```ts
breakpoint$ = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
});

await TestBed.configureTestingModule({
    imports: [TimetableEditFormTripsComponent],
    providers: [
        {
            provide: BreakpointObserver,
            useValue: { observe: () => breakpoint$ },
        },
    ],
}).compileComponents();
```

3. `describe('G9: モバイル1駅1行の停/通トグルと行先導出', …)` を丸ごと消す（循環・行先は格子の spec に移った）。
4. `describe('G9: 種別バッジ・下書き保存ボタン', …)` から `selectedTripClass は…` の `it` を消す（`onClickSaveDraft は…` は残す）。
5. 次の `describe` を足す:

```ts
describe('格子の組み込み', () => {
    it('PC 幅では全列車を格子に出す', () => {
        component.onClickAdd();
        fixture.detectChanges();

        expect(component.isCompact()).toBe(false);
        expect(component.shownTripIndexes()).toEqual([0, 1]);
    });

    it('スマホ幅では今の 1 列車だけを出し、追加するとその列車へ移る', () => {
        breakpoint$.next({ matches: true, breakpoints: {} });
        fixture.detectChanges();

        expect(component.shownTripIndexes()).toEqual([0]);

        component.onClickAdd();
        fixture.detectChanges();

        expect(component.currentTripIndex()).toBe(1);
        expect(component.shownTripIndexes()).toEqual([1]);
    });

    it('片方の配置だけを描く（スマホの列車送りは PC では描かない）', () => {
        expect(fixture.nativeElement.textContent).not.toContain('列車目');

        breakpoint$.next({ matches: true, breakpoints: {} });
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('1 / 1 列車目');
    });

    it('経由なしの駅でも時刻の control を無効にしない（無効は格子が描画時に決める）', () => {
        const time = (
            component.tripsForm.controls[0].get('times') as FormArray
        ).at(0);

        expect(time.get('stopType').value).toBe('not-going-through');
        expect(time.get('arrivalTime').disabled).toBe(false);
        expect(time.get('departureTime').disabled).toBe(false);
    });

    it('保存ボタンのラベルは ADD で「登録する」、UPDATE で「更新する」', () => {
        expect(component.submitButtonLabel()).toBe('登録する');

        fixture.componentRef.setInput('mode', ETimetableEditFormMode.UPDATE);
        fixture.detectChanges();

        expect(component.submitButtonLabel()).toBe('更新する');
    });

    it('格子を描く', () => {
        expect(
            fixture.nativeElement.querySelector('app-timetable-edit-form-grid'),
        ).not.toBeNull();
    });
});
```

-   [ ] **Step 4: テストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips`
Expected: FAIL（`isCompact is not a function` など）

-   [ ] **Step 5: TS を置き換える**

`timetable-edit-form-trips.component.ts` の全体:

```ts
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormArray,
    FormBuilder,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import {
    MatSlideToggleChange,
    MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { plainToClass } from 'class-transformer';
import dayjs from 'dayjs';
import { map } from 'rxjs/operators';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { CollapsiblePanelComponent } from 'src/app/shared/collapsible-panel/collapsible-panel.component';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import {
    ITimetableEditForm,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
} from '../../interfaces/timetable-edit-form.interface';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../../special/enums/timetable-edit-form.enum';
import { offsetTimeString } from '../../utils/timetable-edit-form-offset.util';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';
import { TimetableEditFormGridComponent } from '../timetable-edit-form-grid/timetable-edit-form-grid.component';

@Component({
    selector: 'app-timetable-edit-form-trips',
    templateUrl: './timetable-edit-form-trips.component.html',
    styleUrls: ['./timetable-edit-form-trips.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatMenuModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatIconModule,
        PipesModule,
        FilterChipsComponent,
        CollapsiblePanelComponent,
        AppButtonComponent,
        TimetableEditFormGridComponent,
    ],
})
export class TimetableEditFormTripsComponent {
    readonly #cd = inject(ChangeDetectorRef);
    readonly #fb = inject(FormBuilder);
    readonly #breakpointObserver = inject(BreakpointObserver);

    readonly modeEnum = ETimetableEditFormMode;
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    /** 列車個別保存モードの説明の全文（ⓘ のツールチップ。以前の 4 行の説明を削らずに移した） */
    readonly saveTripsIndividuallyHelp =
        '既定では、複数入力した列車を分割・併合・直通のある列車群として 1 つのグループに割り当てます。' +
        '途中駅で方向は変わらず、列車番号や種別が変わる場合に使います。' +
        '分割・併合・直通のない列車を複数同時に保存する（グループを作らず、列車ごとに 1 つのグループを割り当てる）場合は ON にします。';

    readonly form: ITimetableEditForm = this.#fb.group({
        trips: this.#fb.array<ITimetableEditFormTrip>([]),
    });

    get tripsForm(): FormArray<ITimetableEditFormTrip> {
        return this.form.get('trips') as FormArray<ITimetableEditFormTrip>;
    }

    readonly serviceId = input.required<string>();
    readonly calendarId = input.required<string>();
    readonly calendar = input<CalendarDetailsDto | null>(null);
    readonly mode = input.required<ETimetableEditFormMode>();
    readonly tripDirection = input<ETripDirection | null>(null);
    readonly stations = input.required<StationDetailsDto[]>();
    readonly visibleStationIds = input<string[]>([]);
    readonly routes = input<RouteDetailsDto[]>([]);
    readonly selectedRouteIds = input<string[]>([]);
    readonly operations = input.required<OperationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly trips = input<TripDetailsDto[]>([]);
    readonly copySourceCandidates = input<TripBlockDetailsDto[]>([]);
    readonly selectedTripBlockId = input<string | null>(null);
    readonly lastSubmittedAt = input<number | null>(null);
    readonly restoreTrips = input<TripDetailsDto[] | null>(null);

    readonly clickSubmit = output<CreateTripDto[] | ReplaceTripDto[]>();
    readonly toggleIsSaveTripsIndividually = output<MatSlideToggleChange>();
    readonly selectedRouteIdsChange = output<FilterChipValue[]>();
    readonly selectCopySource = output<string>();
    readonly formValueChange = output<unknown[]>();
    readonly restored = output<void>();
    /** G9: 「下書き保存」明示クリック（自動保存に加えてユーザーへの確認手段） */
    readonly saveDraftClick = output<void>();

    readonly offsetMinutes = signal<number>(0);
    readonly currentTripIndex = signal<number>(0);
    /** 列車の数（FormArray の増減を signal にする。form.valueChanges で更新） */
    readonly tripCount = signal<number>(0);

    /** 600px 未満はスマホの配置（1 列車ずつ）。片方の配置だけを描く */
    readonly isCompact = toSignal(
        this.#breakpointObserver
            .observe(Breakpoints.XSmall)
            .pipe(map((state) => state.matches)),
        { initialValue: false },
    );

    readonly shownTripIndexes = computed(() => {
        const count = this.tripCount();
        if (count === 0) return [];
        if (this.isCompact()) {
            return [Math.min(this.currentTripIndex(), count - 1)];
        }
        return Array.from({ length: count }, (_, i) => i);
    });

    readonly visibleStations = computed(() => {
        const visibleIds = new Set(this.visibleStationIds());
        return this.stations().filter((s) => visibleIds.has(s.stationId));
    });

    readonly routeOptions = computed<FilterChipOption[]>(() =>
        this.routes().map((route) => ({
            value: route.routeId,
            label: route.routeName ?? route.routeNickName ?? route.routeId,
            color: route.routeColor ?? undefined,
        })),
    );

    readonly copySourceOptions = computed(() => this.copySourceCandidates());

    readonly isVisibleToggleThatSaveTripsIndividually = computed(() => {
        const mode = this.mode();
        return mode !== ETimetableEditFormMode.UPDATE;
    });

    readonly isCopyMode = computed(
        () => this.mode() === ETimetableEditFormMode.COPY,
    );

    /**
     * G9: 初期値取り込みブロック（既存列車からコピー + 一括オフセット）の表示可否。
     * UPDATE 以外（ADD/COPY）で表示する。
     */
    readonly isInitialValueBlockVisible = computed(
        () => this.mode() !== ETimetableEditFormMode.UPDATE,
    );

    /** 保存ボタンのモード別ラベル */
    readonly submitButtonLabel = computed(() =>
        this.mode() === ETimetableEditFormMode.UPDATE ? '更新する' : '登録する',
    );

    /** G9: 路線チップ折り畳み時のヘッダー要約（全路線は「全路線」と表示） */
    readonly routeFilterSummary = computed(() => {
        const options = this.routeOptions();
        const selected = this.selectedRouteIds();
        if (
            !options.length ||
            selected.length === 0 ||
            selected.length === options.length
        ) {
            return '全路線';
        }
        const selectedSet = new Set<FilterChipValue>(selected);
        return options
            .filter((o) => selectedSet.has(o.value))
            .map((o) => o.label)
            .join('、');
    });

    /** G9: 初期値取り込みブロックのプリフィル説明行に使うコピー元ラベル */
    readonly selectedCopySourceLabel = computed(() => {
        const blockId = this.selectedTripBlockId();
        if (!blockId) return null;

        const block = this.copySourceOptions().find(
            (o) => o.tripBlockId === blockId,
        );
        return block ? this.tripBlockLabel(block) : null;
    });

    constructor() {
        effect(() => {
            // 依存トラッキングのため必ず読む
            this.serviceId();
            this.calendarId();
            this.mode();
            this.tripDirection();
            this.stations();
            this.trips();

            this.#formInitialize();
        });

        effect(() => {
            const submittedAt = this.lastSubmittedAt();
            if (submittedAt === null || submittedAt === undefined) return;

            if (this.mode() !== ETimetableEditFormMode.UPDATE) {
                this.#formInitialize();
            }
        });

        effect(() => {
            const trips = this.restoreTrips();
            if (!trips) return;

            this.#loadTrips(trips);
            this.currentTripIndex.set(0);
            this.restored.emit();
        });

        this.form.valueChanges.subscribe(() => {
            this.tripCount.set(this.tripsForm.length);
            if (!this.form.dirty) return;
            this.formValueChange.emit(this.tripsForm.getRawValue());
        });
    }

    onRouteFilterChange(values: FilterChipValue[]): void {
        this.selectedRouteIdsChange.emit(values);
    }

    tripBlockLabel(block: TripBlockDetailsDto): string {
        return block.trips?.map((t) => t.tripNumber)?.join(' → ') ?? '';
    }

    onCopySourceChange(tripBlockId: string): void {
        this.selectCopySource.emit(tripBlockId);
    }

    onApplyOffset(): void {
        const minutes = this.offsetMinutes();
        if (!minutes) return;

        for (const tripForm of this.tripsForm.controls) {
            const timesForm = tripForm.get(
                'times',
            ) as FormArray<ITimetableEditFormTripTime>;

            for (const timeForm of timesForm.controls) {
                const arrivalTime = timeForm.get('arrivalTime').value;
                const departureTime = timeForm.get('departureTime').value;

                timeForm.patchValue({
                    arrivalTime: offsetTimeString(arrivalTime, minutes),
                    departureTime: offsetTimeString(departureTime, minutes),
                });
            }
        }

        this.form.markAsDirty();
    }

    onPrevTrip(): void {
        this.currentTripIndex.update((i) => Math.max(0, i - 1));
    }

    onNextTrip(): void {
        this.currentTripIndex.update((i) =>
            Math.min(this.tripsForm.controls.length - 1, i + 1),
        );
    }

    /** G9: 「下書き保存」。自動保存（valueChanges 購読）に加え明示トリガーを提供する。 */
    onClickSaveDraft(): void {
        this.formValueChange.emit(this.tripsForm.getRawValue());
        this.saveDraftClick.emit();
    }

    #loadTrips(trips: TripDetailsDto[]): void {
        this.#clearTripsForm();

        for (const trip of trips) {
            this.#add(trip);
        }

        this.#cd.markForCheck();
    }

    #generateTripFormGroup(trip?: TripDetailsDto): ITimetableEditFormTrip {
        const stations = this.stations();

        if (trip) {
            return this.#fb.group({
                tripId: [trip.tripId],
                serviceId: [this.serviceId(), [Validators.required]],
                tripNumber: [trip.tripNumber, []],
                tripClassId: [trip.tripClassId, [Validators.required]],
                tripName: [''],
                tripDirection: [this.tripDirection(), [Validators.required]],
                tripBlockId: [trip.tripBlockId],
                depotIn: [trip.depotIn],
                depotOut: [trip.depotOut],
                calendarId: [this.calendarId(), [Validators.required]],
                extraCalendarId: [null],
                times: this.#fb.array(
                    stations.map((station) =>
                        this.#generateTripTimeFormGroup(
                            station,
                            trip.times?.find(
                                (o) => o.stationId === station.stationId,
                            ),
                        ),
                    ),
                    [
                        TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                        TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                    ],
                ),
                operationId: [
                    this.mode() === ETimetableEditFormMode.UPDATE &&
                    trip.tripOperationLists?.length
                        ? trip.tripOperationLists[0].operationId
                        : '',
                ],
            });
        }

        return this.#fb.group({
            tripId: [null],
            serviceId: [this.serviceId(), [Validators.required]],
            tripNumber: ['', []],
            tripClassId: ['', [Validators.required]],
            tripName: [''],
            tripDirection: [this.tripDirection(), [Validators.required]],
            tripBlockId: [null],
            depotIn: [false],
            depotOut: [false],
            calendarId: [this.calendarId(), [Validators.required]],
            extraCalendarId: [null],
            times: this.#fb.array(
                stations.map((station) =>
                    this.#generateTripTimeFormGroup(station),
                ),
                [
                    TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                    TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                ],
            ),
            operationId: [''],
        });
    }

    #generateTripTimeFormGroup(
        station: StationDetailsDto,
        time?: TimeDetailsDto,
    ): ITimetableEditFormTripTime {
        if (time) {
            return this.#fb.group({
                timeId: [time.timeId],
                tripId: [time.tripId],
                stationId: [station.stationId, [Validators.required]],
                stopId: [time.stopId],
                stopType: [
                    (time.pickupType === 1 && time.dropoffType === 1
                        ? ETimetableEditFormStopType.PASS
                        : ETimetableEditFormStopType.STOP) as ETimetableEditFormStopType,
                ],
                arrivalTime: [
                    time.arrivalTime
                        ? dayjs(time.arrivalTime, 'HH:mm:ss').format('HH:mm')
                        : null,
                ],
                departureTime: [
                    time.departureTime
                        ? dayjs(time.departureTime, 'HH:mm:ss').format('HH:mm')
                        : null,
                ],
            });
        }

        return this.#fb.group({
            timeId: [null],
            tripId: [null],
            stationId: [station.stationId, [Validators.required]],
            stopId: [null],
            stopType: [
                ETimetableEditFormStopType.NOT_GOING_THROUGH as ETimetableEditFormStopType,
            ],
            arrivalTime: [null],
            departureTime: [null],
        });
    }

    #add(trip?: TripDetailsDto): void {
        this.tripsForm.push(this.#generateTripFormGroup(trip));
    }

    #remove(index: number): void {
        this.tripsForm.removeAt(index);

        if (this.currentTripIndex() >= this.tripsForm.controls.length) {
            this.currentTripIndex.set(
                Math.max(0, this.tripsForm.controls.length - 1),
            );
        }
    }

    #clearTripsForm(): void {
        this.tripsForm.clear();
    }

    #formInitialize(): void {
        this.#clearTripsForm();

        // ADD/COPY/UPDATE いずれも、プリフィル対象 trips（COPY のコピー元、
        // UPDATE の編集対象、ADD で「既存列車からコピー」を選んだ場合の
        // コピー元）があれば読み込み、無ければ空の 1 件で初期化する。
        for (const trip of this.trips()) {
            this.#add(trip);
        }
        if (this.tripsForm.controls.length === 0) {
            this.#add();
        }

        this.currentTripIndex.set(0);
        this.#cd.markForCheck();
    }

    onClickAdd(): void {
        this.#add();
        // スマホは 1 列車ずつなので、足した列車へ移る
        this.currentTripIndex.set(this.tripsForm.controls.length - 1);
    }

    onClickRemove(index: number): void {
        this.#remove(index);
    }

    onClickClear(): void {
        this.#formInitialize();
    }

    onClickSubmit(): void {
        const dto = this.tripsForm.value.map((trip) => {
            const times = trip.times.filter(
                (o) =>
                    o.stopType !== ETimetableEditFormStopType.NOT_GOING_THROUGH,
            );

            return plainToClass(
                this.mode() === ETimetableEditFormMode.UPDATE
                    ? ReplaceTripDto
                    : CreateTripDto,
                {
                    ...trip,
                    tripId: trip.tripId ?? undefined,
                    tripNumber: trip.tripNumber || '不明',
                    times: times.map((time, index, arr) => {
                        const arrivalTime =
                            time.arrivalTime && index !== 0
                                ? dayjs(time.arrivalTime, 'HH:mm')
                                : null;
                        const departureTime =
                            time.departureTime && index !== arr.length - 1
                                ? dayjs(time.departureTime, 'HH:mm')
                                : null;

                        return {
                            ...time,
                            timeId: time.timeId ?? undefined,
                            stopSequence: index + 1,
                            pickupType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== arr.length - 1
                                    ? 0
                                    : 1,
                            dropoffType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== 0
                                    ? 0
                                    : 1,
                            arrivalDays:
                                arrivalTime && index !== 0
                                    ? arrivalTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            arrivalTime:
                                arrivalTime && index !== 0
                                    ? arrivalTime.format('HH:mm')
                                    : null,
                            departureDays:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            departureTime:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.format('HH:mm')
                                    : null,
                        };
                    }),
                    tripOperationLists: trip.operationId
                        ? [
                              {
                                  operationId: trip.operationId,
                                  startStationId: times[0]?.stationId ?? null,
                                  endStationId:
                                      times[times.length - 1]?.stationId ??
                                      null,
                              },
                          ]
                        : [],
                },
                classTransformerOptions,
            );
        });

        this.clickSubmit.emit(dto);
    }
}
```

`onClickSubmit` の中身は今と同じ（`tripsForm` の取り方だけ getter にした）。`stopId` は ‖ の駅でも無効にしなくなったが、‖ は保存前に捨てるので DTO は変わらない（Step 1 の特性テストが証拠）。

-   [ ] **Step 6: テンプレートを置き換える**

`timetable-edit-form-trips.component.html` の全体:

```html
<article
    class="tw-flex tw-flex-col tw-gap-4 tw-rounded-card tw-bg-white tw-p-4"
>
    @if (calendar()) {
    <!-- 平日／土休日の色の帯をやめ、操作カードの小見出し（16px 太字）にする。改正日・ダイヤ名・上り／下りは全部残す -->
    <h2 class="tw-m-0 tw-text-base tw-font-bold">
        {{ calendar().startDate | date: 'yyyy年MM月dd日' }}改正 {{
        calendar().calendarName }} {{ tripDirectionLabel.get(tripDirection())
        }}時刻表
    </h2>
    } @if (isInitialValueBlockVisible()) {
    <!-- 初期値の取り込み（既存列車からコピー + 一括オフセット + コピー元の説明）。ADD/COPY で表示 -->
    <section
        class="tw-flex tw-flex-col tw-gap-2 tw-rounded-card tw-bg-paper-2 tw-p-3"
    >
        <p class="tw-m-0 tw-text-xs tw-font-bold tw-text-muted">
            初期値の取り込み
        </p>
        <div
            class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center"
        >
            <button
                type="button"
                mat-stroked-button
                color="primary"
                class="tw-shrink-0"
                [matMenuTriggerFor]="copySourceMenu"
            >
                既存列車からコピー…
            </button>
            <mat-menu #copySourceMenu="matMenu">
                @for (block of copySourceOptions(); track block.tripBlockId) {
                <button
                    type="button"
                    mat-menu-item
                    (click)="onCopySourceChange(block.tripBlockId)"
                >
                    {{ tripBlockLabel(block) }}
                </button>
                }
            </mat-menu>

            <div class="tw-flex tw-items-center tw-gap-1">
                <mat-form-field class="tw-w-32" subscriptSizing="dynamic">
                    <mat-label>一括オフセット（分）</mat-label>
                    <input
                        matInput
                        type="number"
                        [ngModel]="offsetMinutes()"
                        (ngModelChange)="offsetMinutes.set($event)"
                        [ngModelOptions]="{ standalone: true }"
                    />
                </mat-form-field>
                <button
                    type="button"
                    mat-icon-button
                    color="primary"
                    aria-label="一括オフセットを全列車へ適用"
                    (click)="onApplyOffset()"
                >
                    <mat-icon>check</mat-icon>
                </button>
            </div>
        </div>

        @if (selectedCopySourceLabel(); as label) {
        <p class="tw-m-0 tw-text-xs tw-text-muted">
            コピー元: {{ label }} @if (offsetMinutes()) { （時刻を {{
            offsetMinutes() > 0 ? '+' : '' }}{{ offsetMinutes() }}
            分してプリフィル済み） }
        </p>
        }
    </section>
    }

    <!-- 路線チップで入力対象駅を絞り込む（既定は自社の路線・折り畳み） -->
    <app-collapsible-panel
        label="路線で絞り込み"
        [summary]="routeFilterSummary()"
    >
        <app-filter-chips
            mode="multiple"
            [options]="routeOptions()"
            [selected]="selectedRouteIds()"
            (selectedChange)="onRouteFilterChange($event)"
        ></app-filter-chips>
    </app-collapsible-panel>

    @if (isVisibleToggleThatSaveTripsIndividually()) {
    <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-2">
        <mat-slide-toggle (change)="toggleIsSaveTripsIndividually.emit($event)">
            列車個別保存モード
        </mat-slide-toggle>
        <span class="tw-text-sm tw-text-muted"
            >分割・併合・直通のない列車を 1 本ずつ保存する</span
        >
        <button
            type="button"
            mat-icon-button
            aria-label="列車個別保存モードの説明"
            [matTooltip]="saveTripsIndividuallyHelp"
            #saveHelp="matTooltip"
            (click)="saveHelp.toggle()"
        >
            <mat-icon>info_outline</mat-icon>
        </button>
    </div>
    }

    <form
        class="tw-flex tw-flex-col tw-gap-4"
        [formGroup]="form"
        (ngSubmit)="onClickSubmit()"
    >
        @if (isCompact()) {
        <div class="tw-flex tw-items-center tw-justify-between">
            <button
                type="button"
                mat-icon-button
                aria-label="前の列車を表示する"
                [disabled]="currentTripIndex() === 0"
                (click)="onPrevTrip()"
            >
                <mat-icon>chevron_left</mat-icon>
            </button>
            <span>{{ currentTripIndex() + 1 }} / {{ tripCount() }} 列車目</span>
            <button
                type="button"
                mat-icon-button
                aria-label="次の列車を表示する"
                [disabled]="currentTripIndex() >= tripCount() - 1"
                (click)="onNextTrip()"
            >
                <mat-icon>chevron_right</mat-icon>
            </button>
            <button
                type="button"
                mat-button
                color="primary"
                (click)="onClickClear()"
            >
                クリア
            </button>
        </div>
        }

        <app-timetable-edit-form-grid
            [tripsForm]="tripsForm"
            [stations]="stations()"
            [visibleStations]="visibleStations()"
            [tripIndexes]="shownTripIndexes()"
            [compact]="isCompact()"
            [operations]="operations()"
            [tripClasses]="tripClasses()"
            (addTrip)="onClickAdd()"
            (removeTrip)="onClickRemove($event)"
        ></app-timetable-edit-form-grid>

        @if (isCompact()) {
        <!-- スマホ: 下に sticky の操作バー（影は design.md が許す「sticky な操作バー」） -->
        <div
            class="tw-sticky tw-bottom-0 tw-z-30 tw-flex tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-rule tw-bg-white tw-py-3 tw-shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
        >
            <app-button
                variant="secondary"
                type="button"
                (buttonClick)="onClickSaveDraft()"
            >
                下書き保存
            </app-button>
            <app-button
                variant="primary"
                type="submit"
                [disabled]="form.invalid"
            >
                {{ submitButtonLabel() }}
            </app-button>
        </div>
        } @else {
        <div
            class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2"
        >
            <button
                type="button"
                mat-button
                color="primary"
                (click)="onClickClear()"
            >
                クリア
            </button>
            <app-button
                variant="secondary"
                type="button"
                (buttonClick)="onClickSaveDraft()"
            >
                下書き保存
            </app-button>
            <app-button
                class="tw-w-32"
                variant="primary"
                type="submit"
                [disabled]="form.invalid"
            >
                {{ submitButtonLabel() }}
            </app-button>
        </div>
        }
    </form>
</article>
```

-   [ ] **Step 7: テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form`
Expected: PASS（格子・trips・root・utils・validator・store・service すべて）

-   [ ] **Step 8: 型と lint を確かめる**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: エラーなし（出たら、この Task で触ったファイルのものだけ直す）

Run: `npx eslint src/app/pages/timetable/timetable-edit-form`
Expected: エラーなし

-   [ ] **Step 9: 整形してコミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.html
npx prettier --write src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips/timetable-edit-form-trips.component.spec.ts
git add src/app/pages/timetable/timetable-edit-form/components/timetable-edit-form-trips
git commit -m "feat: :sparkles: 列車情報の入力を時刻の格子に置き換え、片方の配置だけを描く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

---

### Task 5: 取得 5 本を同時に投げる

**Files:**

-   Modify: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.ts:14`（import）、`:130-156`（`fetchData`）
-   Test: `src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts`

**Interfaces:**

-   Consumes: `TimetableEditFormService` の `fetchStations/fetchRoutes/fetchOperations/fetchTripClasses/fetchCalendar/fetchTargetTripBlock/fetchCopySourceCandidates`（どれも 1 回 emit して完了する `Observable<void>`）
-   Produces: なし

-   [ ] **Step 1: 失敗するテストを書く**

spec の import を次に変える:

```ts
import { EMPTY, firstValueFrom, Observable, of, throwError } from 'rxjs';
```

`describe('TimetableEditFormComponent', …)` の中、`it('G9 defect 2: …')` の後に足す:

```ts
it('駅・路線・運用・種別・ダイヤの取得を同時に購読する（順番待ちしない）', () => {
    const subscribed: string[] = [];
    const names = [
        'fetchStations',
        'fetchRoutes',
        'fetchOperations',
        'fetchTripClasses',
        'fetchCalendar',
    ];
    for (const name of names) {
        timetableEditFormService[name].mockImplementation(
            () =>
                new Observable<void>(() => {
                    subscribed.push(name);
                }),
        );
    }

    TestBed.createComponent(TimetableEditFormComponent);

    expect(subscribed).toEqual(names);
});

it('取得に失敗しても読み込み中を解く', async () => {
    TimetableEditFormStore.resetLoading();
    timetableEditFormService.fetchStations.mockReturnValue(
        throwError(() => new Error('network')),
    );

    await expect(component.fetchData()).rejects.toThrow('network');
    expect(await firstValueFrom(TimetableEditFormStore.isLoading$)).toBe(false);
});
```

-   [ ] **Step 2: テストが落ちることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts`
Expected: FAIL（1 本目は `['fetchStations']` だけ、2 本目は `isLoading$` が `true`）

-   [ ] **Step 3: 実装する**

import（14 行目）:

```ts
import { forkJoin, lastValueFrom, Observable } from 'rxjs';
```

`fetchData` を置き換える:

```ts
    async fetchData(): Promise<void> {
        TimetableEditFormStore.enableLoading();

        try {
            // 5 本は互いに依存しないので同時に投げる
            await lastValueFrom(
                forkJoin([
                    this.#timetableEditFormService.fetchStations(),
                    this.#timetableEditFormService.fetchRoutes(),
                    this.#timetableEditFormService.fetchOperations(),
                    this.#timetableEditFormService.fetchTripClasses(),
                    this.#timetableEditFormService.fetchCalendar(),
                ]),
            );

            if (this.mode() === ETimetableEditFormMode.UPDATE) {
                await lastValueFrom(
                    this.#timetableEditFormService.fetchTargetTripBlock(),
                );
            } else {
                // G9: ADD/COPY 両モードで「既存列車からコピー」を提供するため、
                // コピー元候補（同一ダイヤ・同一方向の trip-block 一覧）を取得する。
                await lastValueFrom(
                    this.#timetableEditFormService.fetchCopySourceCandidates(),
                );
            }
        } finally {
            TimetableEditFormStore.disableLoading();
        }

        this.#proposeDraftRestoreIfAny();
    }
```

-   [ ] **Step 4: テストが通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/timetable/timetable-edit-form`
Expected: PASS

-   [ ] **Step 5: 整形してコミット**

```bash
npx prettier --write src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.ts
npx prettier --write src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts
git add src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.ts src/app/pages/timetable/timetable-edit-form/timetable-edit-form.component.spec.ts
git commit -m "perf: :zap: 列車情報の入力で駅・路線・運用・種別・ダイヤを同時に取得する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

---

### Task 6: design.md の例外と実データの目視

**Files:**

-   Modify: `docs/design.md`（`### 色の検証（実測・全項目 PASS）` の直前に節を足す）

**Interfaces:**

-   Consumes: Task 1〜5 の成果（ローカルの画面）
-   Produces: なし（ロック節は、ユーザーが完成を認めて「ロック」と言ってから別に書く）

-   [ ] **Step 1: design.md に例外の節を足す**

`docs/design.md` の `### 色の検証（実測・全項目 PASS）` の直前（「影を残してよいのは…」の箇条の後）に挿入する:

```markdown
### 入力の格子（Material 部品の例外）

**UI は Material 部品を包んで使うのが原則だが、列車情報の入力（`timetable/add|copy|update`）の
時刻の格子だけは素の `<button>` と `<input>` で組む**（ユーザー判断 2026-09-30）。

-   理由は 2 つ。打ち込みの速さ（数字 4 桁 → `HH:mm`、Enter・矢印で表計算のように動く）と、
    重さ（`mat-form-field` 1 個 21 要素・ラジオ込みで 1 駅 65 要素。本番の全駅表示では 1 万要素を超えた）
-   例外は時刻の格子のセル（停車種別・着・発）だけ。上の段の列車番号・運用番号・種別・入出庫は Material のまま
-   見た目は掟に合わせる: 時刻のセルの地は白（操作部品の地）、見出しの列と行は `paper-2`、
    経由なし・始発の着・終着の発は `paper-3`、誤りは `red-50` の地に `red-800` の字。
    フォーカスは `--color-focus` の 2px 枠を内側に
-   罫線は `border-separate` ＋各セルの右・下。列車の境目は `rule-strong`
-   ほかの画面で同じ理由の格子が欲しくなったら、先にここへ足してから組む（例外を黙って増やさない）
```

-   [ ] **Step 2: 開発サーバーで実データを出す**

ローカルの client（:4200）と api（:3000）が動いていることを確かめる（動いていなければユーザーに起動を頼む）。Playwright で:

1. 全線時刻表（平日ダイヤ・上り）から 3030 の編集に入る（`timetable/update;calendar_id=…;trip_direction=…;trip_block_id=…`）
2. 1440px と 390px でスクリーンショットを撮り `.context/edit-form-grid-1440.png` / `.context/edit-form-grid-390.png` に置く
3. 見本 `.context/sample-grid-1440.png` / `.context/sample-grid-390.png` と並べて比べる

確かめること（ずれたら直してから次へ）:

-   始発の着・終着の発・‖ の着発が灰色で打てない。駅名が潰れていない。太い罫線が列車の境目に出る
-   「駅｜列番｜着｜発」の行と駅名の列が、縦横スクロールでくっついてくる（PC は箱の中、スマホはトップバーの下）
-   スマホは 1 列車ずつ、行先の段がある、下の操作バーが sticky
-   同じ行の中心の Y 座標（駅名・停レ‖・着・発）がそろっている（`getBoundingClientRect` で実測）
-   数字 4 桁・3 桁の打ち込み、Enter・矢印の移動、わざと早い時刻を打って赤と一言が出て保存が押せない
-   下書き保存を押して「下書きを保存しました」が出る。**「更新する／登録する」は押さない**
-   add（空の 1 列車）と copy でも同じく出る

-   [ ] **Step 3: 軽さを測って記録する**

Playwright の `browser_evaluate` で `document.querySelectorAll('*').length` を測る:

-   update 3030（1 列車）と、add で 3 列車に増やした状態（自社路線 28 駅）
-   目標: 3 列車で 3,046 未満（spec「軽量化」）

ネットワークの記録（`browser_network_requests`）で、駅・路線・運用・種別・ダイヤの 5 本が同時に出ていることを確かめる。数値は `.context/edit-form-measure.md` に書く（git 管理外）。

-   [ ] **Step 4: design.md を整形してコミット**

```bash
npx prettier --write docs/design.md
git add docs/design.md
git commit -m "docs: :memo: 列車情報の入力の時刻の格子を Material 部品の例外として書く" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH"
git log -1 "--format=%G?"
```

`npx prettier --write docs/design.md` が関係ない行まで変えたら、その変更は戻さずユーザーに報告する（git restore は使わない）。

-   [ ] **Step 5: ユーザーに実際の保存の確認を頼む**

ローカルは本番 DB に書くので、update・add の「保存する」はユーザーに押してもらい、結果（保存後の全線時刻表で時刻が合っているか）を確かめてもらう。
