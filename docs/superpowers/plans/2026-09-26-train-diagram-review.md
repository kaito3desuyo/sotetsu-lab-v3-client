# 列車ダイヤグラム見直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 列車ダイヤグラム（`/train-diagram`）を、1 日ぶんの横スクロール・見えている範囲だけ描く SVG・畳まない 2 行の表示設定・項目を絞った列車データに作り直す。

**Architecture:** 列車の線は「4 時からの分 × 駅の縦位置」で一度だけ計算してルートコンポーネントで持つ。図（chart）は線・駅の行・縮尺を受け取り、スクロール位置から見えている範囲の前後 30 分にかかる線だけを SVG に描く表示専用の部品にする。縮尺（横・縦）はストアに置き、URL には図の左端の時刻 `time=HHmm` を `replaceUrl` で書く。

**Tech Stack:** Angular 20（signals・OnPush・standalone）、@ngneat/elf、Angular Material M2、Tailwind（`tw-` 接頭辞・preflight 無効）、Jest。

**Spec:** `docs/superpowers/specs/2026-09-26-train-diagram-design.md`

## Global Constraints

-   ブランチ `feature/redesign-2026-07`（client リポジトリ `sotetsu-lab-v3-client`）。push・merge はしない
-   コミットは Conventional Commits + 絵文字テキスト（例 `feat: :sparkles: …`）。本文の末尾に次の 2 行:
    `Co-Authored-By: <実際に書いたモデル名> <noreply@anthropic.com>` と `Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH`
-   署名コミットは sandbox の外（Bash の `dangerouslyDisableSandbox: true`）。コミット後に `git log -1 --format='%h %G? %s'` で `G` を確かめる
-   `.serena/project.yml` と `docs/superpowers/plans/2026-07-03-redesign-implementation.md` はコミットに含めない（`git add` はファイルを名指しする）
-   Tailwind は `tw-` 接頭辞。枠線は `tw-border tw-border-solid …` と必ず `tw-border-solid` を併記。任意プロパティは接頭辞なし（`[writing-mode:…]`）。`[ngClass]`/`[ngStyle]` ではなく `[class]`/`[style]`
-   時刻の数字は本文書体 + `tw-tabular-nums`（等幅書体は使わない）
-   運用番号は運用群の色（`operationNumberColor` パイプ・`src/app/core/pipes/pipes.module.ts` の `PipesModule`）、「運用」の字は付けない、`/operation/route-diagram;operation_id=…` へのリンク
-   読み込み中の表示はプログレスバーだけ（accent・`tw-fixed tw-left-0 tw-top-[48px] md:tw-top-[64px] tw-z-30 tw-w-full`）。スピナーは使わない
-   prettier はファイル単位で（`npx prettier --write <file>`）。ディレクトリ単位で流さない。既存ファイルが丸ごと整形されたら、自分の変更以外を元に戻す
-   テストは `npx jest --testPathPattern=<path> > $TMPDIR/jest.txt 2>&1` で走らせ、`Tests:` の行をファイルから読む（`npm test` は sandbox で落ちる）
-   Bash でパイプ連結しない（1 コマンド 1 目的）
-   `git stash` / `git reset` / `git restore` を自分で作っていないファイルに使わない
-   型の確認: `npx tsc -p tsconfig.app.json --noEmit > $TMPDIR/tsc.txt 2>&1`（Task 6 の途中を除き、各 Task の終わりで 0 件）
-   `libs/trip-block` にある既存の lint エラー 3 件（prefer-inject）は触らない
-   サブエージェントはさらにサブエージェントを呼ばない

## File Structure

| ファイル                                                                             | 役割                                                       | Task |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ---- |
| `src/app/libs/trip-block/usecase/trip-block-fields.ts`                               | `TRIP_BLOCK_TIMELINE_FIELDS` を足す                        | 1    |
| `src/app/shared/attach-trip-classes.util.ts`（+spec）                                | `pages/train-location/utils/` から移す                     | 1    |
| `src/app/pages/train-location/services/train-location.service.ts`                    | 共通の定数・関数を使う                                     | 1    |
| `src/app/pages/train-diagram/services/train-diagram.service.ts`（+spec）             | fields で取り、種別を補う                                  | 2    |
| `src/app/pages/train-diagram/utils/diagram-timeline.util.ts`（+spec）                | 横軸（4:00〜26:00）・縮尺の段・URL の `time`               | 3    |
| `src/app/pages/train-diagram/utils/generate-diagram-window-options.util.ts`（+spec） | 削除（Task 7 で）                                          | 7    |
| `src/app/pages/train-diagram/utils/build-trip-diagram-line.util.ts`（+spec）         | 線を分で持つ・停車の分の字・直通先ラベルは駅名表から       | 4    |
| `src/app/pages/train-diagram/utils/select-visible-lines.util.ts`（+spec）            | 見えている範囲の前後 30 分の線だけ残す                     | 5    |
| `src/app/pages/train-diagram/utils/build-legend-entries.util.ts`（+spec）            | 描く列車の色だけの凡例                                     | 5    |
| `src/app/pages/train-diagram/components/train-diagram-legend/*`                      | 入力を凡例の項目に変える                                   | 5    |
| `src/app/pages/train-diagram/stores/train-diagram.store.ts`（+spec）                 | 縮尺（横・縦）を持つ。`windowStartHour`/`zoomLevel` を消す | 6・7 |
| `src/app/pages/train-diagram/components/train-diagram-chart/*`                       | 作り直し（固定の行と列・見えている範囲だけ描く）           | 6    |
| `src/app/pages/train-diagram/train-diagram.component.*`（+spec）                     | 線の計算・URL・読み込み                                    | 6・7 |
| `src/app/pages/train-diagram/components/train-diagram-controller/*`                  | 畳まない 2 行に作り直し                                    | 7    |
| `src/app/pages/train-diagram/components/train-diagram-info-panel/*`                  | PC 右下のカード・並びを列車位置情報に合わせる              | 8    |

---

### Task 1: 列車データの項目の組と `attachTripClasses` を共通にする

**Files:**

-   Modify: `src/app/libs/trip-block/usecase/trip-block-fields.ts`
-   Move: `src/app/pages/train-location/utils/attach-trip-classes.util.ts` → `src/app/shared/attach-trip-classes.util.ts`
-   Move: `src/app/pages/train-location/utils/attach-trip-classes.util.spec.ts` → `src/app/shared/attach-trip-classes.util.spec.ts`
-   Modify: `src/app/pages/train-location/services/train-location.service.ts`

**Interfaces:**

-   Produces: `TRIP_BLOCK_TIMELINE_FIELDS: TripBlockFields`（`libs/trip-block/usecase/trip-block-fields.ts`）、`attachTripClasses(tripBlocksByDirection, tripClasses)`（`src/app/shared/attach-trip-classes.util.ts`、中身は変えない）

-   [ ] **Step 1: ファイルを移す**

```bash
git mv src/app/pages/train-location/utils/attach-trip-classes.util.ts src/app/shared/attach-trip-classes.util.ts
git mv src/app/pages/train-location/utils/attach-trip-classes.util.spec.ts src/app/shared/attach-trip-classes.util.spec.ts
```

spec の import `./attach-trip-classes.util` は同じディレクトリなのでそのまま。

-   [ ] **Step 2: 項目の組を共通の場所に足す**

`src/app/libs/trip-block/usecase/trip-block-fields.ts` の末尾に追記する:

```ts
/**
 * 時刻表の線を引くページ（列車位置情報・列車ダイヤグラム）が使う項目の組。
 * 両ページで同じ組を使うと、取得結果のキャッシュ（fields ごと）を共有できる。
 * 種別の中身は取らず、呼び出し側で `attachTripClasses`（shared）を通して補う。
 */
export const TRIP_BLOCK_TIMELINE_FIELDS: TripBlockFields = {
    trip: [
        'tripNumber',
        'tripDirection',
        'tripBlockId',
        'tripClassId',
        'depotIn',
        'depotOut',
    ],
    time: [
        'stationId',
        'stopSequence',
        'arrivalDays',
        'arrivalTime',
        'departureDays',
        'departureTime',
    ],
    tripOperationList: ['operationId'],
    operation: ['operationNumber'],
};
```

-   [ ] **Step 3: 列車位置情報のサービスを差し替える**

`src/app/pages/train-location/services/train-location.service.ts`:

-   `export const TRAIN_LOCATION_TRIP_BLOCK_FIELDS: TripBlockFields = { … };` の定義（17 行目付近から `};` まで）を消す
-   `fields: TRAIN_LOCATION_TRIP_BLOCK_FIELDS` を `fields: TRIP_BLOCK_TIMELINE_FIELDS` に変える
-   import を `import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';` と `import { attachTripClasses } from 'src/app/shared/attach-trip-classes.util';` に変える（`TripBlockFields` の import が不要になれば消す）

`TRAIN_LOCATION_TRIP_BLOCK_FIELDS` を参照している spec があれば同じ置き換えをする:

```bash
grep -rn "TRAIN_LOCATION_TRIP_BLOCK_FIELDS\|utils/attach-trip-classes" src/app
```

Expected: 0 件になるまで直す。

-   [ ] **Step 4: テストと型**

```bash
npx jest --testPathPattern='src/app/shared/attach-trip-classes|src/app/pages/train-location' > $TMPDIR/jest.txt 2>&1
npx tsc -p tsconfig.app.json --noEmit > $TMPDIR/tsc.txt 2>&1
```

Expected: `Tests:` の行に failed なし。tsc の出力が空。

-   [ ] **Step 5: コミット**

```bash
git add src/app/libs/trip-block/usecase/trip-block-fields.ts src/app/shared/attach-trip-classes.util.ts src/app/shared/attach-trip-classes.util.spec.ts src/app/pages/train-location/utils/attach-trip-classes.util.ts src/app/pages/train-location/utils/attach-trip-classes.util.spec.ts src/app/pages/train-location/services/train-location.service.ts
git commit -m "refactor: :recycle: 列車データの項目の組と種別の補完を共通にする"
```

（本文の末尾に Global Constraints のトレーラー 2 行を付ける）

---

### Task 2: ダイヤグラムの列車データを項目を絞って取る

**Files:**

-   Modify: `src/app/pages/train-diagram/services/train-diagram.service.ts`
-   Test: `src/app/pages/train-diagram/services/train-diagram.service.spec.ts`

**Interfaces:**

-   Consumes: `TRIP_BLOCK_TIMELINE_FIELDS`、`attachTripClasses`（Task 1）、`TrainDiagramStore.tripClasses`（このタスクで getter を足す）

-   [ ] **Step 1: 失敗するテストに直す**

`train-diagram.service.spec.ts` の `'fetchTripBlocks: calendarId 指定時は取得してストアへ設定する'` を次に置き換える（`tripBlockServiceMock.findManyByCalendarId` が返す trip に `tripClassId: 'tc-1'` があり、`tripClass` が無い前提。モックの返り値がそうでなければ、このテストの中で `mockReturnValueOnce` で上書きする）:

