import { StationAxis } from 'src/app/shared/diagram-scale';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { DIAGRAM_START_HOUR } from './diagram-timeline.util';
import { buildChainDiagramLines } from './build-chain-diagram-lines.util';

export type TripDiagramPoint = { minute: number; y: number };

export type TripDiagramThroughLabel = {
    minute: number;
    y: number;
    text: string;
    /** ラベルの基点（'start' = 点の右側へ伸ばす / 'end' = 点の左側へ伸ばす） */
    anchor: 'start' | 'end';
};

export type TripDiagramStopLabel = {
    minute: number;
    y: number;
    text: string;
    /**
     * ラベルの上下（Task 19）。この停車の後（無ければ前）で線が上（y が小さくなる）へ
     * 向かうなら 'below'（基準線 y + 10、点の右下）、そうでなければ 'above'（y - 3、
     * 従来どおり点の右上）。上り列車は右上へ伸びる線と重なるため below に逃がす。
     */
    side: 'above' | 'below';
};

/**
 * Task 14 追加: 入庫・出庫の印。'out' = 出庫（◯・つながりの先頭列車の最初の点）、
 * 'in' = 入庫（△・つながりの末尾列車の最後の点）。折り返し線の代わりにこちらを描く
 * （入出庫は同じ編成が続けて別の駅から発つわけではないため、折り返しではない）。
 */
export type TripDiagramDepotMark = {
    kind: 'out' | 'in';
    minute: number;
    y: number;
};

/**
 * 分岐駅で行を跳んだ箇所をつなぐ縦の点線（列車と同じ色・細い点線で描く）。
 * fromY は跳ぶ前（arr側）の行の y、toY は跳んだ後（dep側）の行の y。
 */
export type TripDiagramConnector = {
    minute: number;
    fromY: number;
    toY: number;
};

export type TripDiagramLine = {
    tripId: string;
    tripNumber: string;
    tripClassColor: string;
    /** 回送（tripClass 未設定）は破線で表現する（既存慣行踏襲） */
    isDeadhead: boolean;
    /**
     * ポリライン用の点列群。列車が実際に経由しない軸区間（分岐路線を跨ぐ箇所）では
     * 線を分断するため、1 trip でも複数 segment になり得る。
     */
    segments: TripDiagramPoint[][];
    throughLabels: TripDiagramThroughLabel[];
    /** 図に載っている各停車駅の発車の分（発車が無ければ到着）。選んだ列車だけに描く */
    stopLabels: TripDiagramStopLabel[];
    /** 分岐駅で行を跳んだ箇所（他分岐を挟まず繋がる）に引く縦の点線。 */
    connectors: TripDiagramConnector[];
    /** Task 14: 入庫・出庫の印（◯・△）。つながりの先頭・末尾でだけ持ちうる。 */
    depotMarks: TripDiagramDepotMark[];
    minMinute: number;
    maxMinute: number;
    /**
     * 種別変更・列番変更で継走する列車の連なり（chain）の先頭の線か。
     * 列番の字はこれが true の線だけに描く（各線に付けると重なるため）。
     * buildChainDiagramLines が付ける。単独の buildTripDiagramLine 呼び出しでは常に true。
     */
    isChainHead?: boolean;
};

/**
 * 連続する軸上停車ペア (stopsOnAxis[i-1], stopsOnAxis[i]) の間で、
 * trip 自身の times（軸上の駅に限らない全停車列。停車しない通過駅は
 * 発着とも欠落した行として現れる）のうち、stopSequence がその 2 停車の
 * 間に厳密に収まるものの stationId 集合を求める（＝この trip が実際に
 * 経由する「通過駅」の集合。hasInterloperBetween の許容判定に使う）。
 *
 * 経由判定は trip 単位ではなくペア単位で行う: 直通列車は複数路線を跨ぐため、
 * trip 全体の stopSequence 範囲で見ると通過駅の重複や無関係な駅が混ざりうる。
 * ペア単位ならその区間で実際に通過する駅だけが求まる。
 *
 * 継走（buildChainDiagramLines）でも同じ関数を使う。つなげた停車列は
 * stopSequence を並び位置で振り直す（buildMergedStops）ため、列車ごとの
 * stopSequence が比べられない問題を起こさない。
 */
