import { StationAxis } from 'src/app/shared/diagram-scale';

/**
 * fitStationAxisToTrips への 1 観測。軸の index（occurrence を含む）で表した
 * 走行区間（分断されていない隣り合う2停車の発→着）と、その所要分・列車。
 * 観測の作り方は build-chain-diagram-lines.util.ts の
 * buildChainStopIndexObservations を参照（同じ駅の2つの行のあいだ＝点線は含まない）。
 */
export type StationAxisObservation = {
    tripId: string;
    fromIndex: number;
    toIndex: number;
    minutes: number;
};

/** 交互最小二乗の反復回数（Task 13 仕様）。 */
const ITERATIONS = 10;
/** 駅間隔の正則化の重み係数（λ = REGULARIZATION_FACTOR × 観測数 / 駅間数）。 */
const REGULARIZATION_FACTOR = 0.05;
/** 駅間隔の最小値（0.3 × 平均の駅間）。つぶれ防止の下駄。 */
const MIN_GAP_RATIO = 0.3;
/** ガウスの消去法でピボットが実質ゼロとみなす閾値。 */
const PIVOT_EPSILON = 1e-9;

type ValidatedObservation = {
    tripId: string;
    lo: number;
    hi: number;
    minutes: number;
};

/**
 * 表示中の列車の走行区間から、駅間の長さ（駅軸の y）を最小二乗で調整する純関数。
 * 「列車ごとに速さが一定なら線はまっすぐ」という条件に最もよく合う駅間を求めることで、
 * 急行・特急の斜め線ができるだけ直線に近づく（各停基準の駅間だと停車駅ごとに折れていた）。
 *
 * 未知数は累積位置 P_j（j は軸の index）と列車ごとの速さ v_k。交互最小二乗で
 * 1) v_k = Σ(ΔP_s・t_s)/Σt_s²（列車ごと）、
 * 2) Σ(ΔP_s − v_k t_s)² + λΣ(g_j − g0_j)² を最小にする駅間 g_j を解く、
 * 3) g_j を 0.3×平均の駅間で切り上げる、
 * を 10 回繰り返し、最後に全体の長さを初期値に合わせて拡大縮小する。
 *
 * 観測が 0 件、または軸が 2 駅未満なら軸をそのまま返す。
 * 観測の無い駅間は λ の正則化項だけで初期値に引き寄せられる（データ項が無いため）。
 */
export function fitStationAxisToTrips(params: {
    axis: StationAxis;
    observations: readonly StationAxisObservation[];
}): StationAxis {
    const { axis, observations } = params;
    const stationCount = axis.length;
    if (stationCount < 2 || observations.length === 0) {
        return axis;
    }

    const gapCount = stationCount - 1;
    const initialGaps = new Array<number>(gapCount);
    for (let j = 0; j < gapCount; j++) {
        initialGaps[j] = Math.max(0, axis[j + 1].y - axis[j].y);
    }
    const initialTotalLength = axis[stationCount - 1].y - axis[0].y;

    const validObservations = normalizeObservations(observations, stationCount);
    if (validObservations.length === 0) {
        return axis;
    }

    const meanInitialGap =
        initialGaps.reduce((sum, gap) => sum + gap, 0) / gapCount;
    const minGap = MIN_GAP_RATIO * meanInitialGap;
    const lambda =
        (REGULARIZATION_FACTOR * validObservations.length) / gapCount;

    let gaps = [...initialGaps];
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
        const cumulative = cumulativeSum(gaps);
        const speedByTripId = solveTripSpeeds(validObservations, cumulative);
        const { matrix, rhs } = buildNormalEquations(
            validObservations,
            speedByTripId,
            initialGaps,
            lambda,
            gapCount,
        );
        const solved = solveLinearSystem(matrix, rhs) ?? initialGaps;
        gaps = solved.map((gap) => Math.max(gap, minGap));
    }

    const finalCumulative = cumulativeSum(gaps);
    const finalLength = finalCumulative[gapCount];
    const scale =
        finalLength > 0 && initialTotalLength > 0
            ? initialTotalLength / finalLength
            : 1;

    return axis.map((entry, index) => ({
        stationId: entry.stationId,
        y: axis[0].y + finalCumulative[index] * scale,
        isDuplicate: entry.isDuplicate,
    }));
}

