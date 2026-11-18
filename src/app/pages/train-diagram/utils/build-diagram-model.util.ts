import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { railwayDayStart } from 'src/app/core/utils/railway-day';
import {
    enforceMinimumRowGap,
    StationAxis,
    StationAxisEntry,
} from 'src/app/shared/diagram-scale';
import { findContinuations } from 'src/app/shared/train-position.util';
import { DiagramStationRow } from '../components/train-diagram-chart/train-diagram-chart.component';
import { TrainDiagramSelectedTripInfo } from '../interfaces/train-diagram-selected-trip-info.interface';
import { DiagramDirectionFilter } from '../stores/train-diagram.store';
import {
    buildChainDiagramLines,
    buildChainStopIndexObservations,
} from './build-chain-diagram-lines.util';
import { TripDiagramLine } from './build-trip-diagram-line.util';
import {
    AXIS_PX_PER_MINUTE_MAX,
    AXIS_PX_PER_MINUTE_MIN,
    DEFAULT_AXIS_PX_PER_MINUTE,
    resolveAxisPxPerMinute,
} from './diagram-timeline.util';
import {
    ensureTurnbackClearance,
    TurnbackClearanceResult,
} from './ensure-turnback-clearance.util';
import { buildStandardRunMinutes } from './estimate-passing-times.util';
import { filterTripBlocksByDirection } from './filter-trip-blocks-by-direction.util';
import { findTurnbacks } from './find-turnbacks.util';
import {
    fitStationAxisToTrips,
    hasObservationByGap,
    StationAxisObservation,
} from './fit-station-axis.util';
import { TurnbackLink } from './layout-turnback-links.util';
import { mergeSameDirectionContinuations } from './merge-same-direction-continuations.util';

const BODY_TOP_PADDING = 12;
const BODY_BOTTOM_PADDING = 24;
/**
 * 駅ラベル行の最小ピクセル高さ（G7: 駅軸ラベルの重なり解消）。
 * 12px の tw-text-xs ラベルが重ならない最小値（Task 13 フィックス: 22→16。
 * ラベルは [style.top.px]="row.y - 6" で行の中心に来るため、16px 間隔でも
 * ラベル同士の間に 4px 残り重ならない）。所要時間比は維持しつつ、
 * 高速通過区間で駅間隔が潰れる場合のみこの値まで底上げする（enforceMinimumRowGap）。
 * また、縦の縮尺が自動（axisPxPerMinute が null）のときは、この値ぴったりに
 * 観測のある駅間の最小所要分を合わせる基準にもなる。
 */
const MIN_ROW_HEIGHT_PX = 16;

/** Task 14: 折り返しの⊐字リンクの段の深さの刻み幅（px）。段 k（0始まり）の深さ=(k+1)×この値。 */
const TURNBACK_LANE_STEP_PX = 4;

/**
 * task-17（ユーザー指示: 「折り返し線がある行はある程度高さを確保しておいたほうがいい」）:
 * ⊐字リンクの張り出しの深さに対して、隣の行との隙間に確保する最小の余白（px）。
 */
const TURNBACK_MIN_CLEARANCE_PX = 8;

/** 図の組み立てに渡す値。同じ入力には同じ出力を返す（手書きのメモ化だけは呼ぶ側が持つ）。 */
export interface DiagramModelInput {
    /** 方向フィルタ前の trip block（キーは tripDirection） */
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    /** 駅軸（各停基準の初期値）。無ければ空の図 */
    stationAxis: StationAxis | null;
    stationNameById: ReadonlyMap<string, string>;
    /** 縦の縮尺の手動値（null = 自動） */
    axisPxPerMinute: number | null;
    directionFilter: DiagramDirectionFilter;
    selectedTripId: string | null;
    /** 線の座標の起点（railwayDayStart(now)）に使う */
    now: Date;
    /** 車両の前後の運用（運番変更の判定・つなぎ直しに使う） */
    itineraryLinks: readonly OperationItineraryLinkDto[];
    /** 選んだ列車の充当編成の情報（運用番号ごと） */
    operationSightingTimeCrossSections: Readonly<
        Record<string, OperationSightingTimeCrossSectionDto>
    >;
    /** 選んだ calendar が今日のダイヤか（編成・目撃時刻を出すかの判定） */
    isTodaySelected: boolean;
    calendarId: string | null;
    /**
     * つながりごとの観測の覚え書きを返す（駅軸の並びの鍵ごと）。観測は列車の times と駅の並び
     * だけで決まるため、方向を切り替えても作り直さずに済む。置き場は呼ぶ側が持つ。
     */
    observationCacheFor: (
        axisKey: string,
    ) => Map<string, StationAxisObservation[]>;
}

