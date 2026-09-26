# 列車位置情報 骨格の作り直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 列車位置情報ページを「縦の図（左）＋選んだ駅に次に来る列車の欄（右・sticky）」の骨格に作り直す。

**Architecture:** 次に来る列車は新しい純関数 `buildStationArrivals` で trip block から作る。時刻の解釈は `shared/train-position.util.ts` の関数を export して共有する。駅の選択は URL の `station_id` が正で、路線ごとの前回の駅を localStorage で補う。図（`train-location-line`）は駅の札を押せるようにし、新しい `train-location-station-panel` が欄を描く。時計部品は廃止し、ページ本体の状態の行に畳む。

**Tech Stack:** Angular 20（standalone・signals・OnPush）、Elf ストア、Angular Material M2、Tailwind（`tw-` 接頭辞・preflight 無効）、Jest、date-fns。

**Spec:** `docs/superpowers/specs/2026-09-26-train-location-design.md`

## Global Constraints

- 作業ブランチは `feature/redesign-2026-07`。push・merge はしない
- コミットは Conventional Commits＋絵文字テキスト（例 `feat: :sparkles: …`）。末尾に次の 2 行を付ける:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01CacMeG3UEZiR9Ka8xo2VxH`
- 署名コミットはサンドボックス外（`dangerouslyDisableSandbox: true`）で行い、`git log -1 --format='%h %G?'` が `G` であることを確かめる
- `.serena/project.yml` と `docs/superpowers/plans/2026-07-03-redesign-implementation.md` はコミットに含めない
- テストは `npx jest --testPathPattern=<spec のパス>`（`npm test` はサンドボックスで落ちる）
- prettier はファイル単位（`npx prettier --write <file>`）。無関係なファイルの整形差分は戻す
- Bash でパイプ連結をしない（1 コマンド 1 目的）
- Tailwind は `tw-` 接頭辞。枠線は `tw-border-solid` を併記。`[ngClass]` でなく `[class.x]`。色は `tw-bg-paper-2` `tw-border-rule` `tw-text-muted` `tw-bg-structure` `tw-text-ink` などトークン名で書く
- 情報を削らない（カードの中身・乗換リンク・免責文は残す）
- private フィールドは `#`。ただし `viewChild` などシグナルクエリは `#` 不可（NG1053）
- 画面文言は日本語のまま（spec の文言をそのまま使う）

---

## File Structure

| ファイル | 役割 |
| --- | --- |
| `src/app/shared/train-position.util.ts` | 変更: `resolveArrival` / `resolveDeparture` / `dayOffset` を export |
| `src/app/pages/train-location/utils/determine-major-stations.util.ts` (+spec) | 変更: null・種別名の末尾・回送 |
| `src/app/pages/train-location/interfaces/station-arrival.interface.ts` | 新規: 駅の欄の 1 行の型 |
| `src/app/pages/train-location/utils/build-station-arrivals.util.ts` (+spec) | 新規: 次に来る列車を作る純関数 |
| `src/app/pages/train-location/utils/train-location-storage.util.ts` (+spec) | 新規: 前回の駅・欄の開閉の localStorage |
| `src/app/pages/train-location/components/train-location-station-panel/*` | 新規: 駅の欄 |
| `src/app/pages/train-location/components/train-location-line/*` | 変更: 駅の札・乗換リンク・オーバーレイ削除 |
| `src/app/pages/train-location/components/train-location-card/*` | 変更: 影 → 縁 |
| `src/app/pages/train-location/components/train-location-controller/*` | 変更: 免責文を削除 |
| `src/app/pages/train-location/components/train-location-clock/*` | 削除 |
| `src/app/pages/train-location/stores/train-location.store.ts` (+spec) | 変更: `selectedStationId` |
| `src/app/pages/train-location/train-location.component.*` | 変更: 状態の行・2 列 grid・`station_id` |

---

### Task 1: 主要駅の判定を直す

**Files:**
- Modify: `src/app/pages/train-location/utils/determine-major-stations.util.ts`
- Test: `src/app/pages/train-location/utils/determine-major-stations.util.spec.ts`

**Interfaces:**
- Consumes: なし
- Produces: `determineMajorStations(tripBlocks, axisStationIds): ReadonlySet<string>`（シグネチャ不変）

- [ ] **Step 1: 失敗するテストを書く**（既存 spec の `describe` の末尾に足す。`time()` はキャストなので null を入れるには `as unknown as string` を使う）

```ts
    it('着発時刻が null の通過駅は対象外（API は欠落を null で返す）', () => {
        const express = trip({
            tripId: 't1',
            tripClassName: '特急（SO）',
            times: [
                time({
                    stationId: 's1',
                    arrivalTime: null as unknown as string,
                    departureTime: null as unknown as string,
                }),
                time({ stationId: 's2', departureTime: '07:00:00' }),
            ],
        });

        const result = determineMajorStations([block([express])], axisStationIds);

        expect(result.has('s1')).toBe(false);
        expect(result.has('s2')).toBe(true);
    });

    it('系統付きの各停（各停（SO）など）は主要駅の根拠にしない', () => {
        const local = trip({
            tripId: 't1',
            tripClassName: '各停（SO→JA）',
            times: [time({ stationId: 's1', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations([block([local])], axisStationIds);

        expect(result.size).toBe(0);
    });

    it('回送は主要駅の根拠にしない', () => {
        const deadhead = trip({
            tripId: 't1',
            tripClassName: '回送',
            times: [time({ stationId: 's1', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations([block([deadhead])], axisStationIds);

        expect(result.size).toBe(0);
    });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/utils/determine-major-stations.util.spec.ts`
Expected: 追加した 3 件が FAIL

- [ ] **Step 3: 実装する**（関数本体を差し替え。JSDoc も合わせる）

```ts
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

/** 主要駅の根拠にしない種別（系統サフィックス「（…）」付きも先頭一致で捉える） */
const NON_MAJOR_CLASS_PREFIXES = ['各停', '回送'] as const;

/**
 * 主要駅（優等停車駅）を判定する純関数。
 *
 * 各停・回送以外の列車が発着（着時刻・発時刻のいずれかを持つ）する駅を主要駅とする。
 * 種別名は「各停（SO）」のように系統が付くため先頭一致で判定する。
 * API の欠落時刻は null で来るため `!= null` で判定する（通過駅を数えない）。
 * tripClass が不明（undefined）な場合は安全側として主要駅の根拠にする。
 */
export function determineMajorStations(
    tripBlocks: readonly TripBlockDetailsDto[],
    axisStationIds: ReadonlySet<string>,
): ReadonlySet<string> {
    const majorStationIds = new Set<string>();

    for (const block of tripBlocks) {
        for (const trip of block.trips ?? []) {
            const className = trip.tripClass?.tripClassName ?? '';
            if (NON_MAJOR_CLASS_PREFIXES.some((p) => className.startsWith(p))) {
                continue;
            }
            for (const time of trip.times ?? []) {
                if (
                    time.stationId != null &&
                    axisStationIds.has(time.stationId) &&
                    (time.arrivalTime != null || time.departureTime != null)
                ) {
                    majorStationIds.add(time.stationId);
                }
            }
        }
    }

    return majorStationIds;
}
```