```ts
it('fetchTripBlocks: 項目を絞って取り、種別の一覧から種別を補ってストアへ設定する', (done) => {
    TrainDiagramStore.setCalendarId('cal-1');
    TrainDiagramStore.setTripClasses([
        {
            tripClassId: 'tc-1',
            tripClassName: '快速',
            tripClassColor: '#3f51b5',
        } as any,
    ]);
    tripBlockServiceMock.findManyByCalendarId.mockReturnValueOnce(
        of({
            0: [
                {
                    tripBlockId: 'b1',
                    trips: [{ tripId: 't1', tripClassId: 'tc-1' }],
                },
            ],
            1: [],
        }),
    );

    service.fetchTripBlocks().subscribe(() => {
        expect(tripBlockServiceMock.findManyByCalendarId).toHaveBeenCalledWith({
            calendarId: 'cal-1',
            fields: TRIP_BLOCK_TIMELINE_FIELDS,
        });
        expect(
            TrainDiagramStore.tripBlocksByDirection[0][0].trips?.[0].tripClass
                ?.tripClassName,
        ).toBe('快速');
        done();
    });
});
```

import に `TRIP_BLOCK_TIMELINE_FIELDS`（`src/app/libs/trip-block/usecase/trip-block-fields`）と、無ければ `of`（rxjs）を足す。`findManyByCalendarId` が `jest.fn()` でなければ `jest.fn(() => of(…))` に直す。

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram/services/train-diagram.service.spec.ts > $TMPDIR/jest.txt 2>&1
```

Expected: 上のテストが FAIL（fields が渡っていない）。

-   [ ] **Step 3: 実装**

`stores/train-diagram.store.ts` の getter 群に足す:

```ts
    get tripClasses(): TripClassDetailsDto[] {
        return store.getValue().tripClasses;
    },
```

`train-diagram.service.ts` の `fetchTripBlocks` を:

```ts
return this.#tripBlockService
    .findManyByCalendarId({
        calendarId,
        fields: TRIP_BLOCK_TIMELINE_FIELDS,
    })
    .pipe(
        tap((data) => {
            TrainDiagramStore.setTripBlocksByDirection(
                attachTripClasses(data, TrainDiagramStore.tripClasses),
            );
        }),
        map(() => undefined),
    );
```

import を足す。種別一覧は既に `fetchData` で先に取っている（`train-diagram.component.ts` の `fetchTripClasses` が先）。

-   [ ] **Step 4: テストが通ることを確かめる**

同じコマンドで `Tests:` に failed なし。tsc も 0 件。

-   [ ] **Step 5: コミット**

```bash
git add src/app/pages/train-diagram/services/train-diagram.service.ts src/app/pages/train-diagram/services/train-diagram.service.spec.ts src/app/pages/train-diagram/stores/train-diagram.store.ts
git commit -m "perf: :zap: ダイヤグラムの列車データを項目を絞って取る"
```

---

### Task 3: 横軸（4:00〜26:00）と URL の `time` の純関数

**Files:**

-   Create: `src/app/pages/train-diagram/utils/diagram-timeline.util.ts`
-   Test: `src/app/pages/train-diagram/utils/diagram-timeline.util.spec.ts`

**Interfaces:**

-   Produces（以降の Task が使う名前）:

    -   `DIAGRAM_START_HOUR = 4`、`DIAGRAM_END_HOUR = 26`、`DIAGRAM_TOTAL_MINUTES = 1320`
    -   `DIAGRAM_JUMP_HOURS: readonly number[]`（4〜25）
    -   `DIAGRAM_ZOOM_STEPS = [4, 6, 10, 16, 24, 40] as const`、`DEFAULT_PX_PER_MINUTE = 10`
    -   `PX_PER_MINUTE_MIN = 4`、`PX_PER_MINUTE_MAX = 40`、`AXIS_PX_PER_MINUTE_MIN = 2`、`AXIS_PX_PER_MINUTE_MAX = 24`、`DEFAULT_AXIS_PX_PER_MINUTE = 6`
    -   `VISIBLE_MARGIN_MINUTES = 30`
    -   `nextZoomStep(current: number, direction: 1 | -1): number`
    -   `railwayMinuteOfDay(now: Date): number`（4:00 からの分。0:00〜3:59 は前の営業日の 24〜27 時として数える）
    -   `defaultStartMinute(now: Date): number`
    -   `parseTimeParam(value: string | null): number | undefined`
    -   `formatTimeParam(minute: number): string`
    -   `parseLegacyWindowParam(value: string | null): number | undefined`
    -   `formatHourLabel(minute: number): string`
    -   `clamp(value: number, min: number, max: number): number`

-   [ ] **Step 1: 失敗するテストを書く**

```ts
import {
    DIAGRAM_JUMP_HOURS,
    DIAGRAM_TOTAL_MINUTES,
    defaultStartMinute,
    formatHourLabel,
    formatTimeParam,
    nextZoomStep,
    parseLegacyWindowParam,
    parseTimeParam,
    railwayMinuteOfDay,
} from './diagram-timeline.util';

describe('diagram-timeline.util', () => {
    it('横軸は 4:00〜26:00 の 1320 分。跳び先は 4〜25 時', () => {
        expect(DIAGRAM_TOTAL_MINUTES).toBe(1320);
        expect(DIAGRAM_JUMP_HOURS[0]).toBe(4);
        expect(DIAGRAM_JUMP_HOURS[DIAGRAM_JUMP_HOURS.length - 1]).toBe(25);
    });

    it('railwayMinuteOfDay: 4 時からの分。0〜3 時は 24〜27 時として数える', () => {
        expect(railwayMinuteOfDay(new Date(2026, 8, 26, 4, 0))).toBe(0);
        expect(railwayMinuteOfDay(new Date(2026, 8, 26, 18, 30))).toBe(870);
        expect(railwayMinuteOfDay(new Date(2026, 8, 27, 1, 15))).toBe(1275);
    });

    it('defaultStartMinute: 今の 30 分前。0〜1260 分（4:00〜25:00）に収める', () => {
        expect(defaultStartMinute(new Date(2026, 8, 26, 18, 30))).toBe(840);
        expect(defaultStartMinute(new Date(2026, 8, 26, 4, 10))).toBe(0);
        expect(defaultStartMinute(new Date(2026, 8, 27, 1, 50))).toBe(1260);
    });

    it('parseTimeParam: HHmm を 4 時からの分に。範囲外・不正は undefined', () => {
        expect(parseTimeParam('1830')).toBe(870);
        expect(parseTimeParam('0400')).toBe(0);
        expect(parseTimeParam('2545')).toBe(1305);
        expect(parseTimeParam('0359')).toBeUndefined();
        expect(parseTimeParam('2601')).toBeUndefined();
        expect(parseTimeParam('1860')).toBeUndefined();
        expect(parseTimeParam('18:30')).toBeUndefined();
        expect(parseTimeParam(null)).toBeUndefined();
    });

    it('formatTimeParam: 4 時からの分を HHmm に（24 時超えはそのまま）', () => {
        expect(formatTimeParam(870)).toBe('1830');
        expect(formatTimeParam(0)).toBe('0400');
        expect(formatTimeParam(1305)).toBe('2545');
        expect(formatTimeParam(870.7)).toBe('1830');
    });

    it('parseLegacyWindowParam: 古い window=HH00-HH00 の開始時を分に', () => {
        expect(parseLegacyWindowParam('1800-1900')).toBe(840);
        expect(parseLegacyWindowParam('2500-2600')).toBe(1260);
        expect(parseLegacyWindowParam('0300-0400')).toBeUndefined();
        expect(parseLegacyWindowParam('abc')).toBeUndefined();
        expect(parseLegacyWindowParam(null)).toBeUndefined();
    });

    it('formatHourLabel: 分を「18:00」の形に', () => {
        expect(formatHourLabel(840)).toBe('18:00');
        expect(formatHourLabel(1290)).toBe('25:30');
    });

    it('nextZoomStep: 段を 1 つ移る。端では止まる。段の間の値からは近い側の段へ', () => {
        expect(nextZoomStep(10, 1)).toBe(16);
        expect(nextZoomStep(10, -1)).toBe(6);
        expect(nextZoomStep(40, 1)).toBe(40);
        expect(nextZoomStep(4, -1)).toBe(4);
        expect(nextZoomStep(12, 1)).toBe(16);
        expect(nextZoomStep(12, -1)).toBe(10);
    });
});
```

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram/utils/diagram-timeline.util.spec.ts > $TMPDIR/jest.txt 2>&1
```

Expected: FAIL（モジュールが無い）。

-   [ ] **Step 3: 実装**

```ts
/**
 * 列車ダイヤグラムの横軸（1 日ぶん 4:00〜26:00）と縮尺・URL の `time` を扱う純関数群。
 * 横位置の単位は「営業日の 4 時からの分」。24 時超え（翌 0〜2 時）は 1200〜1320 分になる。
 */
export const DIAGRAM_START_HOUR = 4;
export const DIAGRAM_END_HOUR = 26;
export const DIAGRAM_TOTAL_MINUTES =
    (DIAGRAM_END_HOUR - DIAGRAM_START_HOUR) * 60;

/** 「時刻へ跳ぶ」の選択肢（4〜25 時） */
export const DIAGRAM_JUMP_HOURS: readonly number[] = Array.from(
    { length: DIAGRAM_END_HOUR - DIAGRAM_START_HOUR },
    (_, i) => DIAGRAM_START_HOUR + i,
);

/** 横の縮尺（px/分）の段。− / ＋ ボタンはこの段を移る */
export const DIAGRAM_ZOOM_STEPS = [4, 6, 10, 16, 24, 40] as const;
export const DEFAULT_PX_PER_MINUTE = 10;
export const PX_PER_MINUTE_MIN = 4;
export const PX_PER_MINUTE_MAX = 40;

/** 縦（駅軸）の縮尺（px/分）。Ctrl+ホイール・ピンチで連続に変える */
export const DEFAULT_AXIS_PX_PER_MINUTE = 6;
export const AXIS_PX_PER_MINUTE_MIN = 2;
export const AXIS_PX_PER_MINUTE_MAX = 24;

/** 見えている範囲の前後に余分に描く分 */
export const VISIBLE_MARGIN_MINUTES = 30;

const LAST_START_MINUTE = (DIAGRAM_END_HOUR - 1 - DIAGRAM_START_HOUR) * 60;

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

export function nextZoomStep(current: number, direction: 1 | -1): number {
    if (direction === 1) {
        return (
            DIAGRAM_ZOOM_STEPS.find((step) => step > current) ??
            DIAGRAM_ZOOM_STEPS[DIAGRAM_ZOOM_STEPS.length - 1]
        );
    }
    return (
        [...DIAGRAM_ZOOM_STEPS].reverse().find((step) => step < current) ??
        DIAGRAM_ZOOM_STEPS[0]
    );
}

export function railwayMinuteOfDay(now: Date): number {
    const hour = now.getHours();
    const railwayHour = hour < DIAGRAM_START_HOUR ? hour + 24 : hour;
    return (railwayHour - DIAGRAM_START_HOUR) * 60 + now.getMinutes();
}

export function defaultStartMinute(now: Date): number {
    return clamp(railwayMinuteOfDay(now) - 30, 0, LAST_START_MINUTE);
}

export function parseTimeParam(value: string | null): number | undefined {
    const match = value ? /^(\d{2})(\d{2})$/.exec(value) : null;
    if (!match) {
        return undefined;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (minute > 59) {
        return undefined;
    }
    const result = (hour - DIAGRAM_START_HOUR) * 60 + minute;
    return result >= 0 && result <= DIAGRAM_TOTAL_MINUTES ? result : undefined;
}

export function formatTimeParam(minute: number): string {
    const total = Math.floor(minute) + DIAGRAM_START_HOUR * 60;
    return `${pad2(Math.floor(total / 60))}${pad2(total % 60)}`;
}

export function parseLegacyWindowParam(
    value: string | null,
): number | undefined {
    const match = value ? /^(\d{2})00-\d{2}00$/.exec(value) : null;
    if (!match) {
        return undefined;
    }
    const minute = (Number(match[1]) - DIAGRAM_START_HOUR) * 60;
    return minute >= 0 && minute <= LAST_START_MINUTE ? minute : undefined;
}

export function formatHourLabel(minute: number): string {
    const total = Math.floor(minute) + DIAGRAM_START_HOUR * 60;
    return `${Math.floor(total / 60)}:${pad2(total % 60)}`;
}
```