function collectPassingStationIdsBetween(
    allStops: readonly TimeDetailsDto[],
    fromSeq: number,
    toSeq: number,
): ReadonlySet<string> {
    const lower = Math.min(fromSeq, toSeq);
    const upper = Math.max(fromSeq, toSeq);
    const result = new Set<string>();
    for (const stop of allStops) {
        const seq = stop.stopSequence ?? 0;
        if (seq > lower && seq < upper && stop.stationId != null) {
            result.add(stop.stationId);
        }
    }
    return result;
}

/**
 * stopsOnAxis の連続ペアごとに collectPassingStationIdsBetween を求めた配列
 * （長さ stopsOnAxis.length - 1。index i は (stopsOnAxis[i], stopsOnAxis[i+1]) 間）。
 */
export function buildPassingStationIdsByPairIndex(
    allStops: readonly TimeDetailsDto[],
    stopsOnAxis: readonly TimeDetailsDto[],
): ReadonlySet<string>[] {
    const result: ReadonlySet<string>[] = [];
    for (let i = 1; i < stopsOnAxis.length; i++) {
        result.push(
            collectPassingStationIdsBetween(
                allStops,
                stopsOnAxis[i - 1].stopSequence ?? 0,
                stopsOnAxis[i].stopSequence ?? 0,
            ),
        );
    }
    return result;
}

/** 駅ID → 軸上の全 occurrence（インデックス）群。分岐駅は複数持ちうる。 */
export function buildOccurrenceIndices(
    axisStationOrder: readonly string[],
): Map<string, number[]> {
    const map = new Map<string, number[]>();
    axisStationOrder.forEach((stationId, index) => {
        const list = map.get(stationId) ?? [];
        list.push(index);
        map.set(stationId, list);
    });
    return map;
}

/**
 * 軸上の2つのインデックス(a, b)の間（軸順で挟まる駅）に、この trip が
 * 実際には経由しない駅（他分岐の駅）が 1 つでもあれば true。
 *
 * 挟まる駅が次のどちらかなら「経由している」とみなし interloper としない:
 * - 軸に 2 回以上出現する stationId（分岐のため複製された駅の行）。複製された
 *   行そのものは「他分岐」ではなく、同じ駅の別の occurrence でしかない
 *   （Task 10）。
 * - trip 自身の times に、この区間の stopSequence 範囲内で実際に現れる駅
 *   （停車しない通過駅を含む。passingStationIds。Task 11 フォローアップ）。
 *   路線への所属ではなく、この trip 自身が本当に通るかどうかで判定する。
 *
 * 逆方向のチェックも行う: passingStationIds に挙げられている駅（trip が実際に
 * 記録上通過する駅）のうち軸上に存在するものは、その occurrence のどれかが
 * 必ず (a, b) の範囲内に無ければ interloper とする。これが無いと、分岐駅の
 * 複製 occurrence が（実際の経路とは無関係に）たまたま前の停車のすぐ隣に
 * 挿入されているだけで「間に何も挟まらない＝無条件で接続可）と誤判定され、
 * 本来の経路上にある実測の通過駅（例: 上星川）を無視して逆側の occurrence
 * （分岐専用側）を選んでしまうことがある（コントローラ指摘の追加バグ）。
 */
