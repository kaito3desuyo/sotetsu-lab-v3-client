import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withFeature,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
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
     * 全路線（routeStations() 由来）。駅軸上で隣接しない
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
    /** いまのダイヤの列車を取り終えたか（失敗しても true）。取る前は図の代わりに骨組みを出す。保存しない */
    hasFetchedTrainDiagram: boolean;
    /** 車両の前後の運用（運番が変わるつながり）。入出庫の端が乗り移りなら □ で描く。取れなければ空 */
    itineraryLinks: OperationItineraryLinkDto[];
    /** 操作帯を畳んでいるか。これだけを withSettingsStorage で保存する（docs/design.md 列車ダイヤグラム）。 */
    controlCollapsed: boolean;
};

/**
 * 圏外のために端末に保存する中身。条件（calendarId・selectedRouteIds）と画面の設定
 * （縮尺・方向・選択中の列車・操作帯の畳み状態）は入れない。
 */
export type TrainDiagramSnapshot = Pick<
    StoreProps,
    | 'networkStations'
    | 'routeStations'
    | 'tripClasses'
    | 'tripBlocksByDirection'
    | 'itineraryLinks'
>;

/** 圏外のために端末に保存する目撃（運用番号ごと。列車の保存とは別に、日付つきで保存する） */
export type TrainDiagramSightingsSnapshot =
    StoreProps['operationSightingTimeCrossSections'];

const initialState: StoreProps = {
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
    itineraryLinks: [],
    loadingQueue: [],
    hasFetchedTrainDiagram: false,
    controlCollapsed: false,
};

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
function toStationAxis(
    stations: StationDetailsDto[],
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>,
    routeStations: RouteDetailsDto[],
    selectedRouteIds: string[],
): StationAxis | null {
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
    return buildStationAxis(stations, segmentMinutes, routesOrderedStationIds);
}