/** 範囲外の index・ゼロ区間・所要 0 以下の観測を捨て、lo <= hi に正規化する。 */
export function normalizeObservations(
    observations: readonly StationAxisObservation[],
    stationCount: number,
): ValidatedObservation[] {
    const result: ValidatedObservation[] = [];
    for (const obs of observations) {
        if (
            obs.fromIndex < 0 ||
            obs.fromIndex >= stationCount ||
            obs.toIndex < 0 ||
            obs.toIndex >= stationCount ||
            obs.fromIndex === obs.toIndex ||
            !(obs.minutes > 0)
        ) {
            continue;
        }
        result.push({
            tripId: obs.tripId,
            lo: Math.min(obs.fromIndex, obs.toIndex),
            hi: Math.max(obs.fromIndex, obs.toIndex),
            minutes: obs.minutes,
        });
    }
    return result;
}

/**
 * Task 13 フィックス: 駅間（index j → j+1）ごとに、直接それを覆う観測が
 * 1件でもあるかを返す（length = stationCount - 1）。
 * 観測の無い駅間（接続駅の継ぎ目など）は fitStationAxisToTrips 内では
 * λ の正則化項で初期値に引き寄せられるだけだが、呼び出し側（root）はこれを使って
 * 「観測の無い駅間は最小行高まで圧縮する」（λ の引き寄せ値をそのまま描かない）判断をする。
 * 1次元差分配列で区間加算 → 累積和にすることで O(観測数 + 駅間数) に抑える
 * （fitStationAxisToTrips の正規方程式の組み立てと同じ考え方）。
 */
export function hasObservationByGap(
    observations: readonly StationAxisObservation[],
    stationCount: number,
): boolean[] {
    const gapCount = Math.max(0, stationCount - 1);
    const diff = new Array<number>(gapCount + 1).fill(0);
    for (const obs of normalizeObservations(observations, stationCount)) {
        diff[obs.lo] += 1;
        diff[obs.hi] -= 1;
    }
    const result = new Array<boolean>(gapCount);
    let running = 0;
    for (let j = 0; j < gapCount; j++) {
        running += diff[j];
        result[j] = running > 0;
    }
    return result;
}

function cumulativeSum(gaps: readonly number[]): number[] {
    const result = new Array<number>(gaps.length + 1);
    result[0] = 0;
    for (let i = 0; i < gaps.length; i++) {
        result[i + 1] = result[i] + gaps[i];
    }
    return result;
}

/** ステップ1: v_k = Σ(ΔP_s・t_s)/Σt_s²（列車ごと。分母が 0 なら 0）。 */
function solveTripSpeeds(
    observations: readonly ValidatedObservation[],
    cumulative: readonly number[],
): Map<string, number> {
    const sumDeltaPTimesT = new Map<string, number>();
    const sumTSquared = new Map<string, number>();
    for (const obs of observations) {
        const deltaP = cumulative[obs.hi] - cumulative[obs.lo];
        sumDeltaPTimesT.set(
            obs.tripId,
            (sumDeltaPTimesT.get(obs.tripId) ?? 0) + deltaP * obs.minutes,
        );
        sumTSquared.set(
            obs.tripId,
            (sumTSquared.get(obs.tripId) ?? 0) + obs.minutes * obs.minutes,
        );
    }
    const speedByTripId = new Map<string, number>();
    for (const [tripId, sumDPt] of sumDeltaPTimesT) {
        const sumT2 = sumTSquared.get(tripId) ?? 0;
        speedByTripId.set(tripId, sumT2 > 0 ? sumDPt / sumT2 : 0);
    }
    return speedByTripId;
}