export interface DiagramModel {
    /** 縦の縮尺（px/分）。手動値、無ければ観測のある駅間の最小所要分から自動で決めた値 */
    effectiveAxisPxPerMinute: number;
    stationRows: DiagramStationRow[];
    bodyHeight: number;
    diagramLines: TripDiagramLine[];
    turnbackLinks: TurnbackLink[];
    hasDeadhead: boolean;
    hasDepotOut: boolean;
    hasDepotIn: boolean;
    hasTransfer: boolean;
    selectedTripInfo: TrainDiagramSelectedTripInfo | null;
    tripIdsByChainOf: ReadonlyMap<string, ReadonlySet<string>>;
}

/** 縮尺にも方向にも依らない土台（列車データと運用のつながりだけで決まる）。 */
export interface DiagramBase {
    /** 方向フィルタ前の全列車 */
    allTrips: TripDetailsDto[];
    /** tripId → そのつながり（方向フィルタ前）の先頭・末尾の tripId。findTurnbacks 用 */
    chainHeadOf: ReadonlyMap<string, string>;
    chainTailOf: ReadonlyMap<string, string>;
    /** 隣り合う 2 駅の標準の運転時間（方向フィルタ前の全列車の実時刻の中央値） */
    standardRunMinutes: ReturnType<typeof buildStandardRunMinutes>;
}

/** 縦の縮尺に依らない前段（方向フィルタ後のつながり・観測・最小二乗で合わせた軸）。 */
export interface DiagramPrelude {
    /** 方向フィルタ後のつながり */
    chains: TripDetailsDto[][];
    tripIdsByChainOf: ReadonlyMap<string, ReadonlySet<string>>;
    /** tripId → そのつながりの最後の列車の最後の停車駅 */
    finalDestinationStationIdByTripId: ReadonlyMap<string, string>;
    /** 最小二乗で合わせた駅軸（駅軸が無ければ null） */
    fittedAxis: StationAxis | null;
    /** 駅間 j→j+1 を直接覆う観測が 1 件でもあるか */
    gapHasObservation: boolean[];
    /** 観測のある駅間のうち最小の所要分（無ければ undefined） */
    smallestObservedGapMinutes: number | undefined;
}

/** 縦の縮尺を受けて座標を出す後段の結果。 */
export type DiagramLayout = Omit<
    DiagramModel,
    'selectedTripInfo' | 'tripIdsByChainOf'
>;

export function buildDiagramBase(input: {
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    itineraryLinks: readonly OperationItineraryLinkDto[];
}): DiagramBase {
    const allBlocks = Object.values(input.tripBlocksByDirection).flat();
    const allTrips = allBlocks.flatMap((block) => block.trips ?? []);
    // Task 14: 方向フィルタ前の全 trip block から作ったつながり（findTurnbacks は上り・下り両方が要る）
    const allChains = buildChains(allBlocks, input.itineraryLinks);
    return {
        allTrips,
        chainHeadOf: buildChainEndOf(allChains, 'head'),
        chainTailOf: buildChainEndOf(allChains, 'tail'),
        standardRunMinutes: buildStandardRunMinutes(allTrips),
    };
}