-   [ ] **Step 4: テストが通ることを確かめる**

Expected: `Tests:` 8 passed。

-   [ ] **Step 5: コミット**

```bash
git add src/app/pages/train-diagram/utils/diagram-timeline.util.ts src/app/pages/train-diagram/utils/diagram-timeline.util.spec.ts
git commit -m "feat: :sparkles: ダイヤグラムの 1 日ぶんの横軸と time の読み書きを足す"
```

---

### Task 4: 列車の線を「4 時からの分」で持つ

**Files:**

-   Modify: `src/app/pages/train-diagram/utils/build-trip-diagram-line.util.ts`
-   Test: `src/app/pages/train-diagram/utils/build-trip-diagram-line.util.spec.ts`

**Interfaces:**

-   Consumes: `DIAGRAM_START_HOUR`（Task 3）
-   Produces:

```ts
export type TripDiagramPoint = { minute: number; y: number };
export type TripDiagramThroughLabel = {
    minute: number;
    y: number;
    text: string;
    anchor: 'start' | 'end';
};
export type TripDiagramStopLabel = { minute: number; y: number; text: string };
export type TripDiagramLine = {
    tripId: string;
    tripNumber: string;
    tripClassColor: string;
    isDeadhead: boolean;
    segments: TripDiagramPoint[][];
    throughLabels: TripDiagramThroughLabel[];
    /** 図に載っている各停車駅の発車の分（発車が無ければ到着）。選んだ列車だけに描く */
    stopLabels: TripDiagramStopLabel[];
    minMinute: number;
    maxMinute: number;
};
export function buildTripDiagramLine(params: {
    trip: TripDetailsDto;
    /** 縦の縮尺・最小行高・上の余白を適用済みの駅軸（y はそのまま SVG の y） */
    axis: StationAxis;
    axisStationIds: ReadonlySet<string>;
    routeIdsByStation: RouteIdsByStation;
    /** 営業日の 0 時 */
    base: Date;
    /** 全路線の stationId → 駅名（直通先ラベル用） */
    stationNameById: ReadonlyMap<string, string>;
}): TripDiagramLine | undefined;
```

`windowStart`・`pxPerMinute`・`axisPxPerMinute`・`headerHeight` の引数は無くす。

-   [ ] **Step 1: テストを分の単位に直す（失敗させる）**

`build-trip-diagram-line.util.spec.ts` を次のとおり直す:

-   `commonParams` を `{ axis, axisStationIds, routeIdsByStation: new Map(), base, stationNameById: new Map([['yokohama', '横浜'], ['hoshikawa', '星川'], ['futamatagawa', '二俣川'], ['shibuya', '渋谷'], ['ebina', '海老名']]) }` にする。`windowStart` の定数は消す
-   `axis` の y は「適用済みの値」なので、期待値の y は `axis` の値そのもの（以前の `32 + y * 6` の計算をやめる）
-   期待値の x は `minute`（4 時からの分）。例: 07:00 は `180`、07:10 は `190`、07:25 は `205`
-   `time()` ヘルパーの `stationName` 引数と `station` の組み立ては消す（駅名は `stationNameById` から引く）
-   既存の分岐・分断・複製のテストは、座標の単位だけを上の規則で直し、判定の中身はそのまま残す

足すテスト:

```ts
it('最小・最大の分を持つ', () => {
    const line = buildTripDiagramLine({ ...commonParams, trip: basicTrip });
    expect(line?.minMinute).toBe(180);
    expect(line?.maxMinute).toBe(205);
});

it('停車の分の字: 発車の分（無ければ到着の分）を 2 桁で、停車ごとに 1 つ', () => {
    const line = buildTripDiagramLine({ ...commonParams, trip: basicTrip });
    expect(line?.stopLabels).toEqual([
        { minute: 180, y: 0, text: '00' },
        { minute: 190, y: 10, text: '10' },
        { minute: 205, y: 25, text: '25' },
    ]);
});

it('直通先ラベル: 軸の外の始発・終着の駅名を駅名表から引く', () => {
    const trip = {
        tripId: 't-through',
        tripNumber: '1234',
        tripClassId: 'tc1',
        tripClass: { tripClassColor: '#3f51b5' } as any,
        times: [
            time({
                stationId: 'shibuya',
                stopSequence: 1,
                departureTime: '06:40:00',
            }),
            time({
                stationId: 'yokohama',
                stopSequence: 2,
                arrivalTime: '07:00:00',
                departureTime: '07:00:00',
            }),
            time({
                stationId: 'futamatagawa',
                stopSequence: 3,
                arrivalTime: '07:25:00',
                departureTime: '07:25:00',
            }),
            time({
                stationId: 'ebina',
                stopSequence: 4,
                arrivalTime: '07:45:00',
            }),
        ],
    } as TripDetailsDto;
    const line = buildTripDiagramLine({ ...commonParams, trip });
    expect(line?.throughLabels).toEqual([
        { minute: 180, y: 0, text: '渋谷 →', anchor: 'end' },
        { minute: 205, y: 25, text: '→ 海老名', anchor: 'start' },
    ]);
});
```

`basicTrip` は既存の最初のテスト（`'停車駅を stopSequence 順に点へ変換する'`）の trip（横浜 07:00 発・星川 07:10 着発・二俣川 07:25 着）を describe の中の定数に切り出したもの。

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram/utils/build-trip-diagram-line.util.spec.ts > $TMPDIR/jest.txt 2>&1
```

Expected: FAIL。

-   [ ] **Step 3: 実装**

`build-trip-diagram-line.util.ts` で変える所（`resolvePairRouteIds`・`buildOccurrenceIndices`・`hasInterloperBetween`・`resolveStopOccurrences`・`dayOffset`・`resolveArrival`・`resolveDeparture` はそのまま）:

1. 型を Interfaces の形にする。`timeToX` の import を消し、`DIAGRAM_START_HOUR` を import する
2. `minutesBetween` の代わりに:

```ts
/** 営業日 0 時からの実時刻を「4 時からの分」に直す */
function toDiagramMinute(base: Date, at: Date): number {
    return (
        (at.getTime() - base.getTime()) / (60 * 1000) - DIAGRAM_START_HOUR * 60
    );
}

/** `HH:mm:ss` の分の 2 桁 */
function minuteText(value: string): string {
    return value.slice(3, 5);
}
```

3. 本体の点を打つループを次にする:

```ts
const allPoints: TripDiagramPoint[] = [];
const segments: TripDiagramPoint[][] = [];
const stopLabels: TripDiagramStopLabel[] = [];
const labeledStops = new Set<TimeDetailsDto>();
let currentSegment: TripDiagramPoint[] = [];

for (const resolvedStop of resolvedStops) {
    if (resolvedStop.newSegment && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
    }

    const stop = resolvedStop.stop;
    const y = axis[resolvedStop.axisIndex].y;
    const arrival = resolveArrival(base, stop);
    const departure = resolveDeparture(base, stop);

    if (arrival !== undefined) {
        const point = { minute: toDiagramMinute(base, arrival), y };
        currentSegment.push(point);
        allPoints.push(point);
    }
    if (
        departure !== undefined &&
        (arrival === undefined || departure.getTime() !== arrival.getTime())
    ) {
        const point = { minute: toDiagramMinute(base, departure), y };
        currentSegment.push(point);
        allPoints.push(point);
    }

    // 接続駅で同じ停車を別の位置に描き直したときは、字を二重に付けない
    const labelTime = stop.departureTime ?? stop.arrivalTime;
    const labelAt = departure ?? arrival;
    if (!labeledStops.has(stop) && labelTime != null && labelAt !== undefined) {
        labeledStops.add(stop);
        stopLabels.push({
            minute: toDiagramMinute(base, labelAt),
            y,
            text: minuteText(labelTime),
        });
    }
}
```

4. 直通先ラベルの駅名を `stationNameById` から引く:

```ts
if (hasMoreBefore) {
    const originId = allStops[0]?.stationId;
    const originName = originId ? stationNameById.get(originId) : undefined;
    if (originName) {
        throughLabels.push({
            minute: firstPoint.minute,
            y: firstPoint.y,
            text: `${originName} →`,
            anchor: 'end',
        });
    }
}
if (hasMoreAfter) {
    const destinationId = allStops[allStops.length - 1]?.stationId;
    const destinationName = destinationId
        ? stationNameById.get(destinationId)
        : undefined;
    if (destinationName) {
        throughLabels.push({
            minute: lastPoint.minute,
            y: lastPoint.y,
            text: `→ ${destinationName}`,
            anchor: 'start',
        });
    }
}
```

5. 返り値に `stopLabels`、`minMinute: Math.min(...allPoints.map((p) => p.minute))`、`maxMinute: Math.max(...allPoints.map((p) => p.minute))` を足す
6. 関数の説明コメントの「x」を「分」に直す

-   [ ] **Step 4: テストが通ることを確かめる**

Expected: `Tests:` に failed なし。**chart の spec と chart 本体はまだ古い型を使うので tsc は落ちる。これは Task 6 で直す**（この Task では tsc を確かめない）。

-   [ ] **Step 5: コミット**

```bash
git add src/app/pages/train-diagram/utils/build-trip-diagram-line.util.ts src/app/pages/train-diagram/utils/build-trip-diagram-line.util.spec.ts
git commit -m "refactor: :recycle: ダイヤグラムの線を 4 時からの分で持つ"
```

---

### Task 5: 見えている範囲の絞り込みと、描く列車の色だけの凡例

**Files:**

-   Create: `src/app/pages/train-diagram/utils/select-visible-lines.util.ts`（+spec）
-   Create: `src/app/pages/train-diagram/utils/build-legend-entries.util.ts`（+spec）
-   Modify: `src/app/pages/train-diagram/components/train-diagram-legend/train-diagram-legend.component.{ts,html,spec.ts}`

**Interfaces:**

-   Consumes: `TripDiagramLine`（Task 4）、`VISIBLE_MARGIN_MINUTES`（Task 3）
-   Produces:

    -   `selectVisibleLines(lines: readonly TripDiagramLine[], range: { startMinute: number; endMinute: number }, selectedTripId: string | null, marginMinutes?: number): TripDiagramLine[]`（選んだ列車は範囲外でも残し、配列の最後に置く）
    -   `type DiagramLegendEntry = { color: string; labels: string[] }`
    -   `buildLegendEntries(trips: readonly TripDetailsDto[], tripClasses: readonly TripClassDetailsDto[]): { entries: DiagramLegendEntry[]; hasDeadhead: boolean }`
    -   凡例部品の入力: `entries = input.required<DiagramLegendEntry[]>()`、`hasDeadhead = input<boolean>(false)`、`showCurrentTimeCursor = input<boolean>(false)`（`tripClasses` 入力は消す）

-   [ ] **Step 1: 失敗するテストを書く（2 ファイル）**

`select-visible-lines.util.spec.ts`:

```ts
import { TripDiagramLine } from './build-trip-diagram-line.util';
import { selectVisibleLines } from './select-visible-lines.util';