/**
 * ステップ2: 正規方程式 (AᵀA + λI) g = Aᵀc + λ g0 の行列・右辺を組み立てる。
 *
 * 観測 s の設計行列の行 a_s は区間 [lo, hi) で 1 の指標ベクトルのため、AᵀA は
 * 「観測 s の [lo, hi) が両方の index を覆う回数」の行列になる。これを観測ごとに
 * O(区間長) で足し込むと大きな区間で遅くなるため、矩形加算の2次元差分配列
 * （四隅を ±1 する）→ 2次元累積和で O(観測数 + 駅間数²) に抑える
 * （Aᵀc も同様に1次元差分配列で求める）。
 */
function buildNormalEquations(
    observations: readonly ValidatedObservation[],
    speedByTripId: ReadonlyMap<string, number>,
    initialGaps: readonly number[],
    lambda: number,
    gapCount: number,
): { matrix: number[][]; rhs: number[] } {
    const diffC = new Array<number>(gapCount + 1).fill(0);
    const diff2 = Array.from({ length: gapCount + 1 }, () =>
        new Array<number>(gapCount + 1).fill(0),
    );
    for (const obs of observations) {
        const speed = speedByTripId.get(obs.tripId) ?? 0;
        const c = speed * obs.minutes;
        diffC[obs.lo] += c;
        diffC[obs.hi] -= c;
        diff2[obs.lo][obs.lo] += 1;
        diff2[obs.lo][obs.hi] -= 1;
        diff2[obs.hi][obs.lo] -= 1;
        diff2[obs.hi][obs.hi] += 1;
    }

    // Aᵀc: 1次元累積和
    const atc = new Array<number>(gapCount);
    let runningC = 0;
    for (let j = 0; j < gapCount; j++) {
        runningC += diffC[j];
        atc[j] = runningC;
    }

    // AᵀA: 2次元累積和（行方向→列方向）
    const ata = diff2.map((row) => [...row]);
    for (let i = 0; i <= gapCount; i++) {
        for (let j = 1; j <= gapCount; j++) {
            ata[i][j] += ata[i][j - 1];
        }
    }
    for (let j = 0; j <= gapCount; j++) {
        for (let i = 1; i <= gapCount; i++) {
            ata[i][j] += ata[i - 1][j];
        }
    }

    const matrix: number[][] = [];
    const rhs: number[] = [];
    for (let j = 0; j < gapCount; j++) {
        const row = ata[j].slice(0, gapCount);
        row[j] += lambda;
        matrix.push(row);
        rhs.push(atc[j] + lambda * initialGaps[j]);
    }
    return { matrix, rhs };
}

/**
 * ガウスの消去法（部分ピボット選択）で連立一次方程式を解く。
 * ピボットが実質ゼロ（観測も正則化も無い理論上起きないケース）なら undefined を返す。
 */
function solveLinearSystem(
    matrix: readonly (readonly number[])[],
    rhs: readonly number[],
): number[] | undefined {
    const n = rhs.length;
    const a = matrix.map((row) => [...row]);
    const b = [...rhs];

    for (let col = 0; col < n; col++) {
        let pivotRow = col;
        let pivotValue = Math.abs(a[col][col]);
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(a[row][col]) > pivotValue) {
                pivotRow = row;
                pivotValue = Math.abs(a[row][col]);
            }
        }
        if (pivotValue < PIVOT_EPSILON) {
            return undefined;
        }
        if (pivotRow !== col) {
            [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
            [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
        }
        const pivot = a[col][col];
        for (let row = col + 1; row < n; row++) {
            const factor = a[row][col] / pivot;
            if (factor === 0) {
                continue;
            }
            for (let k = col; k < n; k++) {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }

    const x = new Array<number>(n);
    for (let row = n - 1; row >= 0; row--) {
        let sum = b[row];
        for (let k = row + 1; k < n; k++) {
            sum -= a[row][k] * x[k];
        }
        x[row] = sum / a[row][row];
    }
    return x;
}