function hasInterloperBetween(
    a: number,
    b: number,
    axisStationOrder: readonly string[],
    occurrenceIndices: ReadonlyMap<string, number[]>,
    passingStationIds: ReadonlySet<string>,
): boolean {
    const start = Math.min(a, b);
    const end = Math.max(a, b);

    for (let i = start + 1; i < end; i++) {
        const betweenStationId = axisStationOrder[i];
        if (betweenStationId === undefined) {
            continue;
        }
        if ((occurrenceIndices.get(betweenStationId)?.length ?? 1) > 1) {
            continue;
        }
        if (passingStationIds.has(betweenStationId)) {
            continue;
        }
        return true;
    }

    for (const stationId of passingStationIds) {
        const occurrences = occurrenceIndices.get(stationId);
        if (occurrences === undefined) {
            // 選択路線の軸に無い駅（未選択路線の通過駅など）は判定材料にしない。
            continue;
        }
        const isWithinRange = occurrences.some(
            (index) => index > start && index < end,
        );
        if (!isWithinRange) {
            return true;
        }
    }

    return false;
}

type ResolvedStop = {
    stop: TimeDetailsDto;
    /** 採用した軸上の occurrence（インデックス）。 */
    axisIndex: number;
    /** true の場合、この stop から新しい segment を開始する（接続駅での分割を含む）。 */
    newSegment: boolean;
    /**
     * 'both'（既定。跳ぶときの arr(i) の行も含む）: 着・発の両方の点を打つ
     * （停車があれば横線になる）。
     * 'jumpDeparture': 駅で行を跳んだ先の dep(i) の行。着・発の両方の点を
     * 再度打つ（arr(i) 側と同じ停車の横線をもう一度描く。着・発それぞれの分に
     * つなぎ線（connector）が引かれるため、見た目は「横線2本＋点線2本」の
     * 矩形になる）。継走のつなぎ目でもこの行は常に次の列車の所有になる
     * （前の列車と共有しない。buildChainDiagramLines 側の規則）。
     */
    role: 'both' | 'jumpDeparture';
};

/** 分断（他分岐駅を避けられない区間）の疑似コスト。跳び（同駅内の occurrence 乗り換え）1 回より必ず高い。 */
const DISCONNECT_COST = 100;

type DpState = {
    /** ここまでの合計コスト（跳び 1 回=1、分断 1 箇所=100）。 */
    cost: number;
    /** ここまでの隣接区間距離 |arr(i+1) − dep(i)| の合計（コスト同点時の第 2 基準）。 */
    dist: number;
    /** ここまでに使った occurrence インデックスの合計（コスト・距離同点時の第 3 基準。軸の上の方を優先）。 */
    idxSum: number;
    /** この状態に至った駅 i の arr(i)（経路の巻き戻し用）。 */
    arr: number;
    /** 1 つ前の駅の dep（= 直前状態のマップキー）。最初の駅では undefined。 */
    prevDep?: number;
};

/** (cost, dist, idxSum) を辞書式に比較し、a が b より良ければ true。 */
function isBetterState(a: DpState, b: DpState): boolean {
    if (a.cost !== b.cost) {
        return a.cost < b.cost;
    }
    if (a.dist !== b.dist) {
        return a.dist < b.dist;
    }
    return a.idxSum < b.idxSum;
}

/**
 * 停車駅列を軸上の occurrence（複製された分岐駅を含む）へ、停車駅の並び全体で
 * 跳び（同駅内での occurrence 乗り換え）が最少になるよう動的計画法で解決する。
 *
 * 各停車駅 i について「着く行 arr(i)」と「発つ行 dep(i)」を候補
 * （occurrenceIndices）から選ぶ。arr(i) ≠ dep(i) なら駅 i で跳ぶ（コスト 1、
 * つなぎ線 1 本）。dep(i) → arr(i+1) は他分岐駅を挟まないときだけ許され
 * （コスト 0）、どの組み合わせも挟んでしまう場合だけ、その区間を分断する
 * （コスト DISCONNECT_COST、つなぎ線は引かない）。最初と最後の駅は
 * arr = dep 固定（端で跳ぶ意味はないため）。
 *
 * コスト最小を採る。同点なら隣接区間距離の合計が小さい方、さらに同点なら
 * 使った occurrence インデックスの合計が小さい方（軸の上の方）を優先する。
 */