function line(
    tripId: string,
    minMinute: number,
    maxMinute: number,
): TripDiagramLine {
    return {
        tripId,
        tripNumber: tripId,
        tripClassColor: '#000',
        isDeadhead: false,
        segments: [],
        throughLabels: [],
        stopLabels: [],
        minMinute,
        maxMinute,
    };
}

describe('selectVisibleLines', () => {
    const lines = [
        line('early', 0, 50),
        line('near', 60, 95),
        line('inside', 120, 150),
        line('late', 400, 450),
    ];

    it('見えている範囲の前後 30 分にかかる線だけ残す', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            null,
        );
        expect(result.map((l) => l.tripId)).toEqual(['near', 'inside']);
    });

    it('選んだ列車は範囲外でも残し、最後（最前面）に置く', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            'early',
        );
        expect(result.map((l) => l.tripId)).toEqual([
            'near',
            'inside',
            'early',
        ]);
    });

    it('選んだ列車が範囲内なら並びの最後へ移す', () => {
        const result = selectVisibleLines(
            lines,
            { startMinute: 125, endMinute: 200 },
            'near',
        );
        expect(result.map((l) => l.tripId)).toEqual(['inside', 'near']);
    });
});
```

`build-legend-entries.util.spec.ts`:

```ts
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { buildLegendEntries } from './build-legend-entries.util';

const CLASSES = [
    {
        tripClassId: 'local-so',
        tripClassName: '各停（SO）',
        tripClassColor: '#212121',
    },
    {
        tripClassId: 'local-jr',
        tripClassName: '各停（SO→JR）',
        tripClassColor: '#40c4ff',
    },
    { tripClassId: 'futsu', tripClassName: '普通', tripClassColor: '#212121' },
    {
        tripClassId: 'rapid',
        tripClassName: '快速（SO）',
        tripClassColor: '#3F51B5',
    },
    {
        tripClassId: 'express',
        tripClassName: '急行（SO）',
        tripClassColor: '#d50000',
    },
] as TripClassDetailsDto[];

function trip(tripClassId?: string): TripDetailsDto {
    const tripClass = CLASSES.find((c) => c.tripClassId === tripClassId);
    return {
        tripId: `t-${tripClassId}`,
        tripClassId,
        tripClass,
    } as TripDetailsDto;
}

describe('buildLegendEntries', () => {
    it('描く列車に使われている色だけを、種別一覧の順に、色でまとめて載せる', () => {
        const result = buildLegendEntries(
            [trip('rapid'), trip('local-jr'), trip('futsu'), trip('local-so')],
            CLASSES,
        );
        expect(result.entries).toEqual([
            { color: '#212121', labels: ['各停', '普通'] },
            { color: '#40c4ff', labels: ['各停'] },
            { color: '#3F51B5', labels: ['快速'] },
        ]);
        expect(result.hasDeadhead).toBe(false);
    });

    it('種別の無い列車（回送）は hasDeadhead にして色の項目には入れない', () => {
        const result = buildLegendEntries(
            [trip(undefined), trip('rapid')],
            CLASSES,
        );
        expect(result.entries).toEqual([
            { color: '#3F51B5', labels: ['快速'] },
        ]);
        expect(result.hasDeadhead).toBe(true);
    });
});
```

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern='src/app/pages/train-diagram/utils/(select-visible-lines|build-legend-entries)' > $TMPDIR/jest.txt 2>&1
```

Expected: FAIL（モジュールが無い）。

-   [ ] **Step 3: 実装（2 ファイル）**

`select-visible-lines.util.ts`:

```ts
import { TripDiagramLine } from './build-trip-diagram-line.util';
import { VISIBLE_MARGIN_MINUTES } from './diagram-timeline.util';

/**
 * 見えている範囲（4 時からの分）の前後 marginMinutes 分にかかる線だけを残す。
 * 選んだ列車は範囲外でも残し、SVG の後勝ち描画で最前面になるよう配列の最後へ置く。
 */
export function selectVisibleLines(
    lines: readonly TripDiagramLine[],
    range: { startMinute: number; endMinute: number },
    selectedTripId: string | null,
    marginMinutes: number = VISIBLE_MARGIN_MINUTES,
): TripDiagramLine[] {
    const from = range.startMinute - marginMinutes;
    const to = range.endMinute + marginMinutes;
    const visible: TripDiagramLine[] = [];
    let selected: TripDiagramLine | undefined;
    for (const line of lines) {
        if (line.tripId === selectedTripId) {
            selected = line;
            continue;
        }
        if (line.maxMinute >= from && line.minMinute <= to) {
            visible.push(line);
        }
    }
    return selected ? [...visible, selected] : visible;
}
```

`build-legend-entries.util.ts`:

```ts
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

export type DiagramLegendEntry = { color: string; labels: string[] };

/**
 * 凡例の項目。描く列車に実際に使われている種別だけを、種別一覧の順に並べ、
 * 同じ色（小文字で比較）の種別はベース名（「（」より前）を「・」でつなぐ 1 項目にまとめる。
 * 種別の無い列車（回送）は hasDeadhead で知らせる（破線の見本を出す）。
 */
export function buildLegendEntries(
    trips: readonly TripDetailsDto[],
    tripClasses: readonly TripClassDetailsDto[],
): { entries: DiagramLegendEntry[]; hasDeadhead: boolean } {
    const usedIds = new Set<string>();
    let hasDeadhead = false;
    for (const trip of trips) {
        if (trip.tripClassId === undefined) {
            hasDeadhead = true;
            continue;
        }
        usedIds.add(trip.tripClassId);
    }

    const entries: DiagramLegendEntry[] = [];
    const indexByColor = new Map<string, number>();
    for (const tripClass of tripClasses) {
        if (!tripClass.tripClassId || !usedIds.has(tripClass.tripClassId)) {
            continue;
        }
        const name = tripClass.tripClassName?.trim() ?? '';
        const label = name.split(/[（(]/)[0].trim() || name;
        const color = tripClass.tripClassColor ?? '#8a8a8a';
        const key = color.trim().toLowerCase();
        const index = indexByColor.get(key);
        if (index === undefined) {
            indexByColor.set(key, entries.length);
            entries.push({ color, labels: [label] });
            continue;
        }
        if (!entries[index].labels.includes(label)) {
            entries[index].labels.push(label);
        }
    }
    return { entries, hasDeadhead };
}
```

凡例部品 `train-diagram-legend.component.ts`: `legendEntries` の computed と `TripClassDetailsDto` の import・`LegendEntry` 型を消し、入力を Interfaces のとおりにする。クラスの説明コメントを「描く列車の色だけを色でまとめて出す（build-legend-entries.util）」に直す。

`train-diagram-legend.component.html`:

```html
<div
    class="tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-text-ink-2"
>
    @for (entry of entries(); track entry.color) {
    <span class="tw-flex tw-items-center tw-gap-1.5 tw-whitespace-nowrap">
        <!-- スウォッチは 4px×24px（2px×16px では色を判別しづらかった。audit M3） -->
        <span
            class="tw-inline-block tw-h-1 tw-w-6 tw-shrink-0 tw-rounded-sm"
            [style.background-color]="entry.color"
        ></span>
        {{ entry.labels.join('・') }}
    </span>
    } @if (hasDeadhead()) {
    <span class="tw-flex tw-items-center tw-gap-1.5 tw-whitespace-nowrap">
        <svg width="24" height="4" aria-hidden="true">
            <line
                x1="0"
                y1="2"
                x2="24"
                y2="2"
                stroke="#8a8a8a"
                stroke-width="2"
                stroke-dasharray="6 4"
            ></line>
        </svg>
        回送
    </span>
    } @if (showCurrentTimeCursor()) {
    <span class="tw-flex tw-items-center tw-gap-1.5 tw-whitespace-nowrap">
        <span
            class="tw-inline-block tw-h-1 tw-w-6 tw-shrink-0 tw-rounded-sm"
            style="background-color: rgb(217, 83, 79)"
        ></span>
        現在時刻
    </span>
    }
</div>
```

`train-diagram-legend.component.spec.ts` を入力の変更に合わせて書き直す（4 件）:

1. `entries` 2 件を渡すと項目が 2 つ出て、`'各停・普通'` の字がある
2. `hasDeadhead=true` で「回送」と破線（`line[stroke-dasharray="6 4"]`）が出る。false では出ない
3. `showCurrentTimeCursor=true` で「現在時刻」が出る。false では出ない
4. `entries` が空で他も false なら項目は 0

親（`train-diagram.component.html`）の `<app-train-diagram-legend [tripClasses]="tripClasses()" …>` は、この Task では `[entries]="[]"` に仮置きする（Task 6 で本物をつなぐ）。

-   [ ] **Step 4: テストが通ることを確かめる**

```bash
npx jest --testPathPattern='src/app/pages/train-diagram/(utils/(select-visible-lines|build-legend-entries)|components/train-diagram-legend)' > $TMPDIR/jest.txt 2>&1
```

Expected: failed なし。tsc は Task 4 から続けて chart の古い型で落ちたまま（Task 6 で直す）なので、この Task では確かめない。

