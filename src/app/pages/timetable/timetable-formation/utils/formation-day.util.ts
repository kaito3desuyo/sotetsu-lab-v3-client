import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import {
    ItineraryLinkEndDto,
    OperationItineraryLinkDto,
} from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    toDisplayTime,
    toServiceSeconds,
} from 'src/app/core/utils/railway-day';
import { toZeroBasedDays } from './formation-display.util';

/** 運用を何で決めたか（画面で出し分けるときの材料） */
export type FormationDayBasis =
    'sighting' | 'transfer' | 'circulated' | 'carried-over' | 'unknown';

export type FormationDayRow =
    | {
          kind: 'trip';
          trip: TripOperationListDetailsDto;
          operationId: string;
          operationNumber: string;
          estimated: boolean;
          /** 同日引き継ぎの目撃で運用が決まった列車 */
          carriedOver: boolean;
      }
    | { kind: 'depot'; label: 'out' | 'in'; stationId: string; time: string }
    | { kind: 'transfer'; from: string; to: string; stationId: string }
    | { kind: 'swap'; sightingTime: string; toOperationNumber: string }
    | {
          kind: 'unknown';
          lastOperationNumber: string;
          evictedBy: { formationNumber: string; sightingTime: string };
      };

export interface FormationDayInput {
    formationId: string;
    /** 営業日 'yyyy-MM-dd'。ISO の目撃時刻とダイヤの時刻（24 時超え）を同じ軸で比べるのに使う */
    baseDate: string;
    /** その営業日の全編成の目撃 */
    sightings: OperationSightingDetailsDto[];
    /** 目撃が無いときの time-cross-section の運用 */
    firstOperationId: string | null;
    tripsByOperationId: Record<string, OperationTripsDto>;
    links: OperationItineraryLinkDto[];
}

type TripEntry = {
    type: 'trip';
    trip: TripOperationListDetailsDto;
    operationId: string;
    estimated: boolean;
    carriedOver: boolean;
};
type PathEntry =
    | TripEntry
    | { type: 'transfer'; from: string; to: string; stationId: string }
    | { type: 'swap'; sightingTime: string; toOperationNumber: string };

/** 時刻順に並べた 1 つの運用の列車 */
type Sorted = TripOperationListDetailsDto[];

function startSeconds(t: TripOperationListDetailsDto): number {
    const s = t.startTime;
    const v = toServiceSeconds(
        toZeroBasedDays(s?.departureDays),
        s?.departureTime,
    );
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(s?.arrivalDays), s?.arrivalTime)
        : v;
}

function endSeconds(t: TripOperationListDetailsDto): number {
    const e = t.endTime;
    const v = toServiceSeconds(toZeroBasedDays(e?.arrivalDays), e?.arrivalTime);
    return Number.isNaN(v)
        ? toServiceSeconds(toZeroBasedDays(e?.departureDays), e?.departureTime)
        : v;
}

/** 目撃が決める運用。引き継ぎの目撃でも `operationId` を使う（`sightedAsOperation` は引き継ぎの印） */
function effectiveOperationId(s: OperationSightingDetailsDto): string | null {
    return s.operationId ?? null;
}

/** 時刻を含む列車が無い（-1）ときは、最後の列車の添字（length - 1）にする。空なら 0 */
function lastIfNone(index: number, length: number): number {
    return index >= 0 ? index : Math.max(0, length - 1);
}