function buildChains(
    blocks: readonly TripBlockDetailsDto[],
    itineraryLinks: readonly OperationItineraryLinkDto[],
): TripDetailsDto[][] {
    const nextByTripId = findContinuations(blocks);
    const prevTripIdByTripId = new Map<string, string>();
    for (const [currentTripId, nextTrip] of nextByTripId) {
        if (nextTrip.tripId !== undefined) {
            prevTripIdByTripId.set(nextTrip.tripId, currentTripId);
        }
    }

    const visited = new Set<string>();
    const chains: TripDetailsDto[][] = [];
    for (const block of blocks) {
        for (const trip of block.trips ?? []) {
            if (
                trip.tripId === undefined ||
                visited.has(trip.tripId) ||
                prevTripIdByTripId.has(trip.tripId)
            ) {
                continue;
            }
            const chain: TripDetailsDto[] = [];
            let current: TripDetailsDto | undefined = trip;
            while (
                current &&
                current.tripId !== undefined &&
                !visited.has(current.tripId)
            ) {
                visited.add(current.tripId);
                chain.push(current);
                current = nextByTripId.get(current.tripId);
            }
            chains.push(chain);
        }
    }
    // 循環等で上のループに乗らなかった trip（理論上起きないが、型安全のためのフォールバック）
    for (const block of blocks) {
        for (const trip of block.trips ?? []) {
            if (trip.tripId !== undefined && !visited.has(trip.tripId)) {
                visited.add(trip.tripId);
                chains.push([trip]);
            }
        }
    }
    return mergeSameDirectionContinuations(chains, itineraryLinks);
}

/** tripId → そのつながり（方向フィルタ前）の端の tripId。findTurnbacks 用。 */
function buildChainEndOf(
    chains: readonly TripDetailsDto[][],
    end: 'head' | 'tail',
): ReadonlyMap<string, string> {
    const map = new Map<string, string>();
    for (const chain of chains) {
        const endTripId = (end === 'head' ? chain[0] : chain[chain.length - 1])
            ?.tripId;
        if (endTripId === undefined) {
            continue;
        }
        for (const trip of chain) {
            if (trip.tripId !== undefined) {
                map.set(trip.tripId, endTripId);
            }
        }
    }
    return map;
}