-   [ ] **Step 5: コミット**

```bash
git add src/app/pages/train-diagram/utils/select-visible-lines.util.ts src/app/pages/train-diagram/utils/select-visible-lines.util.spec.ts src/app/pages/train-diagram/utils/build-legend-entries.util.ts src/app/pages/train-diagram/utils/build-legend-entries.util.spec.ts src/app/pages/train-diagram/components/train-diagram-legend src/app/pages/train-diagram/train-diagram.component.html
git commit -m "fix: :bug: ダイヤグラムの凡例を描く線の色だけにする"
```

---

### Task 6: 図を 1 日ぶんの横スクロールに作り直す（chart・ストア・ルート）

**Files:**

-   Modify: `src/app/pages/train-diagram/stores/train-diagram.store.ts`（+spec）
-   Rewrite: `src/app/pages/train-diagram/components/train-diagram-chart/train-diagram-chart.component.{ts,html,spec.ts}`（`.scss` は `:host { display: block; }` だけ残す）
-   Modify: `src/app/pages/train-diagram/train-diagram.component.{ts,html,spec.ts}`

**Interfaces:**

-   Consumes: Task 3 の定数・関数、`buildTripDiagramLine`/`TripDiagramLine`（Task 4）、`selectVisibleLines`・`buildLegendEntries`（Task 5）
-   Produces:
    -   ストア: props `pxPerMinute: number`（既定 `DEFAULT_PX_PER_MINUTE`）、`axisPxPerMinute: number`（既定 `DEFAULT_AXIS_PX_PER_MINUTE`）。`setPxPerMinute(v)`・`setAxisPxPerMinute(v)`（どちらも Task 3 の min/max で `clamp` して入れる）・`pxPerMinute$`・`axisPxPerMinute$`・getter `pxPerMinute`・`axisPxPerMinute`。**`windowStartHour` と `zoomLevel`・`DIAGRAM_ZOOM_LEVELS` はこの Task では残す**（古い controller が使う。Task 7 で消す）
    -   chart の型（chart の ts から export）:

```ts
export type DiagramStationRow = {
    stationId: string;
    stationName: string;
    y: number;
};
export type DiagramJumpRequest = {
    minute: number;
    align: 'start' | 'quarter';
    seq: number;
};
```

-   chart の入出力:

```ts
readonly stationRows = input.required<DiagramStationRow[]>();
readonly lines = input.required<TripDiagramLine[]>();
readonly bodyHeight = input.required<number>();
readonly pxPerMinute = input.required<number>();
readonly axisPxPerMinute = input.required<number>();
readonly selectedTripId = input<string | null>(null);
/** 現在時刻（4 時からの分）。今日のダイヤでなければ null */
readonly nowMinute = input<number | null>(null);
readonly jumpRequest = input<DiagramJumpRequest | null>(null);

readonly tripSelected = output<string | null>();
readonly tripActivated = output<string>();
/** スクロールが止まって 300ms 後の左端の分 */
readonly leftMinuteChange = output<number>();
readonly pxPerMinuteChange = output<number>();
readonly axisPxPerMinuteChange = output<number>();
```

#### 図の組み立て（chart）

定数: `STATION_LABEL_WIDTH = 88`、`TIME_HEADER_HEIGHT = 32`、`SCROLL_IDLE_MS = 300`、`ZOOM_STEP = 1.1`。

テンプレート（1 つのスクロール領域の中で、時刻の行は上に、駅名の列は左に、角は両方に sticky）:

```html
<div
    #scrollHost
    data-scroll-host
    class="tw-relative tw-h-full tw-overflow-auto tw-overscroll-contain"
    style="touch-action: pan-x pan-y"
    (scroll)="onScroll()"
    (wheel)="onWheel($event)"
    (touchstart)="onTouchStart($event)"
    (touchmove)="onTouchMove($event)"
    (touchend)="onTouchEnd($event)"
>
    <div [style.width.px]="stationLabelWidth + svgWidth()">
        <!-- 時刻の行（上に固定）。角は左にも固定 -->
        <div class="tw-sticky tw-top-0 tw-z-20 tw-flex tw-bg-white">
            <div
                class="tw-sticky tw-left-0 tw-z-30 tw-shrink-0 tw-border-0 tw-border-b tw-border-r tw-border-solid tw-border-rule tw-bg-white"
                [style.width.px]="stationLabelWidth"
                [style.height.px]="timeHeaderHeight"
            ></div>
            <svg
                data-time-header
                class="tw-block tw-max-w-none tw-shrink-0 tw-border-0 tw-border-b tw-border-solid tw-border-rule"
                [attr.width]="svgWidth()"
                [attr.height]="timeHeaderHeight"
            >
                @for (tick of hourTicks(); track tick.minute) {
                <text
                    [attr.x]="tick.x + 4"
                    y="20"
                    class="tw-fill-ink-2 tw-tabular-nums"
                    style="font-size: 11px"
                >
                    {{ tick.label }}
                </text>
                }
            </svg>
        </div>

        <div class="tw-flex">
            <!-- 駅名の列（左に固定） -->
            <div
                class="tw-sticky tw-left-0 tw-z-10 tw-shrink-0 tw-border-0 tw-border-r tw-border-solid tw-border-rule tw-bg-white"
                [style.width.px]="stationLabelWidth"
                [style.height.px]="bodyHeight()"
            >
                <div class="tw-relative tw-h-full">
                    @for (row of stationRows(); track $index) {
                    <div
                        data-station-label
                        class="tw-absolute tw-left-0 tw-w-full tw-truncate tw-px-2 tw-text-xs tw-leading-none tw-text-ink"
                        [style.top.px]="row.y - 6"
                    >
                        {{ row.stationName }}
                    </div>
                    }
                </div>
            </div>

            <svg
                data-diagram-body
                class="tw-block tw-max-w-none tw-shrink-0"
                [attr.width]="svgWidth()"
                [attr.height]="bodyHeight()"
            >
                <rect
                    x="0"
                    y="0"
                    [attr.width]="svgWidth()"
                    [attr.height]="bodyHeight()"
                    fill="white"
                    (click)="onBackgroundClick()"
                ></rect>

                @for (tick of minuteTicks(); track tick.minute) {
                <line
                    [attr.x1]="tick.x"
                    y1="0"
                    [attr.x2]="tick.x"
                    [attr.y2]="bodyHeight()"
                    [attr.stroke]="tick.isHour ? '#bdbdbd' : '#eeeeee'"
                    stroke-width="1"
                ></line>
                } @for (row of stationRows(); track $index) {
                <line
                    x1="0"
                    [attr.y1]="row.y"
                    [attr.x2]="svgWidth()"
                    [attr.y2]="row.y"
                    stroke="#eeeeee"
                    stroke-width="1"
                ></line>
                } @for (line of visibleLines(); track line.tripId) { @for
                (segment of line.segments; track $index) { @if
                (isSelected(line.tripId)) {
                <polyline
                    [attr.points]="pointsAttr(segment)"
                    fill="none"
                    stroke="#ffffff"
                    stroke-width="9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    opacity="0.9"
                ></polyline>
                }
                <polyline
                    data-trip-line
                    [attr.data-trip-id]="line.tripId"
                    [attr.points]="pointsAttr(segment)"
                    fill="none"
                    [attr.stroke]="line.tripClassColor"
                    [attr.stroke-width]="isSelected(line.tripId) ? 4 : 2"
                    [attr.stroke-dasharray]="line.isDeadhead ? '6 4' : null"
                    [attr.opacity]="lineOpacity(line.tripId)"
                    style="cursor: pointer"
                    (click)="onLineClick(line.tripId)"
                ></polyline>
                } @for (label of line.throughLabels; track label.text) {
                <text
                    [attr.x]="x(label.minute) + (label.anchor === 'start' ? 4 : -4)"
                    [attr.y]="label.y - 4"
                    [attr.text-anchor]="label.anchor"
                    style="font-size: 10px"
                    class="tw-fill-ink-2"
                >
                    {{ label.text }}
                </text>
                } @if (isSelected(line.tripId)) { @if (line.segments[0]?.[0]; as
                point) {
                <text
                    [attr.x]="x(point.minute) + 4"
                    [attr.y]="point.y - 6"
                    style="font-size: 11px; font-weight: bold"
                    class="tw-fill-primary-700"
                >
                    {{ line.tripNumber }}
                </text>
                } @for (label of line.stopLabels; track $index) {
                <text
                    data-stop-label
                    [attr.x]="x(label.minute) + 3"
                    [attr.y]="label.y - 3"
                    style="font-size: 9px"
                    class="tw-fill-ink tw-tabular-nums"
                >
                    {{ label.text }}
                </text>
                } } } @if (nowMinute(); as now) {
                <line
                    data-now-line
                    [attr.x1]="x(now)"
                    y1="0"
                    [attr.x2]="x(now)"
                    [attr.y2]="bodyHeight()"
                    stroke="rgb(217, 83, 79)"
                    stroke-width="2"
                ></line>
                }
            </svg>
        </div>
    </div>
</div>
```

注意: `@if (nowMinute(); as now)` は 0 分（4:00 ちょうど）で消えるので、実装では `@if (nowMinute() !== null)` にして `nowMinute()!` を使う。

chart の ts（要点。全体は OnPush・standalone・`imports: []`・`host: { class: 'tw-block tw-h-full' }`）:

```ts
readonly stationLabelWidth = STATION_LABEL_WIDTH;
readonly timeHeaderHeight = TIME_HEADER_HEIGHT;

private readonly scrollHost = viewChild.required<ElementRef<HTMLDivElement>>('scrollHost');

/** 見えている範囲（4 時からの分）。スクロールと大きさの変化で 1 コマに 1 回だけ測る */
readonly #visibleRange = signal({ startMinute: 0, endMinute: 180 });

readonly svgWidth = computed(() => DIAGRAM_TOTAL_MINUTES * this.pxPerMinute());

readonly hourTicks = computed(() => {
    const px = this.pxPerMinute();
    const ticks: { minute: number; x: number; label: string }[] = [];
    for (let m = 0; m <= DIAGRAM_TOTAL_MINUTES; m += 60) {
        ticks.push({ minute: m, x: m * px, label: formatHourLabel(m) });
    }
    return ticks;
});

/** 10 分ごとの縦線。見えている範囲の前後だけ（1 日ぶん 133 本を常に描かない） */
readonly minuteTicks = computed(() => {
    const px = this.pxPerMinute();
    const { startMinute, endMinute } = this.#visibleRange();
    const from = Math.max(0, Math.floor((startMinute - VISIBLE_MARGIN_MINUTES) / 10) * 10);
    const to = Math.min(DIAGRAM_TOTAL_MINUTES, endMinute + VISIBLE_MARGIN_MINUTES);
    const ticks: { minute: number; x: number; isHour: boolean }[] = [];
    for (let m = from; m <= to; m += 10) {
        ticks.push({ minute: m, x: m * px, isHour: m % 60 === 0 });
    }
    return ticks;
});

readonly visibleLines = computed(() =>
    selectVisibleLines(this.lines(), this.#visibleRange(), this.selectedTripId()),
);

x(minute: number): number {
    return minute * this.pxPerMinute();
}

pointsAttr(segment: TripDiagramPoint[]): string {
    const px = this.pxPerMinute();
    return segment.map((p) => `${p.minute * px},${p.y}`).join(' ');
}
```