function resolveStopOccurrencesDp(
    stopsOnAxis: readonly TimeDetailsDto[],
    occurrenceIndices: ReadonlyMap<string, number[]>,
    axisStationOrder: readonly string[],
    passingStationIdsByPairIndex: readonly ReadonlySet<string>[],
): { arrAt: number[]; depAt: number[] } {
    const n = stopsOnAxis.length;
    const candidatesOf = (i: number): number[] =>
        occurrenceIndices.get(stopsOnAxis[i].stationId as string) ?? [0];

    const dp: Map<number, DpState>[] = [];
    const firstDp = new Map<number, DpState>();
    for (const c of candidatesOf(0)) {
        firstDp.set(c, { cost: 0, dist: 0, idxSum: c, arr: c });
    }
    dp.push(firstDp);

    for (let i = 1; i < n; i++) {
        const isLast = i === n - 1;
        const passingStationIds = passingStationIdsByPairIndex[i - 1];
        const candidatesCur = candidatesOf(i);
        const curDp = new Map<number, DpState>();

        for (const [p, prevState] of dp[i - 1]) {
            for (const a of candidatesCur) {
                const interloper = hasInterloperBetween(
                    p,
                    a,
                    axisStationOrder,
                    occurrenceIndices,
                    passingStationIds,
                );
                const edgeCost = interloper ? DISCONNECT_COST : 0;
                const edgeDist = Math.abs(a - p);
                const depCandidates = isLast ? [a] : candidatesCur;

                for (const d of depCandidates) {
                    const jumpCost = a === d ? 0 : 1;
                    const state: DpState = {
                        cost: prevState.cost + edgeCost + jumpCost,
                        dist: prevState.dist + edgeDist,
                        idxSum: prevState.idxSum + a + d,
                        arr: a,
                        prevDep: p,
                    };
                    const existing = curDp.get(d);
                    if (
                        existing === undefined ||
                        isBetterState(state, existing)
                    ) {
                        curDp.set(d, state);
                    }
                }
            }
        }
        dp.push(curDp);
    }

    let bestKey: number | undefined;
    let bestState: DpState | undefined;
    for (const [key, state] of dp[n - 1]) {
        if (bestState === undefined || isBetterState(state, bestState)) {
            bestKey = key;
            bestState = state;
        }
    }

    const arrAt = new Array<number>(n);
    const depAt = new Array<number>(n);
    let curKey = bestKey as number;
    for (let i = n - 1; i >= 0; i--) {
        const state = dp[i].get(curKey);
        if (state === undefined) {
            // 到達不能（理論上起きないが、型安全のためフォールバックする）。
            arrAt[i] = curKey;
            depAt[i] = curKey;
            continue;
        }
        depAt[i] = curKey;
        arrAt[i] = state.arr;
        if (i > 0 && state.prevDep !== undefined) {
            curKey = state.prevDep;
        }
    }

    return { arrAt, depAt };
}

/** resolveStopOccurrences が返す connector に、所有列車の判定用の元 stop を添えたもの。 */
export type InternalConnector = TripDiagramConnector & { stop: TimeDetailsDto };

/**
 * 停車駅列を軸上の occurrence（複製された分岐駅を含む）へ解決する
 * （resolveStopOccurrencesDp のコスト最小な選び方に基づく）。
 *
 * 駅 i で跳ぶ（arr(i) ≠ dep(i)）ときは、arr(i) の行で当該停車の着・発の点
 * （停車の横線）を打って segment を閉じ、dep(i) の行でも同じ停車の着・発の点を
 * もう一度打って新しい segment を始める（role: 'jumpDeparture'。停車の横線が
 * 両方の行に描かれる）。つなぎ線（connector）は、着の分・発の分（同じ時刻なら
 * 1本）を返す。どちらも fromY = arr(i) の行、toY = dep(i) の行で、横線2本・
 * 点線2本の矩形になる。どの組み合わせでも他分岐駅を挟んでしまい繋がらない
 * 区間は、従来どおり分断する（つなぎ線は引かない）。
 *
 * 経由判定は連続停車ペア単位（passingStationIdsByPairIndex。
 * buildPassingStationIdsByPairIndex 由来）で行う。直通列車でも各駅間は
 * trip 自身がその区間で実際に通る駅かどうかで判定されるため、経由しない
 * ブロックを横切る組は棄却され、複製 occurrence への付け替え・分断が
 * 正しく機能する（Task 11 フォローアップ: 経由路線への所属ではなく
 * trip 自身の times を根拠にする）。
 */
