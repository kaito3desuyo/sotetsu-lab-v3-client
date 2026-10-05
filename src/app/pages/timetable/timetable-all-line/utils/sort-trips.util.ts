import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

/** 駅での [着（無ければ発）, 発（無ければ着）]。日跨ぎ込みの分。 */
type StationTime = readonly [number, number];

/** 共通の駅で決まった前後の逆転に掛ける重み（1 分あたり）。共通駅の無い組の逆転は 1。 */
const HARD_WEIGHT = 1000;
/** 局所探索の上限回数。実データ（上下とも約 540 ブロック）は 10 回以内で止まる。 */
const MAX_PASSES = 60;

function toMinutes(
    time: string | null | undefined,
    days: number | null | undefined,
): number | null {
    if (!time) return null;
    const [h, m, s] = time.split(':').map(Number);
    return (days ?? 0) * 1440 + h * 60 + m + (s ?? 0) / 60;
}

/** ブロックの「駅 → 時刻」。直通の継ぎ目で同じ駅が 2 回出たら早い方をとる。 */
function blockTimes(block: TripBlockDetailsDto): Map<string, StationTime> {
    const result = new Map<string, StationTime>();
    for (const trip of block.trips) {
        for (const time of trip.times) {
            const arrival = toMinutes(time.arrivalTime, time.arrivalDays);
            const departure = toMinutes(time.departureTime, time.departureDays);
            const first = arrival ?? departure;
            if (first === null) continue; // 通過（時刻なし）は比べる材料にしない
            const current = result.get(time.stationId);
            if (!current || first < current[0]) {
                result.set(time.stationId, [first, departure ?? first]);
            }
        }
    }
    return result;
}

/**
 * 全線時刻表の列（列車ブロック）の並びを決める。
 *
 * 理想は「同じ駅を通る 2 本は、その駅の時刻の順に左から並ぶ」こと。ただし追い越しや
 * 支線の合流があると A < B < C < A の循環が実際に起きるため、全部は満たせない。
 * そこで違反の重さの合計を最小にする並びを探す。
 *
 * - **2 本の関係**: 表の上から見て、最初に時刻の差がつく共通駅の時刻で決める
 *   （着で比べ、同じなら発）。違反の重さは「その駅でのずれの分数 × 1000」。
 *   4 分の追い越しより 50 分の逆転を強く避ける
 * - **共通の駅が無い 2 本**: 始発（表で最初に出てくる駅）の時刻で決める。重さは 1。
 *   比べる相手のいない短い回送などが、無関係な列車の後ろへ流されないようにする
 * - **解き方**: 始発時刻の順に 1 本ずつ「自分以前の最後の相手の直後」へ入れて初期値を作り、
 *   1 本ずつ抜いて重さが最小になる位置へ入れ直す（走査の向きを交互に変え、改善が止まるまで）
 *
 * 同じ入力なら入力の順番によらず同じ並びを返す。ブロック内の列車の並びは変えない。
 * 旧実装（2026-09 まで）は比べる駅が挿入のたびにぶれ、同じブロックを列車の本数だけ
 * 挿入して呼び出し側で重複を消していた。平日ダイヤ下りの実測で、同じ駅での逆転は
 * 171 組・ずれ合計 3125 分 → 17 組・105 分（残りは追い越しの循環と時刻の入力誤り）。
 */
export function sortTrips(
    stations: readonly StationDetailsDto[],
    tripBlocks: readonly TripBlockDetailsDto[],
): TripBlockDetailsDto[] {
    const n = tripBlocks.length;
    if (n <= 1) return [...tripBlocks];

    const stationIndex = new Map(
        stations.map((station, i) => [station.stationId, i]),
    );
    const infos = tripBlocks.map((block) => {
        const times = blockTimes(block);
        const sequence = [...times.keys()]
            .filter((stationId) => stationIndex.has(stationId))
            .sort((a, b) => stationIndex.get(a)! - stationIndex.get(b)!);
        const start = sequence.length ? times.get(sequence[0])![0] : Infinity;
        return { block, times, sequence, start };
    });

    // penalty[i * n + j]: i を j より前に置いたときの重さ（正しければ 0）
    // comparable[i * n + j]: 共通の駅で前後が決まる組か
    const penalty = new Float64Array(n * n);
    const comparable = new Uint8Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const p = infos[i];
            const q = infos[j];
            let diff = 0;
            let shared = false;
            for (const stationId of p.sequence) {
                const qt = q.times.get(stationId);
                if (!qt) continue;
                shared = true;
                const pt = p.times.get(stationId)!;
                diff = pt[0] - qt[0] || pt[1] - qt[1];
                if (diff) break;
            }
            if (shared) {
                comparable[i * n + j] = comparable[j * n + i] = 1;
                if (diff > 0) penalty[i * n + j] = HARD_WEIGHT * diff;
                if (diff < 0) penalty[j * n + i] = HARD_WEIGHT * -diff;
            } else if (p.start !== q.start) {
                if (p.start > q.start) penalty[i * n + j] = 1;
                else penalty[j * n + i] = 1;
            }
        }
    }

    // 初期値: 始発時刻の順（同時刻はブロック ID）に、共通駅で比べて自分以前の最後の相手の直後へ
    const byStart = infos
        .map((_, i) => i)
        .sort(
            (a, b) =>
                infos[a].start - infos[b].start ||
                infos[a].block.tripBlockId.localeCompare(
                    infos[b].block.tripBlockId,
                ),
        );
    let order: number[] = [];
    for (const x of byStart) {
        let position = 0;
        for (let k = order.length - 1; k >= 0; k--) {
            const o = order[k];
            if (!comparable[o * n + x]) continue;
            if (penalty[o * n + x] === 0) {
                position = k + 1;
                break;
            }
        }
        order.splice(position, 0, x);
    }

    // 局所探索: 1 本ずつ抜き、重さの合計が最小になる位置へ入れ直す
    for (let pass = 0; pass < MAX_PASSES; pass++) {
        let improved = false;
        const indices = [...order.keys()];
        if (pass % 2 === 1) indices.reverse();
        for (const k of indices) {
            const x = order[k];
            const rest = order.filter((_, m) => m !== k);
            let cost = 0; // x を先頭に置いたときの重さ
            for (const o of rest) cost += penalty[x * n + o];
            let bestPosition = 0;
            let bestCost = cost;
            let currentCost = cost;
            for (let position = 1; position <= rest.length; position++) {
                const o = rest[position - 1];
                cost += penalty[o * n + x] - penalty[x * n + o];
                if (position === k) currentCost = cost;
                if (cost < bestCost) {
                    bestCost = cost;
                    bestPosition = position;
                }
            }
            if (bestCost < currentCost) {
                rest.splice(bestPosition, 0, x);
                order = rest;
                improved = true;
            }
        }
        if (!improved) break;
    }

    return order.map((i) => infos[i].block);
}