スクロールの扱い:

```ts
#frame: number | null = null;
#idleTimer: ReturnType<typeof setTimeout> | null = null;
/** プログラムで scrollLeft を動かした直後の scroll では URL を書かない */
#suppressLeftEmit = false;

onScroll(): void {
    this.#scheduleMeasure();
    if (this.#idleTimer !== null) clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => {
        this.#idleTimer = null;
        if (this.#suppressLeftEmit) {
            this.#suppressLeftEmit = false;
            return;
        }
        const host = this.scrollHost().nativeElement;
        this.leftMinuteChange.emit(host.scrollLeft / this.pxPerMinute());
    }, SCROLL_IDLE_MS);
}

#scheduleMeasure(): void {
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
        this.#frame = null;
        this.#measure();
    });
}

#measure(): void {
    const host = this.scrollHost().nativeElement;
    const px = this.pxPerMinute();
    const width = Math.max(0, host.clientWidth - STATION_LABEL_WIDTH);
    this.#visibleRange.set({
        startMinute: host.scrollLeft / px,
        endMinute: (host.scrollLeft + width) / px,
    });
}

#scrollToMinute(minute: number, align: 'start' | 'quarter' | 'center'): void {
    const host = this.scrollHost().nativeElement;
    const width = Math.max(0, host.clientWidth - STATION_LABEL_WIDTH);
    const offset = align === 'start' ? 0 : align === 'quarter' ? width / 4 : width / 2;
    this.#suppressLeftEmit = align !== 'start';
    host.scrollLeft = Math.max(0, minute * this.pxPerMinute() - offset);
    this.#measure();
}
```

コンストラクタ（`#injector = inject(Injector)`・`#destroyRef = inject(DestroyRef)`）:

```ts
// 跳ぶ要求（seq が変わるたびに 1 回）
effect(() => {
    const request = this.jumpRequest();
    if (!request) return;
    untracked(() =>
        afterNextRender(
            () => this.#scrollToMinute(request.minute, request.align),
            { injector: this.#injector },
        ),
    );
});

// 横の縮尺が変わっても、画面の中央の時刻を保つ
let lastPx: number | null = null;
effect(() => {
    const px = this.pxPerMinute();
    const previous = lastPx;
    lastPx = px;
    if (previous === null || previous === px) return;
    untracked(() => {
        const host = this.scrollHost().nativeElement;
        const width = Math.max(0, host.clientWidth - STATION_LABEL_WIDTH);
        const centerMinute = (host.scrollLeft + width / 2) / previous;
        afterNextRender(() => this.#scrollToMinute(centerMinute, 'center'), {
            injector: this.#injector,
        });
    });
});

afterNextRender(() => {
    this.#measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => this.#scheduleMeasure());
    observer.observe(this.scrollHost().nativeElement);
    this.#destroyRef.onDestroy(() => observer.disconnect());
});

this.#destroyRef.onDestroy(() => {
    if (this.#frame !== null) cancelAnimationFrame(this.#frame);
    if (this.#idleTimer !== null) clearTimeout(this.#idleTimer);
});
```

ホイール・ピンチ（今の実装を出力に変える。上限・下限は Task 3 の定数）:

```ts
onWheel(event: WheelEvent): void {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    if (event.shiftKey) {
        this.pxPerMinuteChange.emit(clamp(this.pxPerMinute() * factor, PX_PER_MINUTE_MIN, PX_PER_MINUTE_MAX));
        return;
    }
    this.axisPxPerMinuteChange.emit(clamp(this.axisPxPerMinute() * factor, AXIS_PX_PER_MINUTE_MIN, AXIS_PX_PER_MINUTE_MAX));
}
```

`onTouchStart` / `onTouchMove` / `onTouchEnd` / `#touchDistance` は今の実装のまま、`set` の代わりに `pxPerMinuteChange.emit(...)` と `axisPxPerMinuteChange.emit(...)` を呼ぶ（開始時の値は `this.pxPerMinute()`・`this.axisPxPerMinute()` から取る）。`isSelected`・`lineOpacity`・`onLineClick`・`onBackgroundClick` は今のまま。`interval(1000)`・`linkedSignal`・幅に合わせる縮尺（`#fitPxPerMinute`・`#widthScale`・`#effectivePxPerMinute`）は消す。

#### ルート（`train-diagram.component.ts`）

足す・変える所:

```ts
const BODY_TOP_PADDING = 12;
const BODY_BOTTOM_PADDING = 24;
const MIN_ROW_HEIGHT_PX = 22;

readonly pxPerMinute = toSignal(TrainDiagramStore.pxPerMinute$, { initialValue: DEFAULT_PX_PER_MINUTE });
readonly axisPxPerMinute = toSignal(TrainDiagramStore.axisPxPerMinute$, { initialValue: DEFAULT_AXIS_PX_PER_MINUTE });
readonly jumpRequest = signal<DiagramJumpRequest | null>(null);
#jumpSeq = 0;

/** 1 秒ごとの時計（今日のダイヤのときの現在時刻の線と「今」ボタン用） */
readonly #now = toSignal(interval(1000).pipe(map(() => new Date())), { initialValue: new Date() });

readonly nowMinute = computed(() => (this.isTodaySelected() ? railwayMinuteOfDay(this.#now()) : null));

/** 縦の縮尺・最小行高・上の余白を適用した駅軸（y はそのまま SVG の y） */
readonly #pixelAxis = computed<StationAxis | null>(() => {
    const axis = this.stationAxis();
    if (!axis) return null;
    const px = this.axisPxPerMinute();
    return enforceMinimumRowGap(
        axis.map((entry) => ({ stationId: entry.stationId, y: entry.y * px })),
        MIN_ROW_HEIGHT_PX,
    ).map((entry) => ({ ...entry, y: entry.y + BODY_TOP_PADDING }));
});

readonly stationRows = computed<DiagramStationRow[]>(() => {
    const names = this.#stationNameById();
    return (this.#pixelAxis() ?? []).map((entry) => ({
        stationId: entry.stationId,
        stationName: names.get(entry.stationId) ?? '',
        y: entry.y,
    }));
});

readonly bodyHeight = computed(() => {
    const axis = this.#pixelAxis();
    const maxY = axis && axis.length ? Math.max(...axis.map((e) => e.y)) : 0;
    return maxY + BODY_BOTTOM_PADDING;
});

/** 列車の線。横の縮尺・スクロールでは計算し直さない */
readonly diagramLines = computed<TripDiagramLine[]>(() => {
    const axis = this.#pixelAxis();
    if (!axis) return [];
    const axisStationIds = new Set(axis.map((e) => e.stationId));
    const routeIdsByStation = this.routeIdsByStation();
    const stationNameById = this.#stationNameById();
    const base = getRailwayDate(new Date());
    return Object.values(this.filteredTripBlocksByDirection())
        .flat()
        .flatMap((block) => block.trips ?? [])
        .map((trip) => buildTripDiagramLine({ trip, axis, axisStationIds, routeIdsByStation, base, stationNameById }))
        .filter((line): line is TripDiagramLine => !!line);
});

readonly legend = computed(() => {
    const drawn = new Set(this.diagramLines().map((l) => l.tripId));
    const trips = this.#allTrips().filter((t) => t.tripId !== undefined && drawn.has(t.tripId));
    return buildLegendEntries(trips, this.tripClasses());
});

#requestJump(minute: number, align: DiagramJumpRequest['align']): void {
    this.jumpRequest.set({ minute, align, seq: ++this.#jumpSeq });
}
```

`#stationNameById` は既存のもの（全路線の駅）をそのまま使う。`stationAxisStations` の toSignal は使わなくなれば消す。

URL の扱い（`paramMap` の購読を置き換える）:

-   表示に効く値の鍵 `calendar_id|route_ids|direction` を `#lastParamsKey` に持つ。`time` だけが変わったとき（鍵が同じ）は何もしない（選択も解かず、取り直しもしない）
-   足りない値の補い: `calendar_id`・`route_ids`・`time` のどれかが無い、または `window` があるとき、次の値で `replaceUrl` して return:
    -   `time`: `parseTimeParam(time)` → `parseLegacyWindowParam(window)` → `defaultStartMinute(new Date())` の順で決めた分を `formatTimeParam` で
    -   `window` は付けない（消す）
-   初回（`#firstLoadDone` が false）の購読では、`parseTimeParam(paramMap.get('time'))` の分へ `#requestJump(minute, 'start')`
-   `TrainDiagramStore.setWindowStartHour` の呼び出しは消す

イベント:

```ts
onLeftMinuteChange(minute: number): void {
    this.#router.navigate(
        ['/train-diagram', { ...this.#route.snapshot.params, time: formatTimeParam(minute) }],
        { replaceUrl: true },
    );
}
onPxPerMinuteChange(value: number): void { TrainDiagramStore.setPxPerMinute(value); }
onAxisPxPerMinuteChange(value: number): void { TrainDiagramStore.setAxisPxPerMinute(value); }
onJumpToHour(hour: number): void { this.#requestJump((hour - DIAGRAM_START_HOUR) * 60, 'start'); }
onJumpToNow(): void { this.#requestJump(railwayMinuteOfDay(new Date()), 'quarter'); }
onZoomStep(direction: 1 | -1): void { TrainDiagramStore.setPxPerMinute(nextZoomStep(this.pxPerMinute(), direction)); }
```

古い controller との橋渡し（Task 7 で消す）: `onWindowStartHourChange(hour)` は `this.onJumpToHour(hour)` を呼ぶ。`onZoomLevelChange(level)` は `TrainDiagramStore.setZoomLevel(level)` と `TrainDiagramStore.setPxPerMinute(DIAGRAM_ZOOM_LEVELS[level])`。controller の `[windowStartHour]` には `windowStartHour()`（今のまま）を渡す。

`#navigate` は `time` を含めたまま（`snapshot.params` を引き継ぐ）でよい。

`selectedTripInfo`・`onTripSelected`・`onTripActivated`・`onInfoPanelClosed`・`onResetDiagramFilters`・`fetchData` は今のまま。

#### ルートのテンプレート

