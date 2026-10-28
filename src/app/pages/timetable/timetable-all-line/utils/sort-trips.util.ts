import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

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
 *
 * 駅を番号にして時刻を数値の配列で持ち、局所探索で配列を作り直さない
 * （2026-10-28・同じ並びのまま 2〜3 倍速い）。
 */
export function sortTrips(
    stations: readonly StationDetailsDto[],
    tripBlocks: readonly TripBlockDetailsDto[],
): TripBlockDetailsDto[] {
    const n = tripBlocks.length;
    if (n <= 1) return [...tripBlocks];

    const stationCount = stations.length;
    const stationIndex = new Map(
        stations.map((station, i) => [station.stationId, i]),
    );
    // first[b * S + s]・second[b * S + s]: ブロック b の駅 s での [着（無ければ発）, 発（無ければ着）]。
    // 日跨ぎ込みの分。時刻の無い駅（通過・路線外）は NaN で、比べる材料にしない
    const first = new Float64Array(n * stationCount).fill(NaN);
    const second = new Float64Array(n * stationCount).fill(NaN);
    // sequences[b]: ブロック b が時刻を持つ駅の番号（表の上から順）
    const sequences: Int32Array[] = [];
    const starts = new Float64Array(n);
    for (let b = 0; b < n; b++) {
        const base = b * stationCount;
        for (const trip of tripBlocks[b].trips) {
            for (const time of trip.times) {
                const s = stationIndex.get(time.stationId);
                if (s === undefined) continue;
                const arrival = toMinutes(time.arrivalTime, time.arrivalDays);
                const departure = toMinutes(
                    time.departureTime,
                    time.departureDays,
                );
                const f = arrival ?? departure;
                if (f === null) continue; // 通過（時刻なし）は比べる材料にしない
                // 直通の継ぎ目で同じ駅が 2 回出たら早い方（NaN との比較は false なので最初は必ず入る）
                if (!(first[base + s] <= f)) {
                    first[base + s] = f;
                    second[base + s] = departure ?? f;
                }
            }
        }
        const seq: number[] = [];
        for (let s = 0; s < stationCount; s++) {
            if (!Number.isNaN(first[base + s])) seq.push(s);
        }
        sequences.push(Int32Array.from(seq));
        starts[b] = seq.length ? first[base + seq[0]] : Infinity;
    }

    // penalty[i * n + j]: i を j より前に置いたときの重さ（正しければ 0）
    // comparable[i * n + j]: 共通の駅で前後が決まる組か
    const penalty = new Float64Array(n * n);
    const comparable = new Uint8Array(n * n);
    for (let i = 0; i < n; i++) {
        const seq = sequences[i];
        const pb = i * stationCount;
        for (let j = i + 1; j < n; j++) {
            const qb = j * stationCount;
            let diff = 0;
            let shared = false;
            for (let t = 0; t < seq.length; t++) {
                const s = seq[t];
                const qf = first[qb + s];
                if (Number.isNaN(qf)) continue;
                shared = true;
                diff = first[pb + s] - qf || second[pb + s] - second[qb + s];
                if (diff) break;
            }
            if (shared) {
                comparable[i * n + j] = comparable[j * n + i] = 1;
                if (diff > 0) penalty[i * n + j] = HARD_WEIGHT * diff;
                if (diff < 0) penalty[j * n + i] = HARD_WEIGHT * -diff;
            } else if (starts[i] !== starts[j]) {
                if (starts[i] > starts[j]) penalty[i * n + j] = 1;
                else penalty[j * n + i] = 1;
            }
        }
    }

    // 初期値: 始発時刻の順（同時刻はブロック ID）に、共通駅で比べて自分以前の最後の相手の直後へ
    const byStart = Array.from({ length: n }, (_, i) => i).sort(
        (a, b) =>
            starts[a] - starts[b] ||
            tripBlocks[a].tripBlockId.localeCompare(tripBlocks[b].tripBlockId),
    );
    const order: number[] = [];
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

    // 局所探索: 1 本ずつ抜き、重さの合計が最小になる位置へ入れ直す。
    // 「抜いた並び」は作らず、order の上で k を飛ばして数える
    for (let pass = 0; pass < MAX_PASSES; pass++) {
        let improved = false;
        for (let step = 0; step < n; step++) {
            const k = pass % 2 === 1 ? n - 1 - step : step;
            const x = order[k];
            const xn = x * n;
            let cost = 0; // x を先頭に置いたときの重さ
            for (let m = 0; m < n; m++) {
                if (m !== k) cost += penalty[xn + order[m]];
            }
            let bestPosition = 0;
            let bestCost = cost;
            let currentCost = cost;
            // position は「x を除いた並び」での位置。その position - 1 番目は order の m（k を飛ばす）
            for (let position = 1, m = 0; position < n; position++, m++) {
                if (m === k) m++;
                const o = order[m];
                cost += penalty[o * n + x] - penalty[xn + o];
                if (position === k) currentCost = cost;
                if (cost < bestCost) {
                    bestCost = cost;
                    bestPosition = position;
                }
            }
            if (bestCost < currentCost) {
                order.splice(k, 1);
                order.splice(bestPosition, 0, x);
                improved = true;
            }
        }
        if (!improved) break;
    }

    return order.map((i) => tripBlocks[i]);
}
