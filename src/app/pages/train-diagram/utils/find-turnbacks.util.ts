import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    resolveArrival,
    resolveDeparture,
    timedStops,
} from 'src/app/shared/train-position.util';

/**
 * 折り返し（種別変更・列番変更の「つながり（chain）」をまたいで、同じ編成が
 * 同じ駅で向きを変えて発つ関係）1 件。
 */
export type Turnback = {
    /** 折り返す前の列車（つながりの末尾） */
    arrivingTripId: string;
    /** 折り返した後の列車（つながりの先頭） */
    departingTripId: string;
    stationId: string;
};

/** y を持たない固定の日付（時刻の前後比較にしか使わないため実値は関係ない）。 */
const EPOCH = new Date(2000, 0, 1);

type ChainInfo = {
    headTripId: string;
    tailTripId: string;
    operationId: string;
    firstStationId: string;
    firstDepartureMs: number;
    lastStationId: string;
    lastArrivalMs: number;
    /** 先頭列車の出庫（depotOut）。true なら、この直前に折り返しは作らない（入庫・出庫は折り返しではない）。 */
    headDepotOut: boolean;
    /** 末尾列車の入庫（depotIn）。true なら、この直後に折り返しは作らない。 */
    tailDepotIn: boolean;
    /** 末尾列車の tripDirection（fix round 1: 折り返しは向きが変わることが必須）。 */
    tailDirection: number | undefined;
    /** 先頭列車の tripDirection。 */
    headDirection: number | undefined;
};

/**
 * 表示条件に合う全列車（方向フィルタ前後どちらでもよいが、上り・下り両方が要る。
 * 折り返しは通常どちらかの端で向きが変わるため）から、運用ごとに「つながり
 * （種別変更・列番変更で継走する列車の連なり。chainHeadOf/chainTailOf で表す）」を
 * 始発時刻順に並べ、隣り合う 2 つのつながりが同じ駅で折り返す関係になっているものを探す。
 *
 * - 運用は `trip.tripOperationLists?.[0]?.operationId`（つながりの先頭列車のものを代表とする）。
 * - 運用が無い列車・時刻の無い列車（つながりの先頭・末尾のどちらか）は対象外。
 * - つながりの中（種別変更そのもの）は折り返しではない（chainHeadOf/chainTailOf で
 *   同じつながりの列車は 1 つの単位としてまとめられているため、自然に除外される）。
 * - 入庫・出庫は折り返しではない: 着く側のつながりの末尾列車が入庫（depotIn）、または
 *   発つ側のつながりの先頭列車が出庫（depotOut）なら、その隣接ペアは折り返しにしない。
 * - 追加指示: 他線直通で末尾列車・先頭列車の実際の最初/最後の時刻のある停車駅が
 *   今表示している軸の外（他社線内）なら、その駅では線が描かれない（または軸の
 *   切れ目の別の駅で線が終わっている）ため折り返しを作らない（axisStationIds で判定）。
 * - fix round 1（コントローラ判断）: 折り返しは向きが変わることが必須。着く側の末尾列車の
 *   tripDirection と発つ側の先頭列車の tripDirection が同じ（またはどちらか不明）なら
 *   折り返しにしない（同じ運用・同じ方向で trip block をまたいで続く列車を、呼び出し側が
 *   `mergeSameDirectionContinuations` で 1 つの chain へつなぎ損ねた場合の保険でもある）。
 */
export function findTurnbacks(params: {
    trips: readonly TripDetailsDto[];
    chainHeadOf: ReadonlyMap<string, string>;
    chainTailOf: ReadonlyMap<string, string>;
    axisStationIds: ReadonlySet<string>;
}): Turnback[] {
    const { trips, chainHeadOf, chainTailOf, axisStationIds } = params;

    const tripById = new Map<string, TripDetailsDto>();
    for (const trip of trips) {
        if (trip.tripId !== undefined) {
            tripById.set(trip.tripId, trip);
        }
    }

    const chainsByHead = new Map<string, ChainInfo>();
    for (const trip of trips) {
        if (trip.tripId === undefined) {
            continue;
        }
        const headTripId = chainHeadOf.get(trip.tripId);
        const tailTripId = chainTailOf.get(trip.tripId);
        if (headTripId === undefined || tailTripId === undefined) {
            continue;
        }
        if (chainsByHead.has(headTripId)) {
            continue;
        }
        const headTrip = tripById.get(headTripId);
        const tailTrip = tripById.get(tailTripId);
        if (!headTrip || !tailTrip) {
            continue;
        }

        const operationId = headTrip.tripOperationLists?.[0]?.operationId;
        if (!operationId) {
            continue;
        }

        const firstStop = timedStops(headTrip.times)[0];
        const tailStops = timedStops(tailTrip.times);
        const lastStop = tailStops[tailStops.length - 1];
        if (!firstStop?.stationId || !lastStop?.stationId) {
            continue;
        }

        const firstDeparture = resolveDeparture(EPOCH, firstStop);
        const lastArrival = resolveArrival(EPOCH, lastStop);
        if (firstDeparture === undefined || lastArrival === undefined) {
            continue;
        }

        chainsByHead.set(headTripId, {
            headTripId,
            tailTripId,
            operationId,
            firstStationId: firstStop.stationId,
            firstDepartureMs: firstDeparture.getTime(),
            lastStationId: lastStop.stationId,
            lastArrivalMs: lastArrival.getTime(),
            headDepotOut: headTrip.depotOut === true,
            tailDepotIn: tailTrip.depotIn === true,
            tailDirection: tailTrip.tripDirection,
            headDirection: headTrip.tripDirection,
        });
    }

    const chainsByOperation = new Map<string, ChainInfo[]>();
    for (const chain of chainsByHead.values()) {
        const list = chainsByOperation.get(chain.operationId) ?? [];
        list.push(chain);
        chainsByOperation.set(chain.operationId, list);
    }

    const turnbacks: Turnback[] = [];
    for (const chains of chainsByOperation.values()) {
        const ordered = [...chains].sort(
            (a, b) => a.firstDepartureMs - b.firstDepartureMs,
        );
        for (let i = 0; i < ordered.length - 1; i++) {
            const arriving = ordered[i];
            const departing = ordered[i + 1];
            if (
                arriving.lastStationId === departing.firstStationId &&
                departing.firstDepartureMs >= arriving.lastArrivalMs &&
                // 入庫（着く側）・出庫（発つ側）は折り返しではない。
                !arriving.tailDepotIn &&
                !departing.headDepotOut &&
                // 折り返す駅（=着く側の最後の停車=発つ側の最初の停車）が軸の外なら、
                // その駅では線が描かれない（別の駅で切れている）ため作らない。
                axisStationIds.has(arriving.lastStationId) &&
                // fix round 1: 向きが変わっていなければ折り返しではない（同じ運用・
                // 同じ方向の継続を誤検出しないための必須条件。どちらか不明なら作らない）。
                arriving.tailDirection !== undefined &&
                departing.headDirection !== undefined &&
                arriving.tailDirection !== departing.headDirection
            ) {
                turnbacks.push({
                    arrivingTripId: arriving.tailTripId,
                    departingTripId: departing.headTripId,
                    stationId: arriving.lastStationId,
                });
            }
        }
    }

    return turnbacks;
}