```html
<main class="tw-flex tw-h-full tw-flex-col tw-bg-paper-2">
    @if (isLoading()) {
    <div
        class="tw-fixed tw-left-0 tw-top-[48px] tw-z-30 tw-w-full md:tw-top-[64px]"
    >
        <mat-progress-bar
            color="accent"
            mode="indeterminate"
        ></mat-progress-bar>
    </div>
    }

    <app-train-diagram-controller …（今のまま）></app-train-diagram-controller>

    <app-train-diagram-legend
        [entries]="legend().entries"
        [hasDeadhead]="legend().hasDeadhead"
        [showCurrentTimeCursor]="isTodaySelected()"
    ></app-train-diagram-legend>

    <!-- 図のカード: 高さは画面の残り。縦横スクロールはカードの中 -->
    <div class="tw-flex tw-min-h-[320px] tw-flex-1 tw-flex-col tw-p-3">
        @if (isEmpty()) {
        <div
            class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-rounded-card tw-bg-white"
        >
            <app-empty-state
                icon="show_chart"
                message="この条件の列車情報はありません"
                actionLabel="表示条件をリセットする"
                (actionClick)="onResetDiagramFilters()"
            ></app-empty-state>
        </div>
        } @else {
        <app-train-diagram-chart
            class="tw-min-h-0 tw-flex-1 tw-overflow-hidden tw-rounded-card tw-bg-white"
            [stationRows]="stationRows()"
            [lines]="diagramLines()"
            [bodyHeight]="bodyHeight()"
            [pxPerMinute]="pxPerMinute()"
            [axisPxPerMinute]="axisPxPerMinute()"
            [selectedTripId]="selectedTripId()"
            [nowMinute]="nowMinute()"
            [jumpRequest]="jumpRequest()"
            (tripSelected)="onTripSelected($event)"
            (tripActivated)="onTripActivated($event)"
            (leftMinuteChange)="onLeftMinuteChange($event)"
            (pxPerMinuteChange)="onPxPerMinuteChange($event)"
            (axisPxPerMinuteChange)="onAxisPxPerMinuteChange($event)"
        ></app-train-diagram-chart>
        }
    </div>

    @if (selectedTripInfo(); as info) {
    <app-train-diagram-info-panel
        [info]="info"
        (closed)="onInfoPanelClosed()"
    ></app-train-diagram-info-panel>
    }
</main>
```

`LoadingComponent` の import を消す。`isEmpty` は今のまま（読み込み中は false）。読み込み中も chart は前のデータで出たまま（初回は線の無いカード）。

-   [ ] **Step 1: 失敗するテストを書く**

ストアの spec に足す:

```ts
it('setPxPerMinute / setAxisPxPerMinute: 上限・下限に収めて入れる', () => {
    TrainDiagramStore.setPxPerMinute(100);
    expect(TrainDiagramStore.pxPerMinute).toBe(40);
    TrainDiagramStore.setPxPerMinute(1);
    expect(TrainDiagramStore.pxPerMinute).toBe(4);
    TrainDiagramStore.setAxisPxPerMinute(50);
    expect(TrainDiagramStore.axisPxPerMinute).toBe(24);
    TrainDiagramStore.setPxPerMinute(10);
    TrainDiagramStore.setAxisPxPerMinute(6);
});
```

chart の spec を書き直す（`TestBed` + `fixture.componentRef.setInput`。`requestAnimationFrame` は jsdom にあるが、測定は `afterNextRender` 後なので `fixture.detectChanges(); await fixture.whenStable();` を挟む）。最低限の 7 件:

1. 正時の字が 23 個（4:00〜26:00）出て、最初が「4:00」
2. `lines` に 0〜50 分の線と 900〜950 分の線を渡すと、初期の範囲（0〜180 分）では 1 本目だけが `[data-trip-line]` になる
3. `selectedTripId` に 900〜950 分の線を指定すると、その線も描かれ、`[data-stop-label]` が出る（選んでいない線には出ない）
4. 線をクリックすると `tripSelected` にその id、選択中の線をクリックすると `tripActivated`
5. 背景（`rect`）のクリックで、選択中なら `tripSelected` に null
6. Ctrl+ホイール（deltaY<0）で `axisPxPerMinuteChange` に `6 * 1.1`、Ctrl+Shift+ホイールで `pxPerMinuteChange` に `10 * 1.1`。修飾キーなしでは何も出ない
7. `nowMinute` が数値なら `[data-now-line]` が出て、null なら出ない

ルートの spec:

-   `'onZoomLevelChange: ズーム段階をストアへ反映する'` → `'onZoomStep: 横の縮尺を次の段へ移す'`（10 → 16、−1 で 10 → 6）
-   `'ロード中はチャート（本文）を出さず中央スピナーを表示する'` → `'ロード中はプログレスバーだけを出し、スピナーは出さない'`（`mat-progress-bar` があり `app-loading` が無い）
-   足す: `'time だけが変わった URL では選択を解かない'`（`selectedTripId` を入れてから `time` だけ違う paramMap を流し、`TrainDiagramStore.selectedTripId` が残る。paramMap は `ActivatedRoute` を `{ paramMap: subject, snapshot: { params: {} } }` のモックにして `BehaviorSubject<ParamMap>` で流す）
-   足す: `'window 付きの古い URL は time に置き換えて replaceUrl する'`（`Router.navigate` を spy。`calendar_id`・`route_ids`・`window=1800-1900` を流すと `['/train-diagram', { calendar_id, route_ids, time: '1800' }]`・`{ replaceUrl: true }` で呼ばれる）

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern='src/app/pages/train-diagram/(stores|components/train-diagram-chart|train-diagram.component)' > $TMPDIR/jest.txt 2>&1
```

Expected: FAIL。

-   [ ] **Step 3: 実装**（上の「図の組み立て」「ルート」「ルートのテンプレート」のとおり）

-   [ ] **Step 4: テスト・型・lint**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram > $TMPDIR/jest.txt 2>&1
npx tsc -p tsconfig.app.json --noEmit > $TMPDIR/tsc.txt 2>&1
npx eslint src/app/pages/train-diagram > $TMPDIR/lint.txt 2>&1
```

Expected: failed なし・tsc 0 件・lint エラー 0 件。

-   [ ] **Step 5: 実データで目視**（dev server `http://localhost:4200/train-diagram`・PC 1440×900）

-   図のカードが画面の下端まで伸び、ページ全体は縦にスクロールしない
-   横スクロールで 4:00〜26:00 の端まで行ける。時刻の行と駅名の列が固定されたまま
-   描かれている `polyline[data-trip-line]` の数が、1 日ぶん全部ではなく見えている範囲の分だけ（DevTools で数える）
-   スクロールを止めて 300ms 後に URL の `time=` が変わり、戻るボタンの履歴は増えない

-   [ ] **Step 6: コミット**

```bash
git add src/app/pages/train-diagram/stores src/app/pages/train-diagram/components/train-diagram-chart src/app/pages/train-diagram/train-diagram.component.ts src/app/pages/train-diagram/train-diagram.component.html src/app/pages/train-diagram/train-diagram.component.spec.ts
git commit -m "feat: :sparkles: ダイヤグラムを 1 日ぶんの横スクロールにする"
```

---

### Task 7: 表示設定を畳まない 2 行に作り直す

**Files:**

-   Rewrite: `src/app/pages/train-diagram/components/train-diagram-controller/train-diagram-controller.component.{ts,html,spec.ts}`
-   Modify: `src/app/pages/train-diagram/train-diagram.component.{ts,html,spec.ts}`
-   Modify: `src/app/pages/train-diagram/stores/train-diagram.store.ts`（+spec）
-   Delete: `src/app/pages/train-diagram/utils/generate-diagram-window-options.util.ts`（+spec）

**Interfaces:**

-   Consumes: `DIAGRAM_JUMP_HOURS`・`formatHourLabel`・`DIAGRAM_START_HOUR`・`nextZoomStep`（Task 3）、ルートの `onJumpToHour`・`onJumpToNow`・`onZoomStep`（Task 6）
-   Produces（controller）:

```ts
readonly calendarId = input<string | null>(null);
readonly selectedRouteIds = input<string[]>([]);
readonly directionFilter = input<DiagramDirectionFilter>('both');
readonly showNowButton = input<boolean>(false);

readonly calendarIdChange = output<string>();
readonly routeIdsChange = output<string[]>();
readonly directionFilterChange = output<DiagramDirectionFilter>();
readonly jumpToHour = output<number>();
readonly jumpToNow = output<void>();
readonly zoomStep = output<1 | -1>();
```

-   [ ] **Step 1: 失敗するテストを書く**

controller の spec を書き直す（7 件）:

1. `app-collapsible-panel` が無い
2. 路線チップ `app-filter-chips` に `mode="multiple"` と `scrollMode` が付く（NO_ERRORS_SCHEMA なら属性で確かめる）
3. 「時刻へ跳ぶ」の選択肢が 22 個（4:00〜25:00）
4. 選択肢 18 を選ぶと `jumpToHour` に 18
5. `showNowButton=false` で「今」ボタン（`[data-now-button]`）が無く、true で有り、押すと `jumpToNow`
6. −（`[data-zoom-out]`）で `zoomStep` に -1、＋（`[data-zoom-in]`）で 1
7. 方向のトグルで `directionFilterChange`

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram/components/train-diagram-controller > $TMPDIR/jest.txt 2>&1
```

-   [ ] **Step 3: 実装**

controller の html:

```html
<!-- 表示設定は畳まず 2 行（列車位置情報と同じ。ユーザー判断 2026-09-26）。
     1 行目: 路線チップ（複数選択・横スクロール 1 行）
     2 行目: ダイヤ・時刻へ跳ぶ・今・方向・横の縮尺 -->
<div
    class="tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white tw-px-3 tw-pt-2"