/** 縦の縮尺に依らない前段。方向・列車データ・駅軸・運用のつながりが変わったときだけ作り直す。 */
export function buildDiagramPrelude(input: {
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    stationAxis: StationAxis | null;
    directionFilter: DiagramDirectionFilter;
    itineraryLinks: readonly OperationItineraryLinkDto[];
    observationCacheFor: DiagramModelInput['observationCacheFor'];
}): DiagramPrelude {
    const { stationAxis } = input;
    const filteredBlocks = filterTripBlocksByDirection(
        input.tripBlocksByDirection,
        input.directionFilter,
    );
    const chains = buildChains(
        Object.values(filteredBlocks).flat(),
        input.itineraryLinks,
    );

    const tripIdsByChainOf = new Map<string, ReadonlySet<string>>();
    const finalDestinationStationIdByTripId = new Map<string, string>();
    for (const chain of chains) {
        const ids = new Set(
            chain
                .map((trip) => trip.tripId)
                .filter((id): id is string => id !== undefined),
        );
        for (const id of ids) {
            tripIdsByChainOf.set(id, ids);
        }
        const lastTrip = chain[chain.length - 1];
        const times = [...(lastTrip.times ?? [])].sort(
            (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
        );
        const lastStationId = times[times.length - 1]?.stationId;
        if (!lastStationId) {
            continue;
        }
        for (const trip of chain) {
            if (trip.tripId !== undefined) {
                finalDestinationStationIdByTripId.set(
                    trip.tripId,
                    lastStationId,
                );
            }
        }
    }

    if (!stationAxis) {
        return {
            chains,
            tripIdsByChainOf,
            finalDestinationStationIdByTripId,
            fittedAxis: null,
            gapHasObservation: [],
            smallestObservedGapMinutes: undefined,
        };
    }

    // Task 13: 表示中の列車の走行区間から観測を作る
    // （分断されていない隣り合う2停車ごとに1件。同じ駅の2行間の跳びは含まない）。
    const axisStationOrder = stationAxis.map((entry) => entry.stationId);
    const observationByChain = input.observationCacheFor(
        axisStationOrder.join(','),
    );
    const observations = chains.flatMap((chain) => {
        const key = chain.map((trip) => trip.tripId).join('>');
        let chainObservations = observationByChain.get(key);
        if (chainObservations === undefined) {
            chainObservations = buildChainStopIndexObservations(
                chain,
                axisStationOrder,
            );
            observationByChain.set(key, chainObservations);
        }
        return chainObservations;
    });

    // 「列車ごとに速さが一定なら線はまっすぐ」に最もよく合う駅間へ最小二乗で合わせ直した軸
    const fittedAxis = fitStationAxisToTrips({
        axis: stationAxis,
        observations,
    });
    const gapHasObservation = hasObservationByGap(
        observations,
        stationAxis.length,
    );
    let smallest: number | undefined;
    for (let j = 0; j < gapHasObservation.length; j++) {
        if (!gapHasObservation[j]) {
            continue;
        }
        const gap = fittedAxis[j + 1].y - fittedAxis[j].y;
        if (smallest === undefined || gap < smallest) {
            smallest = gap;
        }
    }
    return {
        chains,
        tripIdsByChainOf,
        finalDestinationStationIdByTripId,
        fittedAxis,
        gapHasObservation,
        smallestObservedGapMinutes: smallest,
    };
}

/** 縦の縮尺を受けて座標（駅の行・線・折り返し）を出す後段。横の縮尺・スクロール・選択では作り直さない。 */
export function buildDiagramLayout(input: {
    base: DiagramBase;
    prelude: DiagramPrelude;
    axisPxPerMinute: number | null;
    stationNameById: ReadonlyMap<string, string>;
    itineraryLinks: readonly OperationItineraryLinkDto[];
    now: Date;
}): DiagramLayout {
    const { base, prelude, stationNameById, itineraryLinks } = input;
    const { fittedAxis } = prelude;
    // Task 13 フィックス: 縦の縮尺（px/分）。手動値があればそれを使い、無ければ
    // 観測のある駅間の最小所要分が最小行高ちょうどになるよう自動で決める。
    const effectiveAxisPxPerMinute = resolveAxisPxPerMinute({
        manual: input.axisPxPerMinute,
        smallestObservedGapMinutes: prelude.smallestObservedGapMinutes,
        targetPx: MIN_ROW_HEIGHT_PX,
        defaultValue: DEFAULT_AXIS_PX_PER_MINUTE,
        min: AXIS_PX_PER_MINUTE_MIN,
        max: AXIS_PX_PER_MINUTE_MAX,
    });
    if (!fittedAxis) {
        return {
            effectiveAxisPxPerMinute,
            ...summarize(
                emptyTurnbackClearance(),
                stationNameById,
                base.allTrips,
            ),
        };
    }

    const pixelAxis = buildPixelAxis(
        fittedAxis,
        prelude.gapHasObservation,
        effectiveAxisPxPerMinute,
    );
    const axisStationIds: ReadonlySet<string> = new Set(
        pixelAxis.map((e) => e.stationId),
    );

    // Task 14: 折り返し。方向フィルタ前の全列車から求める（上り・下り両方が要るため）。
    const turnbacks = findTurnbacks({
        trips: base.allTrips,
        chainHeadOf: base.chainHeadOf,
        chainTailOf: base.chainTailOf,
        axisStationIds,
        itineraryLinks,
    });

    const baseTime = railwayDayStart(input.now);
    const rawLines = prelude.chains.flatMap((chain) =>
        buildChainDiagramLines({
            trips: chain,
            axis: pixelAxis,
            axisStationIds,
            base: baseTime,
            stationNameById,
            standardRunMinutes: base.standardRunMinutes,
            itineraryLinks,
        }),
    );

    // task-17: 折り返しの⊐字リンクが隣の行・その行の線と衝突しないよう、必要な行だけ隙間を広げる
    // （DP はやり直さず y だけ新しい行へ移し替える）。stationRows・bodyHeight は調整後の軸を使う。
    const clearance = ensureTurnbackClearance({
        axis: pixelAxis,
        lines: rawLines,
        turnbacks,
        laneStepPx: TURNBACK_LANE_STEP_PX,
        minClearancePx: TURNBACK_MIN_CLEARANCE_PX,
        topPaddingPx: BODY_TOP_PADDING,
        bottomPaddingPx: BODY_BOTTOM_PADDING,
    });
    return {
        effectiveAxisPxPerMinute,
        ...summarize(clearance, stationNameById, base.allTrips),
    };
}

function emptyTurnbackClearance(): TurnbackClearanceResult {
    return {
        axis: [],
        lines: [],
        links: [],
        widenedGaps: [],
        extraTopPx: 0,
        extraBottomPx: 0,
    };
}

/**
 * 縦の縮尺・最小行高・上の余白を適用した駅軸（y はそのまま SVG の y）。
 * Task 13 フィックス: 観測の無い駅間は、λ の正則化で初期値へ引き寄せられた分の値を
 * そのまま使わず、最小行高ぴったりに圧縮する。
 * Task 14 フィックス（コントローラ判断）: 圧縮の対象は「観測ゼロ **かつ**
 * その駅間の片方の端が複製した駅の行（軸に 2 回以上出る stationId）」だけにする。
 */
function buildPixelAxis(
    axis: StationAxis,
    gapHasObservation: readonly boolean[],
    px: number,
): StationAxis {
    const occurrenceCountByStationId = new Map<string, number>();
    for (const entry of axis) {
        occurrenceCountByStationId.set(
            entry.stationId,
            (occurrenceCountByStationId.get(entry.stationId) ?? 0) + 1,
        );
    }
    const isDuplicatedRow = (index: number): boolean =>
        (occurrenceCountByStationId.get(axis[index].stationId) ?? 0) > 1;
    const entries: StationAxisEntry[] = [];
    let y = 0;
    axis.forEach((entry, index) => {
        if (index > 0) {
            const hasObservation = gapHasObservation[index - 1] ?? false;
            const gapMinutes = axis[index].y - axis[index - 1].y;
            const isSeamGap =
                !hasObservation &&
                (isDuplicatedRow(index - 1) || isDuplicatedRow(index));
            y += isSeamGap ? MIN_ROW_HEIGHT_PX : gapMinutes * px;
        }
        entries.push({
            stationId: entry.stationId,
            y,
            isDuplicate: entry.isDuplicate,
        });
    });
    return enforceMinimumRowGap(entries, MIN_ROW_HEIGHT_PX).map((entry) => ({
        ...entry,
        y: entry.y + BODY_TOP_PADDING,
    }));
}

/** 衝突回避後の軸と線から、公開する値（駅の行・高さ・凡例の条件）を作る。 */
function summarize(
    clearance: TurnbackClearanceResult,
    stationNameById: ReadonlyMap<string, string>,
    allTrips: readonly TripDetailsDto[],
): Pick<
    DiagramModel,
    | 'stationRows'
    | 'bodyHeight'
    | 'diagramLines'
    | 'turnbackLinks'
    | 'hasDeadhead'
    | 'hasDepotOut'
    | 'hasDepotIn'
    | 'hasTransfer'
> {
    const axis = clearance.axis;
    const maxY = axis.length ? Math.max(...axis.map((e) => e.y)) : 0;
    const lines = clearance.lines;
    const drawn = new Set(lines.map((l) => l.tripId));
    return {
        stationRows: axis.map((entry) => ({
            stationId: entry.stationId,
            stationName: stationNameById.get(entry.stationId) ?? '',
            y: entry.y,
        })),
        bodyHeight: maxY + BODY_BOTTOM_PADDING + clearance.extraBottomPx,
        diagramLines: lines,
        turnbackLinks: clearance.links,
        // 凡例の回送見本の表示条件（種別ごとの色分けの凡例は出さない。task-15）
        hasDeadhead: allTrips.some(
            (t) =>
                t.tripId !== undefined &&
                drawn.has(t.tripId) &&
                t.tripClassId === undefined,
        ),
        hasDepotOut: lines.some((line) =>
            line.depotMarks.some(
                (mark) => mark.kind === 'out' && !mark.transfer,
            ),
        ),
        hasDepotIn: lines.some((line) =>
            line.depotMarks.some(
                (mark) => mark.kind === 'in' && !mark.transfer,
            ),
        ),
        hasTransfer: lines.some((line) =>
            line.depotMarks.some((mark) => mark.transfer),
        ),
    };
}

/** 選んだ列車の情報（情報カード用）。選んでいない・見つからないときは null。 */
export function buildSelectedTripInfo(
    source: Pick<DiagramBase, 'allTrips'> &
        Pick<DiagramPrelude, 'finalDestinationStationIdByTripId'>,
    input: Pick<
        DiagramModelInput,
        | 'selectedTripId'
        | 'stationNameById'
        | 'operationSightingTimeCrossSections'
        | 'isTodaySelected'
        | 'calendarId'
    >,
): TrainDiagramSelectedTripInfo | null {
    const tripId = input.selectedTripId;
    if (!tripId) {
        return null;
    }
    const trip = source.allTrips.find((t) => t.tripId === tripId);
    if (!trip) {
        return null;
    }

    const times = [...(trip.times ?? [])].sort(
        (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
    );
    const lastStationId = times[times.length - 1]?.stationId;
    // Task 14: 種別変更・列番変更で続く列車があれば、その最後の列車の最後の
    // 停車駅を行先にする（無ければこの列車自身の終着）。
    const destinationStationId =
        source.finalDestinationStationIdByTripId.get(tripId) ?? lastStationId;
    const destinationName = destinationStationId
        ? (input.stationNameById.get(destinationStationId) ?? '')
        : '';

    const tripOperationList = trip.tripOperationLists?.[0];
    const operationId = tripOperationList?.operationId;
    const operationNumber = tripOperationList?.operation?.operationNumber;
    const expectedSighting = operationNumber
        ? input.operationSightingTimeCrossSections[operationNumber]
              ?.expectedSighting
        : undefined;
    const formationNumber = expectedSighting?.formation?.formationNumber;

    return {
        tripId,
        tripNumber: trip.tripNumber ?? '',
        tripClassName: trip.tripClass?.tripClassName ?? '',
        tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
        destinationName,
        operationId,
        operationNumber,
        formationNumber: input.isTodaySelected ? formationNumber : undefined,
        sightingTime: input.isTodaySelected
            ? expectedSighting?.sightingTime
            : undefined,
        detailLink: [
            '/timetable',
            'all-line',
            {
                calendar_id: input.calendarId ?? '',
                trip_direction: String(trip.tripDirection ?? ''),
                trip_block_id: trip.tripBlockId ?? '',
            },
        ],
    };
}

/** 図の組み立て全体（線・折り返し・駅の行・凡例の条件・選んだ列車の情報）。 */
export function buildDiagramModel(input: DiagramModelInput): DiagramModel {
    const base = buildDiagramBase(input);
    const prelude = buildDiagramPrelude(input);
    const layout = buildDiagramLayout({ ...input, base, prelude });
    return {
        ...layout,
        tripIdsByChainOf: prelude.tripIdsByChainOf,
        selectedTripInfo: buildSelectedTripInfo(
            {
                allTrips: base.allTrips,
                finalDestinationStationIdByTripId:
                    prelude.finalDestinationStationIdByTripId,
            },
            input,
        ),
    };
}