- [ ] **Step 4: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/utils/determine-major-stations.util.spec.ts`
Expected: 全件 PASS（既存 5 件＋追加 3 件）

- [ ] **Step 5: 整形してコミット**

```bash
npx prettier --write src/app/pages/train-location/utils/determine-major-stations.util.ts
npx prettier --write src/app/pages/train-location/utils/determine-major-stations.util.spec.ts
git add src/app/pages/train-location/utils/determine-major-stations.util.ts src/app/pages/train-location/utils/determine-major-stations.util.spec.ts
git commit -F <メッセージファイル>   # fix: :bug: 列車位置情報の主要駅が全駅になるのを直す
```

---

### Task 2: 次に来る列車を作る純関数

**Files:**
- Modify: `src/app/shared/train-position.util.ts`（export の追加のみ）
- Create: `src/app/pages/train-location/interfaces/station-arrival.interface.ts`
- Create: `src/app/pages/train-location/utils/build-station-arrivals.util.ts`
- Test: `src/app/pages/train-location/utils/build-station-arrivals.util.spec.ts`

**Interfaces:**
- Consumes: `TrainPosition`（`shared/train-position.util.ts`）、`TrainLocationCard`（`interfaces/train-location-card.interface.ts`）、`baseTripClassName`（`shared/trip-class-base-name.util.ts`）、`getRailwayDate`（`core/utils/railway-day.ts`）
- Produces:
  - `shared/train-position.util.ts` から `export function resolveArrival(base: Date, time: TimeDetailsDto): Date | undefined` と `export function resolveDeparture(base: Date, time: TimeDetailsDto): Date | undefined`
  - `StationArrival` 型と `StationArrivals = { inbound: StationArrival[]; outbound: StationArrival[] }`
  - `buildStationArrivals(input: BuildStationArrivalsInput): StationArrivals`
  - `STATION_ARRIVALS_LIMIT = 6`

- [ ] **Step 1: shared の関数を export する**

`src/app/shared/train-position.util.ts` の `function resolveArrival(` と `function resolveDeparture(` の前に `export ` を付ける（中身は変えない）。

Run: `npx jest --testPathPattern=src/app/shared/train-position.util.spec.ts`
Expected: PASS（挙動不変）

- [ ] **Step 2: 型を作る** — `interfaces/station-arrival.interface.ts`

```ts
/** 駅の欄の 1 行（選んだ駅に次に来る列車 1 本） */
export interface StationArrival {
    tripId: string;
    direction: 'inbound' | 'outbound';
    /** 選んだ駅の時刻。停車は着（無ければ発）、通過は前後の停車駅から按分した推定 */
    time: Date;
    /** time までの分（切り上げ前の実数）。停車中は 0 */
    minutesUntil: number;
    /** 選んだ駅を通過する（時刻は推定。表示に「頃」を付ける） */
    isPassing: boolean;
    /** 選んだ駅が終点（当駅止まり） */
    isTerminal: boolean;
    /** いま選んだ駅に停車中（着 <= at < 発） */
    isStopped: boolean;
    tripNumber: string;
    /** ベース種別名（系統サフィックス除去済み） */
    tripClassName: string;
    tripClassColor: string;
    destinationName: string;
    operationNumber?: string;
    /** いまどこか（「いま 瀬谷→三ツ境」「いま 鶴ヶ峰に停車中」「海老名 10:02 発」） */
    whereText: string;
}

export interface StationArrivals {
    inbound: StationArrival[];
    outbound: StationArrival[];
}
```

- [ ] **Step 3: 失敗するテストを書く** — `utils/build-station-arrivals.util.spec.ts`

```ts
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import { buildStationArrivals } from './build-station-arrivals.util';

const NULL = null as unknown as string;

function time(o: Partial<TimeDetailsDto>): TimeDetailsDto {
    return { arrivalTime: NULL, departureTime: NULL, ...o } as TimeDetailsDto;
}

function trip(
    tripId: string,
    direction: 0 | 1,
    times: TimeDetailsDto[],
    className = '各停（SO）',
): TripDetailsDto {
    return {
        tripId,
        tripNumber: `N${tripId}`,
        tripDirection: direction,
        tripClass: { tripClassName: className, tripClassColor: '#111111' },
        times,
    } as unknown as TripDetailsDto;
}

function blocks(...trips: TripDetailsDto[]): TripBlockDetailsDto[] {
    return trips.map((t) => ({ tripBlockId: `b${t.tripId}`, trips: [t] }) as TripBlockDetailsDto);
}

const NAMES = new Map([
    ['A', '横浜'],
    ['B', '星川'],
    ['C', '二俣川'],
    ['D', '海老名'],
]);

function run(
    tripBlocks: TripBlockDetailsDto[],
    at: Date,
    options: {
        stationId?: string;
        positions?: TrainPosition[];
        cards?: Map<string, TrainLocationCard>;
        limit?: number;
    } = {},
) {
    return buildStationArrivals({
        tripBlocks,
        stationId: options.stationId ?? 'C',
        at,
        positions: options.positions ?? [],
        cardsById: options.cards ?? new Map(),
        stationNameById: NAMES,
        limit: options.limit ?? 6,
    });
}

// 2026-09-26 10:00（営業日当日）
const AT = new Date(2026, 8, 26, 10, 0, 0);

describe('buildStationArrivals', () => {
    it('停車する列車は着時刻（無ければ発時刻）で、あと何分を出す', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '09:50:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:04:00', departureTime: '10:05:00' }),
            time({ stationId: 'D', stopSequence: 4, arrivalTime: '10:20:00' }),
        ]);

        const result = run(blocks(t), AT);

        expect(result.outbound).toHaveLength(1);
        expect(result.outbound[0].minutesUntil).toBe(4);
        expect(result.outbound[0].isPassing).toBe(false);
        expect(result.outbound[0].isTerminal).toBe(false);
        expect(result.inbound).toHaveLength(0);
    });

    it('通過する列車は前後の停車駅の時刻を停車順の比で按分し isPassing にする', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '10:00:00' }),
            time({ stationId: 'B', stopSequence: 2 }),
            time({ stationId: 'C', stopSequence: 3 }),
            time({ stationId: 'D', stopSequence: 4, arrivalTime: '10:30:00' }),
        ], '特急（SO）');

        const [row] = run(blocks(t), AT).outbound;

        expect(row.isPassing).toBe(true);
        // 10:00 + 30 分 × (3-1)/(4-1) = 10:20
        expect(row.minutesUntil).toBe(20);
    });

    it('選んだ駅が終点なら isTerminal', () => {
        const t = trip('1', 0, [
            time({ stationId: 'D', stopSequence: 1, departureTime: '09:50:00' }),
            time({ stationId: 'C', stopSequence: 2, arrivalTime: '10:10:00' }),
        ]);

        const [row] = run(blocks(t), AT).inbound;

        expect(row.isTerminal).toBe(true);
    });

    it('いま停車中（着 <= at < 発）の列車は isStopped で 0 分', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '09:40:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '09:59:00', departureTime: '10:01:00' }),
            time({ stationId: 'D', stopSequence: 4, arrivalTime: '10:20:00' }),
        ]);

        const [row] = run(blocks(t), AT).outbound;

        expect(row.isStopped).toBe(true);
        expect(row.minutesUntil).toBe(0);
    });

    it('もう出た列車は出さない', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '09:40:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '09:55:00', departureTime: '09:56:00' }),
        ]);

        expect(run(blocks(t), AT).outbound).toHaveLength(0);
    });

    it('24 時を越える列車（days = 2）は翌日の時刻として扱う', () => {
        const late = new Date(2026, 8, 27, 0, 10, 0); // 営業日 9/26 の 24:10
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureDays: 2, departureTime: '00:05:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalDays: 2, arrivalTime: '00:25:00' }),
        ]);

        const [row] = run(blocks(t), late).outbound;

        expect(row.minutesUntil).toBe(15);
    });

    it('時刻の早い順に方向ごと limit 本まで', () => {
        const make = (id: string, hhmm: string) =>
            trip(id, 1, [
                time({ stationId: 'A', stopSequence: 1, departureTime: '09:59:00' }),
                time({ stationId: 'C', stopSequence: 3, arrivalTime: `${hhmm}:00` }),
                time({ stationId: 'D', stopSequence: 4, arrivalTime: '11:30:00' }),
            ]);

        const result = run(
            blocks(make('3', '10:30'), make('1', '10:10'), make('2', '10:20')),
            AT,
            { limit: 2 },
        );

        expect(result.outbound.map((r) => r.tripId)).toEqual(['1', '2']);
    });

    it('いまどこか: 在線中は位置、まだ出ていない列車は始発駅と発時刻', () => {
        const running = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '09:55:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:10:00' }),
        ]);
        const waiting = trip('2', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '10:02:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);
        const positions: TrainPosition[] = [
            { type: 'between', tripId: '1', fromStationId: 'A', toStationId: 'B', progress: 0.5 },
        ];

        const result = run(blocks(running, waiting), AT, { positions });

        expect(result.outbound[0].whereText).toBe('いま 横浜→星川');
        expect(result.outbound[1].whereText).toBe('横浜 10:02 発');
    });

    it('いまどこか: 停車中の位置は「に停車中」', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '09:50:00' }),
            time({ stationId: 'B', stopSequence: 2, arrivalTime: '09:59:00', departureTime: '10:01:00' }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:08:00' }),
        ]);
        const positions: TrainPosition[] = [{ type: 'stopped', tripId: '1', stationId: 'B' }];

        const [row] = run(blocks(t), AT, { positions }).outbound;

        expect(row.whereText).toBe('いま 星川に停車中');
    });

    it('行先・運用・種別はカードから引き、無ければ trip から組み立てる', () => {
        const t = trip('1', 0, [
            time({ stationId: 'D', stopSequence: 1, departureTime: '09:55:00' }),
            time({ stationId: 'C', stopSequence: 2, arrivalTime: '10:05:00' }),
            time({ stationId: 'A', stopSequence: 4, arrivalTime: '10:30:00' }),
        ], '快速（SO）');
        const card: TrainLocationCard = {
            tripId: '1',
            tripNumber: '2026',
            tripClassName: '快速',
            tripClassColor: '#3f51b5',
            operationNumber: '62',
            destinationName: '横浜',
            direction: 'inbound',
            detailLink: ['/timetable', 'all-line', {}],
        };

        const withCard = run(blocks(t), AT, { cards: new Map([['1', card]]) }).inbound[0];
        const withoutCard = run(blocks(t), AT).inbound[0];

        expect(withCard).toMatchObject({
            tripNumber: '2026',
            tripClassName: '快速',
            destinationName: '横浜',
            operationNumber: '62',
        });
        expect(withoutCard).toMatchObject({
            tripNumber: 'N1',
            tripClassName: '快速',
            destinationName: '横浜',
        });
    });

    it('選んだ駅を通らない列車・該当 0 本は空配列', () => {
        const t = trip('1', 1, [
            time({ stationId: 'A', stopSequence: 1, departureTime: '10:10:00' }),
            time({ stationId: 'B', stopSequence: 2, arrivalTime: '10:20:00' }),
        ]);

        expect(run(blocks(t), AT)).toEqual({ inbound: [], outbound: [] });
    });
});
```

- [ ] **Step 4: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/utils/build-station-arrivals.util.spec.ts`
Expected: FAIL（`Cannot find module './build-station-arrivals.util'`）