>
    <app-filter-chips
        mode="multiple"
        [scrollMode]="true"
        [options]="routeOptions()"
        [selected]="selectedRouteIds()"
        (selectedChange)="onRouteChange($event)"
    ></app-filter-chips>

    <div
        class="tw-flex tw-min-h-14 tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-2 tw-py-2"
    >
        <mat-form-field
            subscriptSizing="dynamic"
            class="tw-min-w-0 tw-flex-1 sm:tw-w-64 sm:tw-flex-none"
        >
            <mat-label>ダイヤ</mat-label>
            <mat-select
                [value]="calendarId()"
                (selectionChange)="onCalendarChange($event.value)"
            >
                <mat-select-trigger>{{ calendarLabel() }}</mat-select-trigger>
                @for (calendar of calendars(); track calendar.calendarId) {
                <mat-option [value]="calendar.calendarId"
                    >{{ calendarSummaryLabel(calendar) }}</mat-option
                >
                }
            </mat-select>
        </mat-form-field>

        <mat-form-field subscriptSizing="dynamic" class="tw-w-32">
            <mat-label>時刻へ跳ぶ</mat-label>
            <!-- 跳ぶだけの操作なので値は持たない（選んだら空に戻す） -->
            <mat-select (selectionChange)="onJump($event)">
                @for (hour of jumpHours; track hour) {
                <mat-option [value]="hour">{{ hourLabel(hour) }}</mat-option>
                }
            </mat-select>
        </mat-form-field>

        @if (showNowButton()) {
        <button
            mat-stroked-button
            type="button"
            data-now-button
            class="tw-whitespace-nowrap"
            (click)="jumpToNow.emit()"
        >
            今
        </button>
        }

        <mat-button-toggle-group
            class="tw-whitespace-nowrap"
            [value]="directionFilter()"
            (change)="directionFilterChange.emit($event.value)"
            aria-label="方向"
        >
            <mat-button-toggle value="up">上り</mat-button-toggle>
            <mat-button-toggle value="down">下り</mat-button-toggle>
            <mat-button-toggle value="both">両方</mat-button-toggle>
        </mat-button-toggle-group>

        <span class="tw-inline-flex tw-items-center tw-whitespace-nowrap">
            <button
                mat-icon-button
                type="button"
                data-zoom-out
                aria-label="横の縮尺を小さくする"
                matTooltip="Ctrl+Shift+スクロールでも変えられます（Ctrl+スクロールで縦の縮尺）"
                (click)="zoomStep.emit(-1)"
            >
                <mat-icon>zoom_out</mat-icon>
            </button>
            <button
                mat-icon-button
                type="button"
                data-zoom-in
                aria-label="横の縮尺を大きくする"
                matTooltip="Ctrl+Shift+スクロールでも変えられます（Ctrl+スクロールで縦の縮尺）"
                (click)="zoomStep.emit(1)"
            >
                <mat-icon>zoom_in</mat-icon>
            </button>
        </span>
    </div>
</div>
```

controller の ts:

-   imports: `MatFormFieldModule`・`MatSelectModule`・`MatButtonToggleModule`・`MatButtonModule`・`MatIconModule`・`MatTooltipModule`・`FilterChipsComponent`（`CollapsiblePanelComponent` を外す）
-   `DIRECTION_FILTER_LABELS`・`ZOOM_LEVEL_LABELS`・`collapsedSummary`・`windowOptions`・`zoomLevels`・`currentWindowValue`・`onWindowChange`・`onZoomChange` を消す
-   足す:

```ts
readonly jumpHours = DIAGRAM_JUMP_HOURS;

readonly calendarLabel = computed(() => {
    const calendar = this.calendars().find((c) => c.calendarId === this.calendarId());
    return calendar ? formatCalendarSummaryLabel(calendar) : 'ダイヤ未選択';
});

hourLabel(hour: number): string {
    return formatHourLabel((hour - DIAGRAM_START_HOUR) * 60);
}

/** 跳ぶだけの操作なので、選んだら select を空に戻す */
onJump(event: MatSelectChange): void {
    const hour = event.value as number | null;
    event.source.value = null;
    if (hour !== null) {
        this.jumpToHour.emit(hour);
    }
}
```

（`MatSelectChange` は `@angular/material/select` から import）

-   `routeOptions`・`calendarSummaryLabel`・`onCalendarChange`・`onRouteChange` は今のまま。`onDirectionFilterChange` はテンプレートで直接 emit するので消してよい
-   クラスの説明コメントを「畳まない 2 行の表示設定」に直す

ルート:

-   controller の結線を `[calendarId]` `[selectedRouteIds]` `[directionFilter]` `[showNowButton]="isTodaySelected()"` と `(calendarIdChange)` `(routeIdsChange)` `(directionFilterChange)` `(jumpToHour)="onJumpToHour($event)"` `(jumpToNow)="onJumpToNow()"` `(zoomStep)="onZoomStep($event)"` にする
-   橋渡しの `onWindowStartHourChange`・`onZoomLevelChange`・`windowStartHour`・`zoomLevel` の toSignal を消す。`parseWindowStartHour` 等の import を消す

ストア: `windowStartHour`・`zoomLevel` の props・setter・`$`・getter、`DIAGRAM_ZOOM_LEVELS`・`DiagramZoomLevel` を消す（spec の該当部分も）。

```bash
git rm src/app/pages/train-diagram/utils/generate-diagram-window-options.util.ts src/app/pages/train-diagram/utils/generate-diagram-window-options.util.spec.ts
grep -rn "DIAGRAM_ZOOM_LEVELS\|DiagramZoomLevel\|windowStartHour\|generate-diagram-window-options" src/app
```

Expected: grep 0 件。

-   [ ] **Step 4: テスト・型・lint**（Task 6 Step 4 と同じ 3 コマンド）

-   [ ] **Step 5: 目視**（PC 1440 と スマホ 400）: 2 行が畳まれずに出る。スマホで 2 行目が折り返しても各部品の中は折り返さない。「時刻へ跳ぶ」で 18:00 を選ぶと 18:00 が左端に来る。「今」で現在時刻の線が左から 1/4 付近に来る。− / ＋ で中央の時刻を保ったまま縮尺が変わる

-   [ ] **Step 6: コミット**

```bash
git add src/app/pages/train-diagram/components/train-diagram-controller src/app/pages/train-diagram/train-diagram.component.ts src/app/pages/train-diagram/train-diagram.component.html src/app/pages/train-diagram/train-diagram.component.spec.ts src/app/pages/train-diagram/stores
git commit -m "feat: :sparkles: ダイヤグラムの表示設定を畳まない 2 行にする"
```

（`git rm` した 2 ファイルは既にステージ済み）

---

### Task 8: 選んだ列車の情報を PC では右下のカードにする

**Files:**

-   Modify: `src/app/pages/train-diagram/components/train-diagram-info-panel/train-diagram-info-panel.component.{ts,html,spec.ts}`

**Interfaces:**

-   Consumes: `TrainDiagramSelectedTripInfo`（変えない）

-   [ ] **Step 1: 失敗するテストを書く**（spec に足す）

```ts
it('運用番号は運用群の色で「運用」の字を付けず、行路図へのリンクにする', () => {
    fixture.componentRef.setInput('info', {
        ...baseInfo,
        operationNumber: '71',
        operationId: 'op-71',
    });
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
        'a[data-operation-number]',
    );
    expect(link.textContent?.trim()).toBe('71');
    expect(link.getAttribute('href')).toContain(
        '/operation/route-diagram;operation_id=op-71',
    );
    expect(link.style.backgroundColor).not.toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('運用');
});

it('全線時刻表へのリンクの字は「全線時刻表で見る ›」', () => {
    fixture.componentRef.setInput('info', baseInfo);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('全線時刻表で見る ›');
});

it('host は PC で右下に浮かぶカード、枠は tw-border-solid', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.className).toContain('lg:tw-w-[22rem]');
    expect(host.className).toContain('tw-border-solid');
});
```

`baseInfo` は既存の spec のデータを describe の定数に切り出したもの（無ければ `{ tripId: 't1', tripNumber: '1234', tripClassName: '快速', tripClassColor: '#3f51b5', destinationName: '海老名', detailLink: ['/timetable', 'all-line', {}] }`）。TestBed に `provideRouter([])` が無ければ足す。

-   [ ] **Step 2: 失敗を確かめる**

```bash
npx jest --testPathPattern=src/app/pages/train-diagram/components/train-diagram-info-panel > $TMPDIR/jest.txt 2>&1
```

-   [ ] **Step 3: 実装**

host:

```ts
    host: {
        class: 'tw-fixed tw-inset-x-0 tw-bottom-0 tw-z-30 tw-block tw-rounded-t-xl tw-border tw-border-solid tw-border-grey-200 tw-bg-white tw-shadow-lg lg:tw-inset-x-auto lg:tw-bottom-4 lg:tw-right-4 lg:tw-w-[22rem] lg:tw-rounded-card',
    },
```

imports: `RouterLink`・`MatIconModule`・`TripClassChipComponent`・`DateFnsPipe`・`PipesModule`（`src/app/core/pipes/pipes.module`）。使っていない `OperationNumberTagComponent`・`TripClassBaseNamePipe` を外す。

html の 2 行目（`app-operation-number-tag` の所）を次に置き換える:

```html
<div
    class="tw-flex tw-flex-row tw-flex-wrap tw-items-center tw-gap-x-2 tw-gap-y-1 tw-text-sm tw-text-muted"
>
    @if (info().operationNumber) {
    <!-- 運用番号は運用群の色。運用 ID があれば運用行路図へのリンク（列車位置情報と同じ） -->
    @if (info().operationId) {
    <a
        data-operation-number
        class="tw-rounded tw-px-1 tw-font-bold tw-text-ink tw-no-underline"
        [style.background-color]="info().operationNumber | operationNumberColor"
        [routerLink]="['/operation', 'route-diagram', { operation_id: info().operationId }]"
        (click)="closed.emit()"
        >{{ info().operationNumber }}</a
    >
    } @else {
    <span
        data-operation-number
        class="tw-rounded tw-px-1 tw-font-bold tw-text-ink"
        [style.background-color]="info().operationNumber | operationNumberColor"
        >{{ info().operationNumber }}</span
    >
    } } @if (info().formationNumber) {
    <span class="tw-whitespace-nowrap"
        >編成 <b class="tw-text-ink">{{ info().formationNumber }}</b></span
    >
    } @if (info().sightingTime; as sightingTime) {
    <span class="tw-whitespace-nowrap"
        >（目撃 {{ sightingTime | dateFns: { format: 'MM/dd', parseISO: true }
        }}）</span
    >
    }
</div>
```

リンクの字を `全線時刻表で見る ›` に変える。閉じるボタンの `tw-bg-transparent`（生成されない）を `tw-bg-white` に変える。

-   [ ] **Step 4: テスト・型・lint**（Task 6 Step 4 と同じ）

-   [ ] **Step 5: 目視**: PC 1440 で列車を押すと右下に幅 22rem のカード（枠あり・影あり）、スマホ 400 で下の帯

-   [ ] **Step 6: コミット**

```bash
git add src/app/pages/train-diagram/components/train-diagram-info-panel
git commit -m "feat: :sparkles: 選んだ列車の情報を PC では右下のカードにする"
```

---

### Task 9: 実データで全体を確かめて測る（コントローラが行う）

-   [ ] PC 1440×900 と スマホ 400×860 で、spec の「テスト」の目視項目をすべて確かめる（スクリーンショットは `.playwright-mcp/` に。git 管理外）
-   [ ] 凡例の色と図の `polyline` の `stroke` の色の集合が一致する（`browser_evaluate` で両方を集めて比べる）
-   [ ] 直通先ラベル（「→ 渋谷」など）が 1 つ以上出る
-   [ ] 実測: 図が出るまでの時間、trip-blocks 2 本の `decodedBodySize`（今: 7.3 秒・約 5.8MB × 2）、横スクロール中の描画本数
-   [ ] 列車位置情報を開いた後にダイヤグラムを開くと、trip-blocks の取得が起きない（キャッシュ共有）
-   [ ] 全体: `npx jest --testPathPattern='src/app/pages/(train-diagram|train-location)|src/app/shared/attach-trip-classes' > $TMPDIR/jest.txt 2>&1` が failed なし