function build(
    input: FormationDayInput,
    missing: Set<string>,
): FormationDayRow[] {
    const baseMs = Date.parse(`${input.baseDate}T00:00:00+09:00`);
    const sightingSeconds = (s: OperationSightingDetailsDto): number =>
        (Date.parse(s.sightingTime) - baseMs) / 1000;

    const sortedCache = new Map<string, Sorted | null>();
    /** 運用の列車を時刻順にしたもの。まだ取得していなければ null（missing に記録する） */
    const tripsOf = (operationId: string): Sorted | null => {
        if (sortedCache.has(operationId)) return sortedCache.get(operationId);
        const dto = input.tripsByOperationId[operationId];
        if (!dto) {
            missing.add(operationId);
            sortedCache.set(operationId, null);
            return null;
        }
        const sorted = [...dto.trips].sort(
            (a, b) => startSeconds(a) - startSeconds(b),
        );
        sortedCache.set(operationId, sorted);
        return sorted;
    };
    const numberOf = (operationId: string): string =>
        input.tripsByOperationId[operationId]?.operation?.operationNumber ?? '';

    const nextByTol = new Map<string, ItineraryLinkEndDto>();
    const previousByTol = new Map<string, ItineraryLinkEndDto>();
    for (const l of input.links) {
        if (l.next) nextByTol.set(l.tripOperationListId, l.next);
        if (l.previous) previousByTol.set(l.tripOperationListId, l.previous);
    }

    const tripEntry = (
        trip: TripOperationListDetailsDto,
        operationId: string,
    ): TripEntry => ({
        type: 'trip',
        trip,
        operationId,
        estimated: false,
        carriedOver: false,
    });

    /** 時刻 sec を含む（終わりが sec 以後の最初の）列車の添字。無ければ -1 */
    const indexContaining = (list: Sorted, sec: number): number =>
        list.findIndex((t) => endSeconds(t) >= sec);

    /**
     * operationId の anchorIdx 番目の列車に着いた編成が、その運用の中でどこから入ったかを、
     * 乗り移りの previous をさかのぼって求める。
     * 戻り値の startIdx はその運用での開始位置、prefix はそれより前に走った列車と乗り移りの帯。
     */
    const lead = (
        operationId: string,
        anchorIdx: number,
        seen: Set<string>,
    ): { startIdx: number; prefix: PathEntry[] } => {
        const list = tripsOf(operationId);
        if (!list) return { startIdx: 0, prefix: [] };
        let j = -1;
        for (let i = Math.min(anchorIdx, list.length - 1); i >= 0; i--) {
            if (previousByTol.has(list[i].tripOperationListId)) {
                j = i;
                break;
            }
        }
        if (j < 0) return { startIdx: 0, prefix: [] };
        const entryTol = list[j].tripOperationListId;
        const prev = previousByTol.get(entryTol);
        if (seen.has(entryTol)) return { startIdx: j, prefix: [] };
        seen.add(entryTol);
        const prevList = tripsOf(prev.operationId);
        const pi = prevList
            ? prevList.findIndex(
                  (t) => t.tripOperationListId === prev.tripOperationListId,
              )
            : -1;
        if (!prevList || pi < 0) return { startIdx: j, prefix: [] };
        const sub = lead(prev.operationId, pi, seen);
        return {
            startIdx: j,
            prefix: [
                ...sub.prefix,
                ...prevList
                    .slice(sub.startIdx, pi + 1)
                    .map((t) => tripEntry(t, prev.operationId)),
                {
                    type: 'transfer',
                    from: numberOf(prev.operationId) || prev.operationNumber,
                    to: numberOf(operationId),
                    stationId: prev.stationId,
                },
            ],
        };
    };

    /** operationId の startIdx 番目から、日の終わりまで乗り移りをたどって path に足す */
    const walk = (
        path: PathEntry[],
        operationId: string,
        startIdx: number,
    ): void => {
        const visited = new Set(
            path.flatMap((e) =>
                e.type === 'trip' ? [e.trip.tripOperationListId] : [],
            ),
        );
        let opId = operationId;
        let idx = startIdx;
        for (;;) {
            const list = tripsOf(opId);
            if (!list) return;
            let next: ItineraryLinkEndDto | undefined;
            for (let i = idx; i < list.length; i++) {
                const tol = list[i];
                if (visited.has(tol.tripOperationListId)) return;
                visited.add(tol.tripOperationListId);
                path.push(tripEntry(tol, opId));
                next = nextByTol.get(tol.tripOperationListId);
                if (next) break;
            }
            if (!next || visited.has(next.tripOperationListId)) return;
            const nextList = tripsOf(next.operationId);
            if (!nextList) return;
            const ni = nextList.findIndex(
                (t) => t.tripOperationListId === next.tripOperationListId,
            );
            if (ni < 0) return;
            path.push({
                type: 'transfer',
                from: numberOf(opId),
                to: numberOf(next.operationId) || next.operationNumber,
                stationId: next.stationId,
            });
            opId = next.operationId;
            idx = ni;
        }
    };

    /** 引き継ぎの目撃で運用が決まった列車に印を付ける（path の from 番目から） */
    const markCarriedOver = (
        path: PathEntry[],
        from: number,
        s: OperationSightingDetailsDto,
    ): void => {
        if (!s.sightedAsOperation) return;
        for (const e of path.slice(from)) {
            if (e.type === 'trip') e.carriedOver = true;
        }
    };

    /** path の末尾に残った乗り移りの帯（行き先の列車を切り落としたあとのもの）を外す */
    const trimTrailingTransfers = (path: PathEntry[]): void => {
        while (path.length > 0 && path[path.length - 1].type === 'transfer') {
            path.pop();
        }
    };

    /** path の中で、sec を含む列車の添字。無ければ -1 */
    const pathIndexContaining = (path: PathEntry[], sec: number): number =>
        path.findIndex((e) => e.type === 'trip' && endSeconds(e.trip) >= sec);

    const usable = (s: OperationSightingDetailsDto): boolean =>
        !s.invalidation &&
        !!s.sightingTime &&
        !Number.isNaN(Date.parse(s.sightingTime)) &&
        effectiveOperationId(s) !== null;
    const valid = input.sightings.filter(usable);
    const own = valid
        .filter((s) => s.formationId === input.formationId)
        .sort((a, b) => sightingSeconds(a) - sightingSeconds(b));

    const path: PathEntry[] = [];
    let lastKnown = -1;

    // 1. 最初の運用: 最初の目撃の運用。無ければ firstOperationId
    const firstOpId =
        own.length > 0 ? effectiveOperationId(own[0]) : input.firstOperationId;
    if (firstOpId) {
        const list = tripsOf(firstOpId);
        if (list) {
            const anchor =
                own.length > 0
                    ? lastIfNone(
                          indexContaining(list, sightingSeconds(own[0])),
                          list.length,
                      )
                    : 0;
            // 2. 最初の目撃より前は previous をさかのぼる
            const { startIdx, prefix } = lead(firstOpId, anchor, new Set());
            path.push(...prefix);
            walk(path, firstOpId, startIdx);
            if (own.length > 0) {
                const at = pathIndexContaining(path, sightingSeconds(own[0]));
                // 目撃が最後の列車より後なら、最後の列車まで分かっている
                lastKnown = at >= 0 ? at : path.length - 1;
                markCarriedOver(path, 0, own[0]);
            }
        }
    }

    // 3. 目撃のほうがダイヤより強い
    for (const s of own.slice(1)) {
        const sec = sightingSeconds(s);
        const opId = effectiveOperationId(s);
        const at = pathIndexContaining(path, sec);
        const here = at >= 0 ? (path[at] as TripEntry) : null;
        if (here && here.operationId === opId) {
            lastKnown = at;
            continue;
        }
        const list = tripsOf(opId);
        const cut = at >= 0 ? at : path.length;
        for (let i = lastKnown + 1; i < cut; i++) {
            const e = path[i];
            if (e.type === 'trip') e.estimated = true;
        }
        path.length = cut;
        trimTrailingTransfers(path);
        path.push({
            type: 'swap',
            sightingTime: s.sightingTime,
            toOperationNumber:
                numberOf(opId) || s.sightedAsOperation?.operationNumber || '',
        });
        lastKnown = path.length - 1;
        if (list) {
            const ni = indexContaining(list, sec);
            if (ni >= 0) {
                const from = path.length;
                walk(path, opId, ni);
                markCarriedOver(path, from, s);
            }
        }
    }

    // 4. この編成の最後の目撃より後に、同じ運用で別の編成が目撃されたら不明
    let unknown: FormationDayRow | null = null;
    if (own.length > 0) {
        const lastOwn = own[own.length - 1];
        const lastSec = sightingSeconds(lastOwn);
        const evictor = valid
            .filter(
                (s) =>
                    s.formationId !== input.formationId &&
                    sightingSeconds(s) > lastSec,
            )
            .sort((a, b) => sightingSeconds(a) - sightingSeconds(b))
            .find((s) => {
                const at = pathIndexContaining(path, sightingSeconds(s));
                return (
                    at >= 0 &&
                    (path[at] as TripEntry).operationId ===
                        effectiveOperationId(s)
                );
            });
        if (evictor) {
            const at = pathIndexContaining(path, sightingSeconds(evictor));
            path.length = at;
            trimTrailingTransfers(path);
            const lastOpId = effectiveOperationId(lastOwn);
            unknown = {
                kind: 'unknown',
                lastOperationNumber:
                    numberOf(lastOpId) ||
                    lastOwn.sightedAsOperation?.operationNumber ||
                    lastOwn.operation?.operationNumber ||
                    '',
                evictedBy: {
                    formationNumber: evictor.formation?.formationNumber ?? '',
                    sightingTime: evictor.sightingTime,
                },
            };
        }
    }

    // 5. 入出庫を depot の行にする
    const rows: FormationDayRow[] = [];
    for (const e of path) {
        if (e.type !== 'trip') {
            rows.push(
                e.type === 'transfer'
                    ? {
                          kind: 'transfer',
                          from: e.from,
                          to: e.to,
                          stationId: e.stationId,
                      }
                    : {
                          kind: 'swap',
                          sightingTime: e.sightingTime,
                          toOperationNumber: e.toOperationNumber,
                      },
            );
            continue;
        }
        const { trip } = e;
        if (trip.trip?.depotOut) {
            rows.push({
                kind: 'depot',
                label: 'out',
                stationId: trip.startStationId ?? '',
                time: toDisplayTime(
                    toZeroBasedDays(trip.startTime?.departureDays),
                    trip.startTime?.departureTime ?? '00:00:00',
                ),
            });
        }
        rows.push({
            kind: 'trip',
            trip,
            operationId: e.operationId,
            operationNumber: numberOf(e.operationId),
            estimated: e.estimated,
            carriedOver: e.carriedOver,
        });
        if (trip.trip?.depotIn) {
            rows.push({
                kind: 'depot',
                label: 'in',
                stationId: trip.endStationId ?? '',
                time: toDisplayTime(
                    toZeroBasedDays(trip.endTime?.arrivalDays),
                    trip.endTime?.arrivalTime ?? '00:00:00',
                ),
            });
        }
    }
    if (unknown) rows.push(unknown);
    return rows;
}