export function resolveStopOccurrences(
    stopsOnAxis: readonly TimeDetailsDto[],
    occurrenceIndices: ReadonlyMap<string, number[]>,
    axisStationOrder: readonly string[],
    passingStationIdsByPairIndex: readonly ReadonlySet<string>[],
    axis: StationAxis,
    base: Date,
): { resolved: ResolvedStop[]; connectors: InternalConnector[] } {
    const { arrAt, depAt } = resolveStopOccurrencesDp(
        stopsOnAxis,
        occurrenceIndices,
        axisStationOrder,
        passingStationIdsByPairIndex,
    );

    const resolved: ResolvedStop[] = [];
    const connectors: InternalConnector[] = [];

    resolved.push({
        stop: stopsOnAxis[0],
        axisIndex: arrAt[0],
        newSegment: false,
        role: 'both',
    });

    for (let i = 1; i < stopsOnAxis.length; i++) {
        const connected = !hasInterloperBetween(
            depAt[i - 1],
            arrAt[i],
            axisStationOrder,
            occurrenceIndices,
            passingStationIdsByPairIndex[i - 1],
        );

        resolved.push({
            stop: stopsOnAxis[i],
            axisIndex: arrAt[i],
            newSegment: !connected,
            role: 'both',
        });

        if (arrAt[i] !== depAt[i]) {
            const fromY = axis[arrAt[i]].y;
            const toY = axis[depAt[i]].y;
            const arrivalMoment = resolveArrival(base, stopsOnAxis[i]);
            const departureMoment = resolveDeparture(base, stopsOnAxis[i]);
            if (
                arrivalMoment !== undefined &&
                departureMoment !== undefined &&
                arrivalMoment.getTime() !== departureMoment.getTime()
            ) {
                // 着・発で時刻が異なる（停車がある）ときは、着の分・発の分の
                // 2 本のつなぎ線を引く（横線2本と合わせて矩形になる）。
                connectors.push({
                    minute: toDiagramMinute(base, arrivalMoment),
                    fromY,
                    toY,
                    stop: stopsOnAxis[i],
                });
                connectors.push({
                    minute: toDiagramMinute(base, departureMoment),
                    fromY,
                    toY,
                    stop: stopsOnAxis[i],
                });
            } else {
                const moment = departureMoment ?? arrivalMoment;
                if (moment !== undefined) {
                    connectors.push({
                        minute: toDiagramMinute(base, moment),
                        fromY,
                        toY,
                        stop: stopsOnAxis[i],
                    });
                }
            }
            resolved.push({
                stop: stopsOnAxis[i],
                axisIndex: depAt[i],
                newSegment: true,
                role: 'jumpDeparture',
            });
        }
    }

    return { resolved, connectors };
}

/**
 * trip times の days は 1-based（day 1 = 営業日当日、day 2 = 24 時超えの翌日分）で格納される。
 * toAbsoluteTimeFast は 0 始まりの日オフセットのため -1 する。欠落時は day 1（オフセット 0）とみなす。
 */
function dayOffset(days: number | null | undefined): number {
    return (days ?? 1) - 1;
}

/** `HH:mm:ss` → 秒。同じ文字列は何度も現れるため覚えておく。 */
const secondsByTimeText = new Map<string, number>();

function parseSeconds(time: string): number {
    let seconds = secondsByTimeText.get(time);
    if (seconds === undefined) {
        const [hours, minutes, secs] = time.split(':').map(Number);
        seconds = hours * 3600 + minutes * 60 + secs;
        secondsByTimeText.set(time, seconds);
    }
    return seconds;
}

