import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import {
    applyRouteDiagramStationAliases,
    RouteDiagramStationAliases,
} from '../utils/operation-route-diagram-curate-stations.util';
import { relatedRouteIds } from '../utils/operation-route-diagram-related-route-ids.util';
import { visitedRouteIds } from '../utils/operation-route-diagram-visited-route-ids.util';

type StoreProps = {
    operationId: string | null;
    operationTrips: OperationTripsDto | null;
    itineraryLinks: OperationItineraryLinkDto[];
    stations: StationDetailsDto[];
    stationAliases: RouteDiagramStationAliases;
    selectedRouteIds: string[];
    hasFetchedOperationTrips: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。条件（operationId）と画面の状態
 * （選択中の路線・取得済みの印・読み込み中）は入れない。
 */
export type OperationRouteDiagramSnapshot = Pick<
    StoreProps,
    'operationTrips' | 'itineraryLinks' | 'stations' | 'stationAliases'
>;

const store = createStore(
    { name: 'OperationRouteDiagramStore' },
    withProps<StoreProps>({
        operationId: null,
        operationTrips: null,
        itineraryLinks: [],
        stations: [],
        stationAliases: {},
        selectedRouteIds: [],
        hasFetchedOperationTrips: false,
        loadingQueue: [],
    }),
);

/**
 * 運用の行路。始発・終着の駅 ID は縦軸の列の駅 ID に読み替えてある
 * （路線ごとに別の駅として登録された駅を 1 列にまとめたため。curate-stations.util 参照）。
 */
function tripsOf(
    state: Pick<StoreProps, 'operationTrips' | 'stationAliases'>,
): TripOperationListDetailsDto[] {
    return applyRouteDiagramStationAliases(
        state.operationTrips?.trips ?? [],
        state.stationAliases,
    );
}

function extractRouteOptions(
    stations: StationDetailsDto[],
): FilterChipOption[] {
    const seen = new Map<string, string>();

    for (const station of stations) {
        for (const rsl of station.routeStationLists ?? []) {
            if (rsl.route?.routeId && !seen.has(rsl.route.routeId)) {
                seen.set(rsl.route.routeId, rsl.route.routeName ?? '');
            }
        }
    }

    return Array.from(seen.entries()).map(([routeId, routeName]) => ({
        value: routeId,
        label: routeName,
    }));
}

export const OperationRouteDiagramStore = {
    setOperationId(operationId: string): void {
        store.update(setProp('operationId', () => operationId));
    },
    setOperationTrips(operationTrips: OperationTripsDto | null): void {
        store.update(setProp('operationTrips', () => operationTrips));
    },
    setItineraryLinks(itineraryLinks: OperationItineraryLinkDto[]): void {
        store.update(setProp('itineraryLinks', () => itineraryLinks));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setStationAliases(stationAliases: RouteDiagramStationAliases): void {
        store.update(setProp('stationAliases', () => stationAliases));
    },
    setSelectedRouteIds(routeIds: FilterChipValue[]): void {
        store.update(setProp('selectedRouteIds', () => routeIds as string[]));
    },
    /**
     * B5: 既定 ON =「当該運用が経由する路線のみ」。
     * operationTrips と stations の両方が揃った後（fetchData 完了後）に呼ぶ。
     */
    initializeSelectedRouteIds(): void {
        const state = store.getValue();
        const routeIds = visitedRouteIds(state.stations, tripsOf(state));
        store.update(setProp('selectedRouteIds', () => routeIds));
    },
    /** いまの運用の取得が終わったか（失敗しても true）。取る前は図と路線のチップの代わりに骨組みを出す */
    setHasFetchedOperationTrips(value: boolean): void {
        store.update(setProp('hasFetchedOperationTrips', () => value));
    },
    /** 圏外のために保存する中身を取り出す */
    snapshot(): OperationRouteDiagramSnapshot {
        const { operationTrips, itineraryLinks, stations, stationAliases } =
            store.getValue();
        return { operationTrips, itineraryLinks, stations, stationAliases };
    },
    /** 保存した中身を戻す（条件の operationId は今のまま） */
    restoreSnapshot(data: OperationRouteDiagramSnapshot): void {
        store.update((state) => ({
            ...state,
            operationTrips: data.operationTrips,
            itineraryLinks: data.itineraryLinks,
            stations: data.stations,
            stationAliases: data.stationAliases,
        }));
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

    operationId$: store.pipe(select((state) => state.operationId)),
    calendar$: store.pipe(
        select((state) => state.operationTrips?.operation?.calendar),
    ),
    operation$: store.pipe(select((state) => state.operationTrips?.operation)),
    tripOperationLists$: store.pipe(
        select((state) =>
            state.operationTrips?.trips ? tripsOf(state) : undefined,
        ),
    ),
    itineraryLinks$: store.pipe(select((state) => state.itineraryLinks)),
    stations$: store.pipe(select((state) => state.stations)),
    selectedRouteIds$: store.pipe(select((state) => state.selectedRouteIds)),
    hasFetchedOperationTrips$: store.pipe(
        select((state) => state.hasFetchedOperationTrips),
    ),
    /** 運用番号があって、まだ取り終えていない（骨組みを出すとき） */
    isAwaitingOperationTrips$: store.pipe(
        select(
            (state) => !!state.operationId && !state.hasFetchedOperationTrips,
        ),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    /**
     * 路線を何も選んでいなければ、この運用が経由する路線の駅を全部出す（押せるチップを全部選んだのと同じ）。
     * 経由しない路線の駅は出さない（ユーザー指示 2026-10-05）。
     */
    visibleStations$: combineLatest([
        store.pipe(select((state) => state.stations)),
        store.pipe(select((state) => state.selectedRouteIds)),
        store.pipe(select(tripsOf)),
    ]).pipe(
        map(([stations, selectedRouteIds, trips]) =>
            visibleStations(
                stations,
                selectedRouteIds.length
                    ? selectedRouteIds
                    : visitedRouteIds(stations, trips),
            ),
        ),
    ),

    // P8-3: チップの表示自体を「当該運用に関連する路線」のみへ絞り込む。
    // 関連路線の判定基準は operation-route-diagram-related-route-ids.util.ts 参照。
    routeOptions$: combineLatest([
        store.pipe(select((state) => state.stations)),
        store.pipe(select(tripsOf)),
    ]).pipe(
        map(([stations, trips]) => {
            const visited = new Set(visitedRouteIds(stations, trips));
            const related = new Set(relatedRouteIds(stations, trips));

            return extractRouteOptions(stations)
                .filter((option) => related.has(String(option.value)))
                .map((option) => ({
                    ...option,
                    disabled: !visited.has(String(option.value)),
                }));
        }),
    ),

    get operationId(): string | null {
        return store.getValue().operationId;
    },
    get calendarId(): CalendarDetailsDto['calendarId'] | undefined {
        return store.getValue().operationTrips?.operation?.calendarId;
    },
    get operation(): OperationDetailsDto | undefined {
        return store.getValue().operationTrips?.operation;
    },
    get stations(): StationDetailsDto[] {
        return store.getValue().stations;
    },
    get tripOperationLists(): TripOperationListDetailsDto[] {
        return store.getValue().operationTrips?.trips ?? [];
    },
} as const;