/** 編成の 1 日の列車の並びを組み立てる */
export function buildFormationDay(input: FormationDayInput): FormationDayRow[] {
    return build(input, new Set());
}

/** たどるのに要るのに、まだ tripsByOperationId に無い運用の id。service はこれが空になるまで取りに行く */
export function missingOperationIds(input: FormationDayInput): string[] {
    const missing = new Set<string>();
    build(input, missing);
    return [...missing];
}

/**
 * rows[index] の列車の運用を何で決めたか。index から前へたどり、いちばん近い決め手で決める。
 * unknown の行が手前にあれば unknown、引き継ぎの列車なら carried-over、乗り移りなら transfer、
 * 目撃で差し替えた（swap）なら sighting。決め手が無ければ最初の運用の決め方（firstBasis）。
 */
export function basisAt(
    rows: FormationDayRow[],
    index: number,
    firstBasis: FormationDayBasis,
): FormationDayBasis {
    if (rows.slice(0, index + 1).some((r) => r.kind === 'unknown')) {
        return 'unknown';
    }
    for (let i = Math.min(index, rows.length - 1); i >= 0; i--) {
        const r = rows[i];
        if (r.kind === 'trip' && r.carriedOver) return 'carried-over';
        if (r.kind === 'transfer') return 'transfer';
        if (r.kind === 'swap') return 'sighting';
    }
    return firstBasis;
}