- [ ] **Step 5: 実装する** — `utils/build-station-arrivals.util.ts`

```ts
import { format } from 'date-fns';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    TrainPosition,
    resolveArrival,
    resolveDeparture,
} from 'src/app/shared/train-position.util';
import { baseTripClassName } from 'src/app/shared/trip-class-base-name.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import {
    StationArrival,
    StationArrivals,
} from '../interfaces/station-arrival.interface';

/** 駅の欄に方向ごとに出す本数（spec: 各方向 6 本まで） */
export const STATION_ARRIVALS_LIMIT = 6;

export interface BuildStationArrivalsInput {
    tripBlocks: readonly TripBlockDetailsDto[];
    stationId: string;
    at: Date;
    positions: readonly TrainPosition[];
    cardsById: ReadonlyMap<string, TrainLocationCard>;
    /** 全駅の stationId → 駅名（始発駅・位置の駅名に使う） */
    stationNameById: ReadonlyMap<string, string>;
    limit: number;
}

function hasTime(time: TimeDetailsDto): boolean {
    return time.arrivalTime != null || time.departureTime != null;
}

/**
 * 選んだ駅の時刻を求める。停車は着（無ければ発）、通過は前後の停車点の時刻を
 * stopSequence の比で按分する（駅間距離のデータが無いため）。求まらなければ undefined。
 */
function resolveStationTime(
    times: readonly TimeDetailsDto[],
    index: number,
    base: Date,
): { time: Date; departure?: Date; isPassing: boolean } | undefined {
    const target = times[index];
    if (hasTime(target)) {
        const time = resolveArrival(base, target);
        return time
            ? { time, departure: resolveDeparture(base, target), isPassing: false }
            : undefined;
    }

    let prev = index - 1;
    while (prev >= 0 && !hasTime(times[prev])) prev--;
    let next = index + 1;
    while (next < times.length && !hasTime(times[next])) next++;
    if (prev < 0 || next >= times.length) {
        return undefined;
    }

    const from = resolveDeparture(base, times[prev]);
    const to = resolveArrival(base, times[next]);
    const seqFrom = times[prev].stopSequence ?? prev;
    const seqTo = times[next].stopSequence ?? next;
    const seq = target.stopSequence ?? index;
    if (!from || !to || seqTo === seqFrom) {
        return undefined;
    }
    const ratio = (seq - seqFrom) / (seqTo - seqFrom);
    return {
        time: new Date(from.getTime() + (to.getTime() - from.getTime()) * ratio),
        isPassing: true,
    };
}

function buildWhereText(
    position: TrainPosition | undefined,
    times: readonly TimeDetailsDto[],
    base: Date,
    names: ReadonlyMap<string, string>,
): string {
    const name = (id: string | undefined) => (id ? (names.get(id) ?? '') : '');
    if (position?.type === 'stopped') {
        return `いま ${name(position.stationId)}に停車中`;
    }
    if (position?.type === 'between') {
        return `いま ${name(position.fromStationId)}→${name(position.toStationId)}`;
    }
    const origin = times.find(hasTime);
    const departure = origin ? resolveDeparture(base, origin) : undefined;
    return origin && departure
        ? `${name(origin.stationId)} ${format(departure, 'HH:mm')} 発`
        : '';
}

function buildArrival(
    trip: TripDetailsDto,
    times: readonly TimeDetailsDto[],
    index: number,
    input: BuildStationArrivalsInput,
    base: Date,
    positionByTripId: ReadonlyMap<string, TrainPosition>,
): StationArrival | undefined {
    const resolved = resolveStationTime(times, index, base);
    if (!resolved || !trip.tripId) {
        return undefined;
    }
    const { time, departure, isPassing } = resolved;
    const isStopped =
        !isPassing && time <= input.at && departure !== undefined && input.at < departure;
    if (time < input.at && !isStopped) {
        return undefined;
    }

    const card = input.cardsById.get(trip.tripId);
    const lastStop = [...times].reverse().find(hasTime);
    return {
        tripId: trip.tripId,
        direction:
            trip.tripDirection === ETripDirection.INBOUND ? 'inbound' : 'outbound',
        time,
        minutesUntil: isStopped ? 0 : (time.getTime() - input.at.getTime()) / 60000,
        isPassing,
        isTerminal: !isPassing && index === times.indexOf(lastStop as TimeDetailsDto),
        isStopped,
        tripNumber: card?.tripNumber ?? trip.tripNumber ?? '',
        tripClassName:
            card?.tripClassName ?? baseTripClassName(trip.tripClass?.tripClassName),
        tripClassColor:
            card?.tripClassColor ?? trip.tripClass?.tripClassColor ?? '#8a8a8a',
        destinationName:
            card?.destinationName ??
            (lastStop?.stationId ? (input.stationNameById.get(lastStop.stationId) ?? '') : ''),
        operationNumber:
            card?.operationNumber ??
            trip.tripOperationLists?.[0]?.operation?.operationNumber,
        whereText: buildWhereText(
            positionByTripId.get(trip.tripId),
            times,
            base,
            input.stationNameById,
        ),
    };
}

/**
 * 選んだ駅に次に来る列車を、上り・下りそれぞれ時刻の早い順に limit 本まで返す純関数。
 * 通過・回送も含める。時刻の解釈（null・1 始まりの days・営業日）は
 * `estimatePositions` と同じ `resolveArrival` / `resolveDeparture` に従う。
 */
export function buildStationArrivals(input: BuildStationArrivalsInput): StationArrivals {
    const base = getRailwayDate(input.at);
    const positionByTripId = new Map(input.positions.map((p) => [p.tripId, p]));
    const all: StationArrival[] = [];

    for (const block of input.tripBlocks) {
        for (const trip of block.trips ?? []) {
            const times = [...(trip.times ?? [])].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            const index = times.findIndex((t) => t.stationId === input.stationId);
            if (index < 0) {
                continue;
            }
            const arrival = buildArrival(trip, times, index, input, base, positionByTripId);
            if (arrival) {
                all.push(arrival);
            }
        }
    }

    all.sort((a, b) => a.time.getTime() - b.time.getTime());
    return {
        inbound: all.filter((a) => a.direction === 'inbound').slice(0, input.limit),
        outbound: all.filter((a) => a.direction === 'outbound').slice(0, input.limit),
    };
}
```

