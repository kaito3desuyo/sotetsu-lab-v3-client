import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import {
    buildSegmentMinutesMap,
    buildStationAxis,
    StationAxis,
} from 'src/app/shared/diagram-scale';
import {
    AXIS_PX_PER_MINUTE_MAX,
    AXIS_PX_PER_MINUTE_MIN,
    clamp,
    DEFAULT_PX_PER_MINUTE,
    PX_PER_MINUTE_MAX,
    PX_PER_MINUTE_MIN,
} from '../utils/diagram-timeline.util';

/**
 * 描画する列車の方向フィルタ。'up'=上り(INBOUND=0) のみ / 'down'=下り(OUTBOUND=1) のみ /
 * 'both'=両方（既定）。tripBlocksByDirection のキー（tripDirection）で絞り込む。
 */
export type DiagramDirectionFilter = 'up' | 'down' | 'both';

type StoreProps = {
    calendarId: string | null;
    /** 選択中の路線 ID 集合（複数選択）。空 = 全路線扱い（網羅駅軸をそのまま表示。絞り込みは全ページで「空＝全部」）。 */
    selectedRouteIds: string[];
    /** 横（時間軸）の縮尺（px/分）。chart 本体の縮尺の一次情報。 */
    pxPerMinute: number;
    /**
     * 縦（駅軸）の縮尺（px/分）。null = 自動（Task 13 フォローアップ: 観測のある駅間の
     * 最小所要分がちょうど最小行高になるよう root 側で決める）。Ctrl+ホイール・ピンチで
     * 明示的に値を入れたら、以後はカレンダー・路線・方向を変えても自動に戻さない。
     */
    axisPxPerMinute: number | null;
    /** 描画する列車の方向フィルタ（上り/下り/両方）。既定 = 両方。 */
    directionFilter: DiagramDirectionFilter;
    /** ServiceService.findOneWithStations 由来の網羅駅（全線時刻表と同一の並び順）。 */
    networkStations: StationDetailsDto[];
    /**
     * 全路線（RouteStationListStateQuery.routeStations$ 由来）。駅軸上で隣接しない
     * 接続駅（分岐駅）を複製挿入する判定（buildStationAxis の routesOrderedStationIds）に使う。
     */
    routeStations: RouteDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    selectedTripId: string | null;
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'TrainDiagramStore' },
    withProps<StoreProps>({
        calendarId: null,
        selectedRouteIds: [],
        pxPerMinute: DEFAULT_PX_PER_MINUTE,
        axisPxPerMinute: null,
        directionFilter: 'both',
        networkStations: [],
        routeStations: [],
        tripClasses: [],
        tripBlocksByDirection: {},
        selectedTripId: null,
        operationSightingTimeCrossSections: {},
        loadingQueue: [],
    }),
);

/**
 * networkStations（ServiceService.findOneWithStations 由来 = operating_systems
 * （運転系統: sequence 順、route + 区間 + 方向を持つ手作業キュレート）から組み立てられた
 * 全線時刻表の駅順）が駅順の一次情報であり、これに対して独自の並べ替えをしてはならない。
 *
 * networkStations の順序を維持したまま、選択路線のいずれかに属する駅だけにフィルタする。
 * 路線を何も選んでいなければ網羅駅軸をそのまま返す（絞り込みは全ページで「空＝全部」。ユーザー指示 2026-10-05）。
 */
function toStationAxisStations(
    networkStations: StationDetailsDto[],
    routeStations: RouteDetailsDto[],
    selectedRouteIds: string[],
): StationDetailsDto[] {
    if (selectedRouteIds.length === 0) {
        return networkStations;
    }
    const selected = new Set(selectedRouteIds);
    const stationIdsInSelectedRoutes = new Set<string>();
    for (const route of routeStations) {
        if (!selected.has(route.routeId)) {
            continue;
        }
        for (const rsl of route.routeStationLists ?? []) {
            const stationId = rsl.station?.stationId ?? rsl.stationId;
            if (stationId) {
                stationIdsInSelectedRoutes.add(stationId);
            }
        }
    }
    return networkStations.filter((station) =>
        stationIdsInSelectedRoutes.has(station.stationId),
    );
}

const stationAxisStations$ = combineLatest([
    store.pipe(select((state) => state.networkStations)),
    store.pipe(select((state) => state.routeStations)),
    store.pipe(select((state) => state.selectedRouteIds)),
]).pipe(
    map(([networkStations, routeStations, selectedRouteIds]) =>
        toStationAxisStations(networkStations, routeStations, selectedRouteIds),
    ),
);

/**
 * 選択路線（未選択=全路線）ごとの順序付き stationId 列。
 * buildStationAxis が「路線内で連続するが軸上で隣接しない接続駅（分岐駅）」を
 * 複製挿入する判定（insertJunctionDuplicates）に使う。軸順の決定には使わない
 * （軸順は networkStations のキュレート順が一次情報）。
 */
function toRoutesOrderedStationIds(
    routeStations: RouteDetailsDto[],
    selectedRouteIds: string[],
): readonly (readonly string[])[] {
    const selected = new Set(selectedRouteIds);
    const routes = selectedRouteIds.length
        ? routeStations.filter((route) => selected.has(route.routeId))
        : routeStations;
    return routes.map((route) =>
        (route.routeStationLists ?? [])
            .map((rsl) => rsl.station?.stationId ?? rsl.stationId)
            .filter((stationId): stationId is string => !!stationId),
    );
}