export const TrainDiagramStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({
            networkStations,
            routeStations,
            selectedRouteIds,
            tripBlocksByDirection,
            loadingQueue,
        }) => {
            /**
             * 表示駅軸（駅リスト）。networkStations（全線時刻表順）の順序をそのまま維持し、
             * 選択路線がある場合のみ該当駅にフィルタする（toStationAxisStations 参照）。
             */
            const stationAxisStations = computed(() =>
                toStationAxisStations(
                    networkStations(),
                    routeStations(),
                    selectedRouteIds(),
                ),
            );

            return {
                isLoading: computed(() => loadingQueue().length > 0),
                stationAxisStations,
                /** 表示駅軸の stationId → y 座標マップ。 */
                stationAxis: computed(() =>
                    toStationAxis(
                        stationAxisStations(),
                        tripBlocksByDirection(),
                        routeStations(),
                        selectedRouteIds(),
                    ),
                ),
            };
        },
    ),
    withMethods((store) => {
        // 列車を取り直す取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、インスタンスでなくストアで数える
        let fetchSeq = 0;

        return {
            /** 列車を取り直す取得を始めるときに世代を進めて、その番号を返す */
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            /** 世代を進めずに、いまの番号を返す（路線・方向だけの取得が使う） */
            currentFetchSeq(): number {
                return fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setCalendarId(calendarId: string | null): void {
                patchState(store, { calendarId });
            },
            setSelectedRouteIds(routeIds: string[]): void {
                patchState(store, { selectedRouteIds: routeIds });
            },
            setPxPerMinute(value: number): void {
                patchState(store, {
                    pxPerMinute: clamp(
                        value,
                        PX_PER_MINUTE_MIN,
                        PX_PER_MINUTE_MAX,
                    ),
                });
            },
            /** null を渡すと自動（観測のある駅間の最小所要分から root 側で決める）に戻す。 */
            setAxisPxPerMinute(value: number | null): void {
                patchState(store, {
                    axisPxPerMinute:
                        value === null
                            ? null
                            : clamp(
                                  value,
                                  AXIS_PX_PER_MINUTE_MIN,
                                  AXIS_PX_PER_MINUTE_MAX,
                              ),
                });
            },
            setDirectionFilter(directionFilter: DiagramDirectionFilter): void {
                patchState(store, { directionFilter });
            },
            setNetworkStations(stations: StationDetailsDto[]): void {
                patchState(store, { networkStations: stations });
            },
            setRouteStations(routeStations: RouteDetailsDto[]): void {
                patchState(store, { routeStations });
            },
            setTripClasses(tripClasses: TripClassDetailsDto[]): void {
                patchState(store, { tripClasses });
            },
            setTripBlocksByDirection(
                tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>,
            ): void {
                patchState(store, { tripBlocksByDirection });
            },
            setItineraryLinks(
                itineraryLinks: OperationItineraryLinkDto[],
            ): void {
                patchState(store, { itineraryLinks });
            },
            setSelectedTripId(tripId: string | null): void {
                patchState(store, { selectedTripId: tripId });
            },
            setOperationSightingTimeCrossSection(
                operationNumber: string,
                dto: OperationSightingTimeCrossSectionDto,
            ): void {
                patchState(store, (state) => ({
                    operationSightingTimeCrossSections: {
                        ...state.operationSightingTimeCrossSections,
                        [operationNumber]: dto,
                    },
                }));
            },
            enableLoading(): void {
                patchState(store, (state) => ({
                    loadingQueue: state.loadingQueue.concat(true),
                }));
            },
            disableLoading(): void {
                patchState(store, (state) => ({
                    loadingQueue: state.loadingQueue.slice(1),
                }));
            },
            resetLoading(): void {
                patchState(store, { loadingQueue: [] });
            },
            /** いまのダイヤの列車を取り終えたか（失敗しても true）。取る前は図の代わりに骨組みを出す */
            setHasFetchedTrainDiagram(value: boolean): void {
                patchState(store, { hasFetchedTrainDiagram: value });
            },
            setControlCollapsed(collapsed: boolean): void {
                patchState(store, { controlCollapsed: collapsed });
            },
            /** 圏外のために保存する中身を取り出す */
            snapshot(): TrainDiagramSnapshot {
                return {
                    networkStations: store.networkStations(),
                    routeStations: store.routeStations(),
                    tripClasses: store.tripClasses(),
                    tripBlocksByDirection: store.tripBlocksByDirection(),
                    itineraryLinks: store.itineraryLinks(),
                };
            },
            /** 保存した中身を戻す（条件の calendarId・selectedRouteIds と画面の設定は今のまま） */
            restoreSnapshot(data: TrainDiagramSnapshot): void {
                patchState(store, {
                    networkStations: data.networkStations,
                    routeStations: data.routeStations,
                    tripClasses: data.tripClasses,
                    tripBlocksByDirection: data.tripBlocksByDirection,
                    itineraryLinks: data.itineraryLinks,
                });
            },
            /** 圏外のために保存する目撃を取り出す */
            snapshotOperationSightingTimeCrossSections(): TrainDiagramSightingsSnapshot {
                return store.operationSightingTimeCrossSections();
            },
            /** 保存した目撃に置き換える */
            restoreOperationSightingTimeCrossSections(
                data: TrainDiagramSightingsSnapshot,
            ): void {
                patchState(store, { operationSightingTimeCrossSections: data });
            },
        };
    }),
    // 保存するのは操作帯の開閉だけ。全部保存すると列車データ（数 MB）まで書き、
    // 開いたときに前のダイヤ・路線へ戻ってしまう
    withSettingsStorage<StoreProps>({
        key: 'TrainDiagramStore',
        fields: ['controlCollapsed'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'TrainDiagram',
                select: () => store.snapshot(),
                apply: (data: TrainDiagramSnapshot) =>
                    store.restoreSnapshot(data),
            },
            // 目撃は Service Worker に残らないので、列車の保存とは別に日付つきで保存する。
            // 戻した目撃は、すでに取れている目撃を上書きしない
            sightings: {
                key: 'TrainDiagramSightings',
                select: () =>
                    store.snapshotOperationSightingTimeCrossSections(),
                apply: (data: TrainDiagramSightingsSnapshot) =>
                    store.restoreOperationSightingTimeCrossSections({
                        ...data,
                        ...store.operationSightingTimeCrossSections(),
                    }),
            },
        }),
    ),
    withAppDevtools('TrainDiagramStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