- [ ] **Step 6: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/utils/build-station-arrivals.util.spec.ts`
Expected: 11 件 PASS

Run: `npx jest --testPathPattern=src/app/shared/train-position.util.spec.ts`
Expected: PASS

- [ ] **Step 7: 整形してコミット**（4 ファイルを 1 つずつ `npx prettier --write`）

```bash
git add src/app/shared/train-position.util.ts src/app/pages/train-location/interfaces/station-arrival.interface.ts src/app/pages/train-location/utils/build-station-arrivals.util.ts src/app/pages/train-location/utils/build-station-arrivals.util.spec.ts
git commit -F <メッセージファイル>   # feat: :sparkles: 選んだ駅に次に来る列車を求める
```

---

### Task 3: 前回の駅と欄の開閉を覚える

**Files:**
- Create: `src/app/pages/train-location/utils/train-location-storage.util.ts`
- Test: `src/app/pages/train-location/utils/train-location-storage.util.spec.ts`

**Interfaces:**
- Produces:
  - `readRememberedStationId(routeId: string): string | null`
  - `writeRememberedStationId(routeId: string, stationId: string): void`
  - `readStationPanelOpen(): boolean`（既定 true）
  - `writeStationPanelOpen(open: boolean): void`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import {
    readRememberedStationId,
    readStationPanelOpen,
    writeRememberedStationId,
    writeStationPanelOpen,
} from './train-location-storage.util';

describe('train-location-storage', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    it('前回の駅を路線ごとに覚える', () => {
        writeRememberedStationId('r1', 's1');
        writeRememberedStationId('r2', 's2');

        expect(readRememberedStationId('r1')).toBe('s1');
        expect(readRememberedStationId('r2')).toBe('s2');
        expect(readRememberedStationId('r3')).toBeNull();
    });

    it('欄の開閉を覚える（既定は開いている）', () => {
        expect(readStationPanelOpen()).toBe(true);
        writeStationPanelOpen(false);
        expect(readStationPanelOpen()).toBe(false);
    });

    it('localStorage が例外を投げても既定値で動く', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });

        expect(() => writeRememberedStationId('r1', 's1')).not.toThrow();
        expect(readRememberedStationId('r1')).toBeNull();
        expect(() => writeStationPanelOpen(false)).not.toThrow();
        expect(readStationPanelOpen()).toBe(true);
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/utils/train-location-storage.util.spec.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

```ts
/**
 * 列車位置情報の端末ごとの覚え書き（前回選んだ駅・スマホの駅の欄の開閉）。
 * 読めない環境（プライベートウィンドウ等）でも既定値で動くよう、すべて try/catch で包む。
 */
const STATION_KEY_PREFIX = 'train-location:station:';
const PANEL_OPEN_KEY = 'train-location:panel-open';

export function readRememberedStationId(routeId: string): string | null {
    try {
        return localStorage.getItem(STATION_KEY_PREFIX + routeId);
    } catch {
        return null;
    }
}

export function writeRememberedStationId(routeId: string, stationId: string): void {
    try {
        localStorage.setItem(STATION_KEY_PREFIX + routeId, stationId);
    } catch {
        // 覚えられなくても選択自体は URL で保たれる
    }
}