/** 「base の days 日後の 0 時」の ms。鍵は base の ms + days（days は 0〜2 程度の整数）。 */
const dayStartMsByKey = new Map<number, number>();

/**
 * core の toAbsoluteTime（date-fns の startOfDay → addDays → addSeconds）と同じ結果を、
 * Date を 1 個しか作らずに返す。線の計算では 1 回の描き直しで数万回呼ばれるため
 * （task-23 の実測で再計算時間の約 1/4）。0 時は地方時の日付で作るので、夏時間の
 * ある地域でも addDays と同じになる。
 */
function toAbsoluteTimeFast(base: Date, days: number, time: string): Date {
    const key = base.getTime() + days;
    let dayStartMs = dayStartMsByKey.get(key);
    if (dayStartMs === undefined) {
        dayStartMs = new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate() + days,
        ).getTime();
        dayStartMsByKey.set(key, dayStartMs);
    }
    return new Date(dayStartMs + parseSeconds(time) * 1000);
}

export function resolveArrival(
    base: Date,
    time: TimeDetailsDto,
): Date | undefined {
    // API の欠落時刻は null で来る（undefined ではない）ため == null で両方を捉える。
    const value = time.arrivalTime ?? time.departureTime;
    if (value == null) {
        return undefined;
    }
    return toAbsoluteTimeFast(
        base,
        dayOffset(time.arrivalDays ?? time.departureDays),
        value,
    );
}

export function resolveDeparture(
    base: Date,
    time: TimeDetailsDto,
): Date | undefined {
    const value = time.departureTime ?? time.arrivalTime;
    if (value == null) {
        return undefined;
    }
    return toAbsoluteTimeFast(
        base,
        dayOffset(time.departureDays ?? time.arrivalDays),
        value,
    );
}

/** 営業日 0 時からの実時刻を「4 時からの分」に直す */
export function toDiagramMinute(base: Date, at: Date): number {
    return (
        (at.getTime() - base.getTime()) / (60 * 1000) - DIAGRAM_START_HOUR * 60
    );
}

/** `HH:mm:ss` の分の 2 桁 */
export function minuteText(value: string): string {
    return value.slice(3, 5);
}

/**
 * 1 trip 分のダイヤグラム線（SVG polyline 用の点列）を算出する純関数。
 * `buildChainDiagramLines({ trips: [trip], ... })`（build-chain-diagram-lines.util.ts）の
 * 薄い包み（1 本だけの継走）。
 *
 * - 停車点（駅軸上のみ）を stopSequence 順に走査し、着時刻・発時刻それぞれに点を打つ。
 *   同駅で着 分 < 発 分 となるため、そのまま水平線分（停車・待避）が現れる
 * - 駅軸に存在しない stopSequence（路線を跨ぐ列車の他路線区間）は捨てる。
 *   軸の先頭/末尾より外側に停車点が残っている場合は「端点ラベル」を生成する
 * - 描画に使う時刻は `toAbsoluteTimeFast`（鉄道日ユーティリティの toAbsoluteTime と同じ結果）で実体化するため、
 *   24 時超え表記・日またぎも正しく扱える
 */
export function buildTripDiagramLine(params: {
    trip: TripDetailsDto;
    /** 縦の縮尺・最小行高・上の余白を適用済みの駅軸（y はそのまま SVG の y） */
    axis: StationAxis;
    axisStationIds: ReadonlySet<string>;
    /** 営業日の 0 時 */
    base: Date;
    /** 全路線の stationId → 駅名（直通先ラベル用） */
    stationNameById: ReadonlyMap<string, string>;
}): TripDiagramLine | undefined {
    const { trip, axis, axisStationIds, base, stationNameById } = params;
    return buildChainDiagramLines({
        trips: [trip],
        axis,
        axisStationIds,
        base,
        stationNameById,
    })[0];
}