/**
 * 駅軸（stationId → y 座標。分岐駅は複製された occurrence を複数持ちうる）。
 * 網羅駅軸（選択路線で絞り込み済み）に対し、軸上の停車点を最も多くカバーする代表各停
 * 1 本の times で駅間所要分を比例配分する。直通列車は軸上の全停車駅が同一 axis に載るため、
 * build-trip-diagram-line で連続した 1 本の線として描画される。
 * 本線のみ等、単一路線の列車が分岐区間（他路線専用駅）を跨ぐ場合は、接続駅（分岐駅）を
 * 接続先の直前にも複製挿入し、経由区間の情報欠落を防ぐ（routesOrderedStationIds）。
 */
const stationAxis$ = combineLatest([
    stationAxisStations$,
    store.pipe(select((state) => state.tripBlocksByDirection)),
    store.pipe(select((state) => state.routeStations)),
    store.pipe(select((state) => state.selectedRouteIds)),
]).pipe(
    map(
        ([
            stations,
            tripBlocksByDirection,
            routeStations,
            selectedRouteIds,
        ]): StationAxis | null => {
            if (stations.length === 0) {
                return null;
            }
            const tripsTimes = Object.values(tripBlocksByDirection)
                .flat()
                .flatMap((block) => block.trips ?? [])
                .map((trip) => trip.times ?? []);
            const segmentMinutes = buildSegmentMinutesMap(tripsTimes);
            const routesOrderedStationIds = toRoutesOrderedStationIds(
                routeStations,
                selectedRouteIds,
            );
            return buildStationAxis(
                stations,
                segmentMinutes,
                routesOrderedStationIds,
            );
        },
    ),
);

export const TrainDiagramStore = {
    setCalendarId(calendarId: string | null): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setSelectedRouteIds(routeIds: string[]): void {
        store.update(setProp('selectedRouteIds', () => routeIds));
    },
    setPxPerMinute(value: number): void {
        store.update(
            setProp('pxPerMinute', () =>
                clamp(value, PX_PER_MINUTE_MIN, PX_PER_MINUTE_MAX),
            ),
        );
    },
    /** null を渡すと自動（観測のある駅間の最小所要分から root 側で決める）に戻す。 */
    setAxisPxPerMinute(value: number | null): void {
        store.update(
            setProp('axisPxPerMinute', () =>
                value === null
                    ? null
                    : clamp(
                          value,
                          AXIS_PX_PER_MINUTE_MIN,
                          AXIS_PX_PER_MINUTE_MAX,
                      ),
            ),
        );
    },
    setDirectionFilter(directionFilter: DiagramDirectionFilter): void {
        store.update(setProp('directionFilter', () => directionFilter));
    },
    setNetworkStations(stations: StationDetailsDto[]): void {
        store.update(setProp('networkStations', () => stations));
    },
    setRouteStations(routeStations: RouteDetailsDto[]): void {
        store.update(setProp('routeStations', () => routeStations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setTripBlocksByDirection(
        tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>,
    ): void {
        store.update(
            setProp('tripBlocksByDirection', () => tripBlocksByDirection),
        );
    },
    setSelectedTripId(tripId: string | null): void {
        store.update(setProp('selectedTripId', () => tripId));
    },
    setOperationSightingTimeCrossSection(
        operationNumber: string,
        dto: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('operationSightingTimeCrossSections', (state) => ({
                ...state,
                [operationNumber]: dto,
            })),
        );
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
    },

    calendarId$: store.pipe(select((state) => state.calendarId)),
    selectedRouteIds$: store.pipe(select((state) => state.selectedRouteIds)),
    pxPerMinute$: store.pipe(select((state) => state.pxPerMinute)),
    axisPxPerMinute$: store.pipe(select((state) => state.axisPxPerMinute)),
    directionFilter$: store.pipe(select((state) => state.directionFilter)),
    networkStations$: store.pipe(select((state) => state.networkStations)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    tripBlocksByDirection$: store.pipe(
        select((state) => state.tripBlocksByDirection),
    ),
    selectedTripId$: store.pipe(select((state) => state.selectedTripId)),
    operationSightingTimeCrossSections$: store.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    /**
     * 表示駅軸（駅リスト）。networkStations（全線時刻表順）の順序をそのまま維持し、
     * 選択路線がある場合のみ該当駅にフィルタする（toStationAxisStations 参照）。
     */
    stationAxisStations$,
    /** 表示駅軸の stationId → y 座標マップ。 */
    stationAxis$,

    get calendarId(): string | null {
        return store.getValue().calendarId;
    },
    get selectedRouteIds(): string[] {
        return store.getValue().selectedRouteIds;
    },
    get pxPerMinute(): number {
        return store.getValue().pxPerMinute;
    },
    get axisPxPerMinute(): number | null {
        return store.getValue().axisPxPerMinute;
    },
    get directionFilter(): DiagramDirectionFilter {
        return store.getValue().directionFilter;
    },
    get tripBlocksByDirection(): Record<number, TripBlockDetailsDto[]> {
        return store.getValue().tripBlocksByDirection;
    },
    get selectedTripId(): string | null {
        return store.getValue().selectedTripId;
    },
    get networkStations(): StationDetailsDto[] {
        return store.getValue().networkStations;
    },
    get tripClasses(): TripClassDetailsDto[] {
        return store.getValue().tripClasses;
    },
} as const;