export function readStationPanelOpen(): boolean {
    try {
        return localStorage.getItem(PANEL_OPEN_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function writeStationPanelOpen(open: boolean): void {
    try {
        localStorage.setItem(PANEL_OPEN_KEY, String(open));
    } catch {
        // 覚えられなくても開閉自体は動く
    }
}
```

- [ ] **Step 4: 通ることを確かめる**（同じコマンドで 3 件 PASS）

- [ ] **Step 5: 整形してコミット** — `feat: :sparkles: 列車位置情報で前回の駅を覚える`

---

### Task 4: 駅の欄の部品

**Files:**
- Create: `src/app/pages/train-location/components/train-location-station-panel/train-location-station-panel.component.ts`
- Create: `.../train-location-station-panel.component.html`
- Test: `.../train-location-station-panel.component.spec.ts`

**Interfaces:**
- Consumes: `StationArrivals`・`StationArrival`（Task 2）、`readStationPanelOpen` / `writeStationPanelOpen`（Task 3）、`TrainLocationInterchangeRoute`（`interfaces/train-location-row.interface.ts`）、`TripClassChipComponent`（`shared/trip-class-chip/trip-class-chip.component`、`size="sm"`・`[label]`・`[color]`）
- Produces: `<app-train-location-station-panel [stationId] [stationName] [interchangeRoutes] [arrivals] [inboundLabel] [outboundLabel]>`
  - `stationId: string | null`、`stationName: string`、`interchangeRoutes: TrainLocationInterchangeRoute[]`、`arrivals: StationArrivals`、`inboundLabel: string`（例 `横浜方面`）、`outboundLabel: string`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StationArrival } from '../../interfaces/station-arrival.interface';
import { TrainLocationStationPanelComponent } from './train-location-station-panel.component';

function arrival(o: Partial<StationArrival>): StationArrival {
    return {
        tripId: 't',
        direction: 'inbound',
        time: new Date(2026, 8, 26, 10, 4),
        minutesUntil: 4.1,
        isPassing: false,
        isTerminal: false,
        isStopped: false,
        tripNumber: '7560',
        tripClassName: '各停',
        tripClassColor: '#40c4ff',
        destinationName: '赤羽岩淵',
        operationNumber: '30K',
        whereText: '海老名 10:02 発',
        ...o,
    };
}

describe('TrainLocationStationPanelComponent', () => {
    let fixture: ComponentFixture<TrainLocationStationPanelComponent>;
    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            imports: [TrainLocationStationPanelComponent],
            providers: [provideRouter([])],
        });
        fixture = TestBed.createComponent(TrainLocationStationPanelComponent);
        fixture.componentRef.setInput('inboundLabel', '横浜方面');
        fixture.componentRef.setInput('outboundLabel', '海老名方面');
    });

    it('駅が未選択なら案内だけ出す', () => {
        fixture.componentRef.setInput('stationId', null);
        fixture.detectChanges();

        expect(el().textContent).toContain('図の駅名を押して駅を選ぶ');
    });

    it('上り・下りの見出しと行（あと何分・時刻・行先・列番・運用・いまどこか）を出す', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [arrival({})],
            outbound: [],
        });
        fixture.detectChanges();

        const text = el().textContent ?? '';
        expect(text).toContain('二俣川');
        expect(text).toContain('上り（横浜方面）');
        expect(text).toContain('下り（海老名方面）');
        expect(text).toContain('4分');
        expect(text).toContain('10:04');
        expect(text).toContain('赤羽岩淵 行');
        expect(text).toContain('7560');
        expect(text).toContain('運用30K');
        expect(text).toContain('海老名 10:02 発');
        expect(text).toContain('この先の列車はありません');
    });

    it('通過は「通過」と時刻に「頃」、終点は「当駅止まり」、停車中は「停車中」、1 分未満は「まもなく」', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('arrivals', {
            inbound: [
                arrival({ tripId: 'p', isPassing: true, minutesUntil: 3 }),
                arrival({ tripId: 'e', isTerminal: true, minutesUntil: 5 }),
            ],
            outbound: [
                arrival({ tripId: 's', direction: 'outbound', isStopped: true, minutesUntil: 0 }),
                arrival({ tripId: 'm', direction: 'outbound', minutesUntil: 0.5 }),
            ],
        });
        fixture.detectChanges();

        const text = el().textContent ?? '';
        expect(text).toContain('通過');
        expect(text).toContain('10:04頃');
        expect(text).toContain('当駅止まり');
        expect(text).toContain('停車中');
        expect(text).toContain('まもなく');
    });

    it('乗換路線のチップは同じ駅を選んだ状態のリンクにする', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.componentRef.setInput('interchangeRoutes', [
            { routeId: 'izumino', routeName: 'いずみ野線' },
        ]);
        fixture.detectChanges();

        const link = el().querySelector('a[href*="izumino"]') as HTMLAnchorElement;
        expect(link.textContent).toContain('いずみ野線');
        expect(link.getAttribute('href')).toContain('station_id=C');
    });

    it('開閉ボタンで本文を畳み、状態を覚える', () => {
        fixture.componentRef.setInput('stationId', 'C');
        fixture.componentRef.setInput('stationName', '二俣川');
        fixture.detectChanges();

        const toggle = el().querySelector('button[aria-expanded]') as HTMLButtonElement;
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(localStorage.getItem('train-location:panel-open')).toBe('false');
    });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/components/train-location-station-panel`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する（ts）**

```ts
import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import {
    StationArrival,
    StationArrivals,
} from '../../interfaces/station-arrival.interface';
import { TrainLocationInterchangeRoute } from '../../interfaces/train-location-row.interface';
import {
    readStationPanelOpen,
    writeStationPanelOpen,
} from '../../utils/train-location-storage.util';

/**
 * 駅の欄: 選んだ駅に次に来る列車を上り・下りに分けて出す（spec「駅の欄」）。
 * PC（lg 以上）は常に開き、スマホは見出しのボタンで畳める（開閉は端末に覚える）。
 */
@Component({
    selector: 'app-train-location-station-panel',
    templateUrl: './train-location-station-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TripClassChipComponent],
    host: { class: 'tw-block' },
})
export class TrainLocationStationPanelComponent {
    readonly stationId = input<string | null>(null);
    readonly stationName = input<string>('');
    readonly interchangeRoutes = input<TrainLocationInterchangeRoute[]>([]);
    readonly arrivals = input<StationArrivals>({ inbound: [], outbound: [] });
    readonly inboundLabel = input<string>('');
    readonly outboundLabel = input<string>('');

    readonly isOpen = signal(readStationPanelOpen());

    toggle(): void {
        const next = !this.isOpen();
        this.isOpen.set(next);
        writeStationPanelOpen(next);
    }

    minutesLabel(arrival: StationArrival): string {
        if (arrival.isStopped) return '停車中';
        if (arrival.minutesUntil < 1) return 'まもなく';
        return `${Math.floor(arrival.minutesUntil)}分`;
    }

    timeLabel(arrival: StationArrival): string {
        return format(arrival.time, 'HH:mm') + (arrival.isPassing ? '頃' : '');
    }

    /** あと 2 分以内（停車中を含む）の行は淡い accent の地にする */
    isImminent(arrival: StationArrival): boolean {
        return arrival.minutesUntil <= 2;
    }
}
```

- [ ] **Step 4: 実装する（html）**

```html
<section class="tw-overflow-hidden tw-rounded-card tw-bg-white">
    <header
        class="tw-flex tw-flex-wrap tw-items-baseline tw-gap-x-3 tw-gap-y-1 tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-px-4 tw-py-3"
    >
        @if (stationId()) {
            <h2 class="tw-m-0 tw-text-xl tw-font-bold tw-text-ink">
                {{ stationName() }}
            </h2>
            @for (route of interchangeRoutes(); track route.routeId) {
                <a
                    [routerLink]="[
                        '/train-location',
                        { route_id: route.routeId, station_id: stationId() }
                    ]"
                    class="tw-rounded-full tw-bg-paper-3 tw-px-2 tw-py-0.5 tw-text-xs tw-text-ink tw-no-underline"
                    >{{ route.routeName }}</a
                >
            }
            <span class="tw-text-xs tw-text-muted"
                >に次に来る列車（ダイヤ通り）</span
            >
        } @else {
            <span class="tw-text-sm tw-text-muted"
                >図の駅名を押して駅を選ぶ</span
            >
        }
        <span class="tw-flex-1"></span>
        <button
            type="button"
            class="tw-cursor-pointer tw-border-0 tw-bg-transparent tw-p-1 tw-font-[inherit] tw-text-xs tw-text-muted lg:tw-hidden"
            [attr.aria-expanded]="isOpen()"
            (click)="toggle()"
        >
            {{ isOpen() ? '畳む ▴' : '開く ▾' }}
        </button>
    </header>

    @if (stationId()) {
        <div [class.tw-hidden]="!isOpen()" class="lg:tw-block">
            <ng-container
                *ngTemplateOutlet="
                    directionBlock;
                    context: {
                        label: '▲ 上り（' + inboundLabel() + '）',
                        rows: arrivals().inbound,
                    }
                "
            ></ng-container>
            <ng-container
                *ngTemplateOutlet="
                    directionBlock;
                    context: {
                        label: '▼ 下り（' + outboundLabel() + '）',
                        rows: arrivals().outbound,
                    }
                "
            ></ng-container>
        </div>
    }
</section>

<ng-template #directionBlock let-label="label" let-rows="rows">
    <h3 class="tw-m-0 tw-px-4 tw-pb-1 tw-pt-3 tw-text-xs tw-font-bold tw-text-ink-2">
        {{ label }}
    </h3>
    @for (row of rows; track row.tripId) {
        <div
            class="tw-grid tw-grid-cols-[4rem_3.5rem_auto_minmax(0,1fr)] tw-items-center tw-gap-x-2 tw-border-0 tw-border-t tw-border-solid tw-border-rule tw-px-4 tw-py-2 tw-text-sm sm:tw-grid-cols-[4rem_3.5rem_auto_minmax(0,1fr)_auto]"
            [class.tw-bg-accent-50]="isImminent(row)"
        >
            <span class="tw-text-right tw-text-lg tw-font-bold tw-tabular-nums tw-text-ink">{{ minutesLabel(row) }}</span>
            <span class="tw-font-mono tw-tabular-nums tw-text-ink-2">{{ timeLabel(row) }}</span>
            <app-trip-class-chip
                size="sm"
                [label]="row.tripClassName"
                [color]="row.tripClassColor"
            ></app-trip-class-chip>
            <span class="tw-min-w-0 tw-truncate">
                <b class="tw-text-ink">{{ row.destinationName }} 行</b>
                @if (row.isPassing) {
                    <span class="tw-ml-1 tw-text-xs tw-font-bold tw-text-accent-deep">通過</span>
                }
                @if (row.isTerminal) {
                    <span class="tw-ml-1 tw-text-xs tw-font-bold tw-text-structure">当駅止まり</span>
                }
                <span class="tw-ml-1 tw-text-xs tw-text-muted"
                    >{{ row.tripNumber }}@if (row.operationNumber) {・運用{{ row.operationNumber }}}</span
                >
            </span>
            <span class="tw-col-span-4 tw-text-xs tw-text-muted sm:tw-col-span-1 sm:tw-text-right">{{ row.whereText }}</span>
        </div>
    } @empty {
        <p class="tw-m-0 tw-border-0 tw-border-t tw-border-solid tw-border-rule tw-px-4 tw-py-3 tw-text-sm tw-text-muted">
            この先の列車はありません
        </p>
    }
</ng-template>
```

`ngTemplateOutlet` を使うので ts の `imports` に `NgTemplateOutlet`（`@angular/common`）を足す。

- [ ] **Step 5: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/components/train-location-station-panel`
Expected: 5 件 PASS

- [ ] **Step 6: 整形してコミット** — `feat: :sparkles: 列車位置情報に駅の欄を作る`

注意: prettier は SVG の字を壊すことがあるが、この部品は HTML のみなので `npx prettier --write` を ts・html・spec それぞれにかけてよい。整形後にもう一度テストを流す。

---

### Task 5: 図の駅を札にして押せるようにする

**Files:**
- Modify: `src/app/pages/train-location/components/train-location-line/train-location-line.component.ts`
- Modify: `.../train-location-line.component.html`
- Modify: `src/app/pages/train-location/components/train-location-card/train-location-card.component.html`
- Test: `.../train-location-line.component.spec.ts`、`.../train-location-card.component.spec.ts`

**Interfaces:**
- Consumes: `TrainLocationRow`、`resolveBetweenRowLayout(left, right, baseHeightPx)`（既存）
- Produces: `<app-train-location-line [rows] [selectedStationId] (stationSelect)>`
  - `selectedStationId: string | null`（input、既定 null）
  - `stationSelect: OutputEmitterRef<string>`（押した駅の stationId）
  - `EMPTY_BETWEEN_ROW_HEIGHT_PX = 30`（export）

- [ ] **Step 1: spec を書き換える**

`train-location-line.component.spec.ts` から次の 4 件を削除する（吹き出しを廃止するため）:
「同一駅に上り2本停車中の場合「2本停車中」バッジを表示し…」「展開しても駅名セル…」「再タップでオーバーレイを畳む」「停車が1本のみの場合はバッジを出さず…」。
「乗換路線がある駅には他路線への routerLink チップを表示する」は href に `station_id=<その駅>` を含むことも確かめるよう書き換える。
次のテストを足す（既存 spec の行ビルダー・`fixture` の作り方に合わせる。`station()` 行と `card()` の作り方は既存 spec の先頭にあるものを使う）:

```ts
    it('同じ駅・同じ向きに複数停車していても、吹き出しに畳まず全部のカードを並べる', () => {
        setRows([stationRow({ stationId: 's1', leftCards: [card('a'), card('b'), card('c')] })]);

        expect(el().querySelectorAll('app-train-location-card')).toHaveLength(3);
        expect(el().textContent).not.toContain('本停車中');
    });

    it('駅の札を押すと stationSelect に stationId を出す', () => {
        setRows([stationRow({ stationId: 's1', stationName: '二俣川' })]);
        const emitted: string[] = [];
        fixture.componentInstance.stationSelect.subscribe((id) => emitted.push(id));

        (el().querySelector('button[data-station-id="s1"]') as HTMLButtonElement).click();

        expect(emitted).toEqual(['s1']);
    });

    it('選択中の駅の札は aria-pressed="true"', () => {
        fixture.componentRef.setInput('selectedStationId', 's1');
        setRows([stationRow({ stationId: 's1' }), stationRow({ stationId: 's2' })]);

        expect(el().querySelector('[data-station-id="s1"]')?.getAttribute('aria-pressed')).toBe('true');
        expect(el().querySelector('[data-station-id="s2"]')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('在線の無い駅間は 30px', () => {
        setRows([
            stationRow({ stationId: 's1' }),
            { kind: 'between', fromStationId: 's1', toStationId: 's2', leftCards: [], rightCards: [] },
            stationRow({ stationId: 's2' }),
        ]);

        const between = el().querySelector('[data-between]') as HTMLElement;
        expect(between.style.height).toBe('30px');
    });
```

既存 spec にヘルパーが無い場合は spec の先頭に次を足す:

```ts
function setRows(rows: TrainLocationRow[]): void {
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
}
function stationRow(o: Partial<TrainLocationStationRow>): TrainLocationStationRow {
    return {
        kind: 'station',
        stationId: 's',
        stationName: '駅',
        isMajor: false,
        leftCards: [],
        rightCards: [],
        interchangeRoutes: [],
        ...o,
    };
}
```

`train-location-card.component.spec.ts` に足す:

```ts
    it('影ではなく細い縁で面を分ける（面の掟）', () => {
        const link = fixture.nativeElement.querySelector('a') as HTMLElement;
        expect(link.className).not.toContain('tw-shadow');
        expect(link.className).toContain('tw-border-solid');
    });
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/components/train-location-(line|card)`
Expected: 追加分が FAIL

- [ ] **Step 3: ts を書き換える**

`OverlayModule`・`ConnectedPosition`・`#expandedKeys`・`leftOverlayPositions`・`rightOverlayPositions`・`toggleExpand`・`closeExpand`・`onOverlayKeydown`・`isExpanded`・`signal` の import を削除する。クラスの JSDoc の吹き出しの段落を「同一駅に複数停車していても全カードを縦に並べる（情報を隠さない）」に書き換える。次を足す:

```ts
/** 在線の無い駅間の高さ（spec: 空は 30px。18 駅で約 1,300px） */
export const EMPTY_BETWEEN_ROW_HEIGHT_PX = 30;
```

```ts
    readonly selectedStationId = input<string | null>(null);
    readonly stationSelect = output<string>();
```

`#betweenLayouts` の `resolveBetweenRowLayout(row.leftCards, row.rightCards)` を `resolveBetweenRowLayout(row.leftCards, row.rightCards, EMPTY_BETWEEN_ROW_HEIGHT_PX)` にする。`output` を `@angular/core` から import する。

- [ ] **Step 4: html を書き換える**（ファイル全体を置き換え）

```html
<div class="tw-flex tw-flex-col tw-py-3">
    <div
        class="tw-mb-1 tw-flex tw-flex-row tw-justify-between tw-px-4 tw-text-xs tw-font-bold tw-text-ink-2"
    >
        <span>◀ 上り（{{ originStationName() }}方面）</span>
        <span>下り ▶</span>
    </div>

    @for (row of rows(); track rowKey(row)) {
        @if (row.kind === 'station') {
            <div class="tw-grid tw-grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] tw-items-center">
                <div class="tw-flex tw-flex-col tw-items-end tw-gap-1 tw-py-1 tw-pr-2">
                    @for (card of row.leftCards; track card.tripId) {
                        <app-train-location-card [card]="card" status="stopped"></app-train-location-card>
                    }
                </div>

                <div class="tw-relative tw-flex tw-h-full tw-min-h-7 tw-flex-col tw-items-center tw-justify-center tw-gap-1">
                    <span aria-hidden="true" class="tw-absolute tw-inset-y-0 tw-left-1/2 tw-w-[3px] -tw-translate-x-1/2 tw-bg-structure"></span>
                    <button
                        type="button"
                        class="tw-relative tw-cursor-pointer tw-whitespace-nowrap tw-rounded-full tw-border-2 tw-border-solid tw-border-structure tw-px-2 tw-py-px tw-font-[inherit] tw-text-xs"
                        [attr.data-station-id]="row.stationId"
                        [attr.aria-pressed]="row.stationId === selectedStationId()"
                        [class.tw-font-bold]="row.isMajor"
                        [class.tw-bg-white]="row.stationId !== selectedStationId()"
                        [class.tw-text-ink]="row.stationId !== selectedStationId()"
                        [class.tw-bg-structure]="row.stationId === selectedStationId()"
                        [class.tw-text-paper]="row.stationId === selectedStationId()"
                        [style.outline]="row.stationId === selectedStationId() ? '3px solid var(--color-accent)' : null"
                        [style.outline-offset.px]="row.stationId === selectedStationId() ? 2 : null"
                        (click)="stationSelect.emit(row.stationId)"
                    >
                        {{ row.stationName }}
                    </button>
                    @for (interchange of row.interchangeRoutes; track interchange.routeId) {
                        <a
                            [routerLink]="[
                                '/train-location',
                                { route_id: interchange.routeId, station_id: row.stationId }
                            ]"
                            class="tw-relative tw-whitespace-nowrap tw-rounded-full tw-bg-paper-3 tw-px-2 tw-py-px tw-text-[10px] tw-text-ink tw-no-underline"
                            >{{ interchange.routeName }}</a
                        >
                    }
                </div>

                <div class="tw-flex tw-flex-col tw-items-start tw-gap-1 tw-py-1 tw-pl-2">
                    @for (card of row.rightCards; track card.tripId) {
                        <app-train-location-card [card]="card" status="stopped"></app-train-location-card>
                    }
                </div>
            </div>
        } @else {
            <!-- 駅間ゾーン: resolveBetweenRowLayout で衝突回避済みの px 位置を使う（98 G8）。
                 密集時は行自体を伸長する（heightPx）。 -->
            <div
                data-between
                class="tw-grid tw-grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]"
                [style.height.px]="betweenLayout(row).heightPx"
            >
                <div class="tw-relative">
                    @for (positioned of betweenLayout(row).left; track positioned.entry.card.tripId) {
                        <div class="tw-absolute tw-right-2" [style.top.px]="positioned.topPx">
                            <app-train-location-card [card]="positioned.entry.card" status="between"></app-train-location-card>
                        </div>
                    }
                </div>
                <div class="tw-flex tw-justify-center">
                    <span aria-hidden="true" class="tw-w-[3px] tw-bg-structure"></span>
                </div>
                <div class="tw-relative">
                    @for (positioned of betweenLayout(row).right; track positioned.entry.card.tripId) {
                        <div class="tw-absolute tw-left-2" [style.top.px]="positioned.topPx">
                            <app-train-location-card [card]="positioned.entry.card" status="between"></app-train-location-card>
                        </div>
                    }
                </div>
            </div>
        }
    }
</div>
```

選択中の輪は `[style.outline]` で書く（`tw-outline-[3px]` のように `[` を含むクラスは `[class.…]` バインディングで書けないため）。負の値は接頭辞の前に `-` を付ける（`-tw-translate-x-1/2`）。

- [ ] **Step 5: カードの影を縁に替える**

`train-location-card.component.html` の `<a>` の class から `tw-shadow` を消し、`tw-border tw-border-solid tw-border-rule` を足す。

- [ ] **Step 6: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/components/train-location-(line|card)`
Expected: 全件 PASS

- [ ] **Step 7: 整形してコミット** — `feat: :sparkles: 列車位置情報の図の駅を押せる札にする`

---

### Task 6: ページ本体を 2 列にし、時計を状態の行へ畳む

**Files:**
- Modify: `src/app/pages/train-location/stores/train-location.store.ts`（+ `train-location.store.spec.ts`）
- Modify: `src/app/pages/train-location/train-location.component.ts` / `.html`（+ `.spec.ts`）
- Modify: `src/app/pages/train-location/components/train-location-controller/train-location-controller.component.html`（+ spec）
- Delete: `src/app/pages/train-location/components/train-location-clock/*`（4 ファイル）

**Interfaces:**
- Consumes: Task 2〜5 の全部
- Produces: `TrainLocationStore.setSelectedStationId(id: string | null)`・`selectedStationId$`・`get selectedStationId`

- [ ] **Step 1: ストアのテストを書く**（`train-location.store.spec.ts` の既存 describe に足す）

```ts
    it('selectedStationId を保持する', () => {
        TrainLocationStore.setSelectedStationId('s1');
        expect(TrainLocationStore.selectedStationId).toBe('s1');
        TrainLocationStore.setSelectedStationId(null);
        expect(TrainLocationStore.selectedStationId).toBeNull();
    });
```

- [ ] **Step 2: ストアを実装する**

`StoreProps` に `selectedStationId: string | null;`、初期値に `selectedStationId: null,`、次を足す:

```ts
    setSelectedStationId(stationId: string | null): void {
        store.update(setProp('selectedStationId', () => stationId));
    },
    selectedStationId$: store.pipe(select((state) => state.selectedStationId)),
    get selectedStationId(): string | null {
        return store.getValue().selectedStationId;
    },
```

Run: `npx jest --testPathPattern=src/app/pages/train-location/stores`
Expected: PASS

- [ ] **Step 3: ページの spec を書き換える**

`train-location.component.spec.ts` で:
- 「コンテンツ領域: sm 未満で左右余白を削減するクラスを持つ」を削除（レイアウトを作り替えるため）
- 「免責文（R-7 短縮版）をページ最下部に常設表示する」はそのまま（フッターは残す）
- 次を足す:

```ts
    it('免責文はページ下端の 1 か所だけ', () => {
        fixture.detectChanges();
        const text = fixture.nativeElement.textContent as string;
        expect(text.split('ダイヤ通りに走った場合の位置です').length - 1).toBe(1);
    });

    it('状態の行に時計を出す（時計の部品は使わない）', () => {
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('app-train-location-clock')).toBeNull();
        expect(el.querySelector('[data-clock]')?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('onStationSelect: 駅を URL に載せ、路線ごとに覚える', () => {
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        TrainLocationStore.setSelectedRouteId('r1');

        component.onStationSelect('s1');

        expect(navigate).toHaveBeenCalledWith(
            ['/train-location', expect.objectContaining({ station_id: 's1' })],
        );
        expect(localStorage.getItem('train-location:station:r1')).toBe('s1');
    });

    it('onRouteIdChange: 駅の選択を外して路線を変える', () => {
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        component.onRouteIdChange('r2');

        const params = navigate.mock.calls[0][0][1] as Record<string, string>;
        expect(params['route_id']).toBe('r2');
        expect(params['station_id']).toBeUndefined();
    });
```

（`component`・`fixture` の変数名は既存 spec に合わせる。`Router` と `TrainLocationStore` の import が無ければ足す）

- [ ] **Step 4: 失敗を確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location/train-location.component.spec.ts`
Expected: 追加分が FAIL

- [ ] **Step 5: ページの ts を書き換える**

import の差し替え:
- 削除: `TrainLocationClockComponent`
- 追加: `FormsModule`（`@angular/forms`）、`MatFormFieldModule`、`MatInputModule`、`TrainLocationStationPanelComponent`、`buildStationArrivals`・`STATION_ARRIVALS_LIMIT`、`readRememberedStationId`・`writeRememberedStationId`

`imports` 配列から `TrainLocationClockComponent` を外し、`FormsModule, MatFormFieldModule, MatInputModule, TrainLocationStationPanelComponent` を足す。

フィールドを足す:

```ts
    readonly #selectedStationIdParam = toSignal(
        TrainLocationStore.selectedStationId$,
        { initialValue: null },
    );

    /** 駅軸に無い駅（路線を変えた直後など）は未選択として扱う */
    readonly selectedStationId = computed(() => {
        const id = this.#selectedStationIdParam();
        return id && this.stationAxisStations().some((s) => s.stationId === id)
            ? id
            : null;
    });

    readonly selectedStationName = computed(() => {
        const id = this.selectedStationId();
        return id ? (this.#stationNameById().get(id) ?? '') : '';
    });

    readonly selectedStationInterchangeRoutes = computed(() => {
        const id = this.selectedStationId();
        return id ? (this.#interchangeRoutesByStationId().get(id) ?? []) : [];
    });

    readonly arrivals = computed(() => {
        const stationId = this.selectedStationId();
        if (!stationId) {
            return { inbound: [], outbound: [] };
        }
        return buildStationArrivals({
            tripBlocks: this.#allTripBlocks(),
            stationId,
            at: this.at(),
            positions: this.positions(),
            cardsById: this.#cardsById(),
            stationNameById: this.#stationNameById(),
            limit: STATION_ARRIVALS_LIMIT,
        });
    });

    /** 方面の名前は駅軸の両端の駅から作る（例 本線: 横浜方面 / 海老名方面） */
    readonly inboundLabel = computed(
        () => `${this.stationAxisStations()[0]?.stationName ?? ''}方面`,
    );
    readonly outboundLabel = computed(() => {
        const axis = this.stationAxisStations();
        return `${axis[axis.length - 1]?.stationName ?? ''}方面`;
    });

    readonly clockDescription = computed(() =>
        this.mode() === 'now'
            ? '現在時刻に追従中（10秒ごとに再計算）'
            : '指定時刻で静止表示中',
    );
```

`paramMap` の購読を書き換える（既存の `missingParams` の分岐の代わり）:

```ts
                const routeIdParam = paramMap.get('route_id');
                const routeId = routeIdParam ?? this.#defaultRouteId();
                const stationIdParam = paramMap.get('station_id');
                const rememberedStationId =
                    routeId && !stationIdParam
                        ? readRememberedStationId(routeId)
                        : null;

                if (routeId && (!routeIdParam || rememberedStationId)) {
                    this.#router.navigate(
                        [
                            '/train-location',
                            {
                                ...this.#route.snapshot.params,
                                route_id: routeId,
                                ...(rememberedStationId
                                    ? { station_id: rememberedStationId }
                                    : {}),
                            },
                        ],
                        { replaceUrl: true },
                    );
                    return;
                }
```

同じ購読の中で `TrainLocationStore.setSelectedStationId(stationIdParam);` を `setSelectedRouteId` の直後に足す。
`fetchData` の呼び出しを、取り直すものが無いときは呼ばないようにする（駅を選ぶたびにスピナーが出ないように）:

```ts
                const refetchTripBlocks = calendarChanged || !this.#firstLoadDone();
                const refetchStationAxis = routeChanged || !this.#firstLoadDone();
                if (refetchTripBlocks || refetchStationAxis) {
                    this.fetchData({ refetchTripBlocks, refetchStationAxis });
                }
```

メソッドを足す・変える:

```ts
    onStationSelect(stationId: string): void {
        const routeId = this.selectedRouteId();
        if (routeId) {
            writeRememberedStationId(routeId, stationId);
        }
        this.#navigate({ station_id: stationId });
    }

    onRouteIdChange(routeId: string): void {
        const { station_id, ...rest } = this.#route.snapshot.params;
        void station_id;
        this.#router.navigate(['/train-location', { ...rest, route_id: routeId }]);
    }
```

- [ ] **Step 6: ページの html を書き換える**（ファイル全体を置き換え）

```html
<!-- 図そのものが本文なので外周 gutter は持たない（docs/design.md「余白の掟」2）。
     図の上下の chrome は横 12px の inset。landmark は揃える。 -->
<main class="tw-flex tw-h-full tw-flex-col tw-bg-paper-2">
    @if (isLoading()) {
        <div class="tw-fixed tw-inset-x-0 tw-top-0 tw-z-30">
            <mat-progress-bar color="accent" mode="indeterminate"></mat-progress-bar>
        </div>
    }

    <app-train-location-controller
        [calendarId]="calendarId()"
        [selectedRouteId]="selectedRouteId()"
        [mode]="mode()"
        (calendarIdChange)="onCalendarIdChange($event)"
        (routeIdChange)="onRouteIdChange($event)"
        (modeChange)="onModeChange($event)"
    ></app-train-location-controller>

    <!-- 状態の行: 時計（旧 train-location-clock を畳んだもの）＋時刻指定の入力欄 -->
    <div
        class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-4 tw-gap-y-1 tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white tw-px-3 tw-py-2"
    >
        <span data-clock class="tw-font-mono tw-text-2xl tw-tabular-nums tw-text-ink">{{ clockText() }}</span>
        <span class="tw-text-xs tw-text-muted">{{ clockDescription() }}</span>
        @if (mode() === 'specified') {
            <mat-form-field subscriptSizing="dynamic" class="tw-w-40">
                <mat-label>表示時刻</mat-label>
                <input
                    matInput
                    type="time"
                    aria-label="表示時刻を指定する"
                    class="tw-font-mono tw-tabular-nums"
                    [ngModel]="timeInputValue()"
                    (ngModelChange)="onTimeInputValueChange($event)"
                />
            </mat-form-field>
        }
    </div>

    <div class="tw-flex-1 tw-overflow-y-auto tw-px-3 tw-py-3">
        @if (isLoading()) {
            <div class="tw-flex tw-justify-center tw-py-16">
                <app-loading></app-loading>
            </div>
        } @else {
            <div
                class="tw-grid tw-grid-cols-1 tw-gap-3 lg:tw-grid-cols-[40rem_minmax(0,1fr)] lg:tw-items-start"
            >
                <app-train-location-station-panel
                    class="lg:tw-sticky lg:tw-top-0 lg:tw-col-start-2 lg:tw-row-start-1"
                    [stationId]="selectedStationId()"
                    [stationName]="selectedStationName()"
                    [interchangeRoutes]="selectedStationInterchangeRoutes()"
                    [arrivals]="arrivals()"
                    [inboundLabel]="inboundLabel()"
                    [outboundLabel]="outboundLabel()"
                ></app-train-location-station-panel>

                <div class="tw-rounded-card tw-bg-white lg:tw-col-start-1 lg:tw-row-start-1">
                    @if (hasNoTrainsInService()) {
                        <app-empty-state
                            icon="train"
                            message="現在この路線を走行中の列車はありません"
                            [subtitle]="emptyStateSubtitle()"
                            [actionLabel]="emptyStateActionLabel()"
                            (actionClick)="onEmptyStateAction()"
                        ></app-empty-state>
                    }
                    <app-train-location-line
                        [rows]="rows()"
                        [selectedStationId]="selectedStationId()"
                        (stationSelect)="onStationSelect($event)"
                    ></app-train-location-line>
                </div>
            </div>
        }
    </div>

    <!-- 免責文（98 G8: 最下部固定で常設）。ページ内でこの 1 か所だけ。 -->
    <footer
        class="tw-shrink-0 tw-border-0 tw-border-t tw-border-solid tw-border-rule tw-bg-white tw-px-3 tw-py-2 tw-text-center tw-text-xs tw-text-muted"
    >
        ダイヤ通りに走った場合の位置です。実在線は
        <a routerLink="/operation/real-time" class="tw-text-structure tw-underline">リアルタイム運用情報</a>へ。
    </footer>
</main>
```

- [ ] **Step 7: 操作パネルの免責文を消し、時計の部品を消す**

`train-location-controller.component.html` の末尾の `<p class="tw-m-0 tw-text-xs tw-text-grey-600">ダイヤ通りに…</p>` を削除する。`RouterLink` が不要になったら ts の `imports` と import 文からも消す。controller の spec に免責文を確かめるテストがあれば削除する。

```bash
git rm src/app/pages/train-location/components/train-location-clock/train-location-clock.component.html src/app/pages/train-location/components/train-location-clock/train-location-clock.component.scss src/app/pages/train-location/components/train-location-clock/train-location-clock.component.spec.ts src/app/pages/train-location/components/train-location-clock/train-location-clock.component.ts
```

- [ ] **Step 8: 通ることを確かめる**

Run: `npx jest --testPathPattern=src/app/pages/train-location`
Expected: 全 suite PASS

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: エラー無し

Run: `npx eslint src/app/pages/train-location src/app/shared/train-position.util.ts`
Expected: エラー無し

- [ ] **Step 9: 整形してコミット** — `feat: :sparkles: 列車位置情報を縦の図と駅の欄の 2 列にする`

---

### Task 7: 実物で確かめる

**Files:** なし（直すものが見つかったらそのファイル）

- [ ] **Step 1: 開発サーバーのログにビルドエラーが無いことを確かめる**

Run: `docker logs --tail 50 sotetsu-lab-v3-client-development-client-1`
Expected: `ERROR` が無い

- [ ] **Step 2: Playwright で 1440×900 と 390×844 を撮る**（`http://localhost:4200/train-location`）

撮るもの（各幅で）:
1. 本線・現在時刻・駅未選択（欄に「図の駅名を押して駅を選ぶ」）
2. 本線・二俣川を押した後（URL に `station_id`、札が紺＋橙の輪、欄に上り・下り）
3. 再読み込みして二俣川が選ばれたままか（localStorage）
4. いずみ野線・新横浜線に切り替え（駅は選び直し。前回の駅があればそれ）
5. 二俣川の「いずみ野線」チップを押して、いずみ野線で二俣川が選ばれた状態で開くか
6. 時刻指定 23:55 と 25:30（終電後「この先の列車はありません」）
7. 路線の端の駅（横浜・海老名）

- [ ] **Step 3: DOM で測る**

`browser_evaluate` で次を確かめる:
- `document.documentElement.scrollWidth <= innerWidth`（ページの横スクロール無し）
- 図の高さ（本線 18 駅で 1,300px 前後）
- 主要駅の札だけ太字（本線の土休日で 横浜・二俣川・大和・海老名 など。全駅太字なら Task 1 の退行）
- 絵文字・Arial が残っていない（`getComputedStyle(button).fontFamily` が本文と同じ）
- 同じ駅に複数停車している所でカードが全部並ぶ

- [ ] **Step 4: 見つけたものを直してコミット**（直すたびに該当 spec を流す）

- [ ] **Step 5: ユーザーに見せる**（撮った画像のパスと、気づいた点を報告して判断を仰ぐ。ロックはユーザーの指示が出てから）
