import { PageEvent } from '@angular/material/paginator';
import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import { ownAgencyRouteIds } from 'src/app/shared/own-agency-route-ids.util';
import { hasVisibleStop, tripEndpoints } from '../utils/trip-endpoints.util';
import { traversedRouteIds } from '../utils/traversed-route-ids.util';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

type StoreProps = {
    calendarId: CalendarDetailsDto['calendarId'] | null;
    tripDirection: TripDetailsDto['tripDirection'] | null;
    tripBlockId: TripBlockDetailsDto['tripBlockId'] | null;
    stations: StationDetailsDto[];
    agencies: AgencyDetailsDto[];
    /** 路線チップの並び順（routeId）。ハンバーガーメニューの駅名選択・列車位置情報と同じ順 */
    routeOrder: string[];
    tripBlocks: TripBlockDetailsDto[];
    selectedRouteIds: string[];
    pageSettings: PageEvent;
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'TimetableAllLineStore' },
    withProps<StoreProps>({
        calendarId: null,
        tripDirection: null,
        tripBlockId: null,
        stations: [],
        agencies: [],
        routeOrder: [],
        tripBlocks: [],
        selectedRouteIds: [],
        pageSettings: {
            pageIndex: 0,
            pageSize: 10,
            length: 0,
        },
        loadingQueue: [],
    }),
);

/** 表示方向に並べ替えた駅リスト（上り = 逆順）。 */
function orderStations(
    stations: StationDetailsDto[],
    tripDirection: TripDetailsDto['tripDirection'] | null,
): StationDetailsDto[] {
    return tripDirection === 0 ? [...stations].reverse() : stations;
}

/** 選択路線で絞り込んだ表示駅。未選択（初期化前）は全駅を表示する。 */
function toVisibleStations(
    orderedStations: StationDetailsDto[],
    selectedRouteIds: string[],
): StationDetailsDto[] {
    if (!selectedRouteIds.length) {
        return orderedStations;
    }
    return visibleStations(orderedStations, selectedRouteIds);
}

/**
 * ダイヤ並び替え済みの全列車（ページング前）。列は路線絞り込みの影響を受けない
 * （並びは全駅で決め、絞り込みは行を隠すだけ）。並べ方は sort-trips.util.ts を参照。
 */
function sortedAllTrips(
    orderedStations: StationDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
): TripDetailsDto[] {
    return TimetableAllLineUtil.sortTrips(orderedStations, tripBlocks).flatMap(
        (tripBlock) => tripBlock.trips,
    );
}

/** 駅の所属路線を、駅の並び順で重複なく集める（routeId・路線名・会社）。 */
function extractRoutes(
    stations: StationDetailsDto[],
): { routeId: string; routeName: string; agencyId?: string }[] {
    const seen = new Map<
        string,
        { routeId: string; routeName: string; agencyId?: string }
    >();
    for (const station of stations) {
        for (const rsl of station.routeStationLists ?? []) {
            const route = rsl.route;
            if (route?.routeId && !seen.has(route.routeId)) {
                seen.set(route.routeId, {
                    routeId: route.routeId,
                    routeName: route.routeName ?? '',
                    agencyId: route.agencyId,
                });
            }
        }
    }
    return [...seen.values()];
}

/**
 * 路線チップの選択肢。会社ごとにまとめ（`group` = 会社名）、会社は会社チップと同じ
 * 「相鉄と直通を始めた順」、会社の中の路線はハンバーガーメニューの駅名選択と同じ系統順
 * （RouteStationListStateStore の整列順）にする（ユーザー指示 2026-09-24。列車位置情報・
 * 列車ダイヤグラムも同じ）。並び順に無い路線は、駅の並び順のまま後ろに付ける。
 */
function extractRouteOptions(
    stations: StationDetailsDto[],
    agencies: AgencyDetailsDto[],
    routeOrder: string[],
): FilterChipOption[] {
    const agencyNames = new Map(
        agencies.map((agency) => [agency.agencyId, agency.agencyName]),
    );
    const rank = (routeId: string): number => {
        const index = routeOrder.indexOf(routeId);
        return index < 0 ? Infinity : index;
    };
    const routesInOrder = extractRoutes(stations)
        .map((route, index) => ({ route, index }))
        .sort(
            (a, b) =>
                rank(a.route.routeId) - rank(b.route.routeId) ||
                a.index - b.index,
        )
        .map(({ route }) => route);
    // 会社のまとまりは会社チップと同じ「相鉄と直通を始めた順」（会社の中は系統順のまま）
    return sortByThroughServiceAgency(
        routesInOrder,
        (route) => route.agencyId,
        agencies,
    ).map((route) => ({
        value: route.routeId,
        label: route.routeName,
        group: route.agencyId ? agencyNames.get(route.agencyId) : undefined,
    }));
}

const orderedStations$ = store.pipe(
    select((state) => ({
        stations: state.stations,
        tripDirection: state.tripDirection,
    })),
    map(({ stations, tripDirection }) =>
        orderStations(stations, tripDirection),
    ),
);

const visibleStations$ = combineLatest([
    orderedStations$,
    store.pipe(select((state) => state.selectedRouteIds)),
]).pipe(
    map(([orderedStations, selectedRouteIds]) =>
        toVisibleStations(orderedStations, selectedRouteIds),
    ),
);

const sortedAllTrips$ = combineLatest([
    orderedStations$,
    store.pipe(select((state) => state.tripBlocks)),
]).pipe(
    map(([orderedStations, tripBlocks]) =>
        sortedAllTrips(orderedStations, tripBlocks),
    ),
    // 並べ替えは 1 回 50〜90ms かかるので、購読者（列・始発/終着の注釈）で共有する
    shareReplay({ bufferSize: 1, refCount: true }),
);

/**
 * 列に出す列車。路線の絞り込み中は、表示駅に 1 つも停まらない（隠れた路線で完結する）列車を
 * 外す（ユーザー指示 2026-09-24）。並びは全駅で決めたものをそのまま使う。
 */
const listedTrips$ = combineLatest([
    sortedAllTrips$,
    orderedStations$,
    visibleStations$,
]).pipe(
    map(([trips, all, visible]) => {
        if (visible.length >= all.length) return trips;
        const visibleIds = new Set(visible.map((station) => station.stationId));
        return trips.filter((trip) => hasVisibleStop(trip, visibleIds));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
);

const pagedTrips$ = combineLatest([
    listedTrips$,
    store.pipe(select((state) => state.pageSettings)),
]).pipe(
    map(([trips, pageSettings]) =>
        trips.filter(
            (_, i) =>
                pageSettings.pageIndex * pageSettings.pageSize <= i &&
                i < (pageSettings.pageIndex + 1) * pageSettings.pageSize,
        ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
);

export const TimetableAllLineStore = {
    setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setTripDirection(tripDirection: TripDetailsDto['tripDirection']): void {
        store.update(setProp('tripDirection', () => tripDirection));
    },
    /**
     * trip_block_id が変わったらページネーションを 0 に戻す（旧 resolver と同じ挙動）。
     */
    setTripBlockId(tripBlockId: TripBlockDetailsDto['tripBlockId']): void {
        const changed = store.getValue().tripBlockId !== tripBlockId;
        store.update(setProp('tripBlockId', () => tripBlockId));
        if (changed) {
            store.update(
                setProp('pageSettings', (pageSettings) => ({
                    ...pageSettings,
                    pageIndex: 0,
                })),
            );
        }
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
        store.update(setProp('tripBlocks', () => tripBlocks));
    },
    setPageSettings(pageSettings: PageEvent): void {
        store.update(setProp('pageSettings', () => pageSettings));
    },
    /** 絞り込みを変えると列の本数が変わるので 1 ページ目に戻す（範囲外に取り残さない）。 */
    setSelectedRouteIds(routeIds: FilterChipValue[]): void {
        store.update(
            setProp('selectedRouteIds', () => routeIds.map((id) => String(id))),
            setProp('pageSettings', (pageSettings) => ({
                ...pageSettings,
                pageIndex: 0,
            })),
        );
    },
    setAgencies(agencies: AgencyDetailsDto[]): void {
        store.update(setProp('agencies', () => agencies));
    },
    setRouteOrder(routeIds: string[]): void {
        store.update(setProp('routeOrder', () => routeIds));
    },
    /**
     * 既定 = 自社（相鉄）の路線だけ ON（ユーザー指示 2026-09-24）。以前は全路線 ON。
     * 会社が引けないときは全路線 ON に戻る（ownAgencyRouteIds のフォールバック）。
     *
     * 列車番号のリンクから運行を絞り込んで開いたとき（tripBlockId あり）は、その運行が走る
     * 路線を ON にする。相鉄だけだと、他社線で完結する列車が消え、直通先の区間も隠れる。
     */
    initializeSelectedRouteIds(): void {
        const { stations, agencies, tripBlockId, tripBlocks } =
            store.getValue();
        const traversed = tripBlockId
            ? traversedRouteIds(stations, tripBlocks)
            : [];
        TimetableAllLineStore.setSelectedRouteIds(
            traversed.length
                ? traversed
                : ownAgencyRouteIds(extractRoutes(stations), agencies),
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
    tripDirection$: store.pipe(select((state) => state.tripDirection)),
    tripBlockId$: store.pipe(select((state) => state.tripBlockId)),
    /** ページ送りの設定。件数（length）は列に出す列車の本数（絞り込み後）。 */
    pageSettings$: combineLatest([
        store.pipe(select((state) => state.pageSettings)),
        listedTrips$,
    ]).pipe(
        map(([pageSettings, trips]) => ({
            ...pageSettings,
            length: trips.length,
        })),
    ),
    selectedRouteIds$: store.pipe(select((state) => state.selectedRouteIds)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    /** 表示駅（並び替え + 路線絞り込み済み）。 */
    stations$: visibleStations$,

    /** ページングした表示列車（列）。絞り込み中は表示駅に停まらない列車を外してある。 */
    trips$: pagedTrips$,

    /**
     * 表示中の列車ごとの、列の並びで 1 つ前の列車。ページ分けの前の並びから引くので、
     * ページの先頭の列でも前のページの最後の列車が入る（同じ運行の「⬎」がページをまたいで消えていた）。
     */
    previousTrips$: combineLatest([listedTrips$, pagedTrips$]).pipe(
        map(([listed, paged]) => {
            const pagedIds = new Set(paged.map((trip) => trip.tripId));
            return new Map(
                listed.flatMap((trip, i) =>
                    pagedIds.has(trip.tripId) && i > 0
                        ? [[trip.tripId, listed[i - 1]] as const]
                        : [],
                ),
            );
        }),
    ),

    /** 表示中の列車ごとの始発駅・終着駅とその時刻（表の上端・下端の行）。 */
    endpoints$: combineLatest([orderedStations$, pagedTrips$]).pipe(
        map(([all, trips]) => {
            const names = new Map(
                all.map((station) => [station.stationId, station.stationName]),
            );
            return new Map(
                trips.map((trip) => [trip.tripId, tripEndpoints(trip, names)]),
            );
        }),
    ),

    /**
     * 駅ごとの表示モード（着発2段/発のみ/着のみ）。本番（v2 以来）と同じく
     * 駅名＋所属路線の一覧で決める（get-view-mode.util.ts）。ダイヤデータから
     * 推し量る方式は普通の駅にも着行が増え、本番とずれたため戻した（2026-09-24）。
     */
    viewModes$: combineLatest([
        visibleStations$,
        store.pipe(select((state) => state.tripDirection)),
    ]).pipe(
        map(
            ([stations, tripDirection]) =>
                new Map(
                    stations.map((station) => [
                        station.stationId,
                        TimetableAllLineUtil.getViewMode(
                            station,
                            (tripDirection ?? 1) as 0 | 1,
                        ),
                    ]),
                ),
        ),
    ),

    /** 駅直後の罫線フラグ。本番と同じ駅一覧（get-border-setting.util.ts）で決める。 */
    bordersAfter$: combineLatest([
        visibleStations$,
        store.pipe(select((state) => state.tripDirection)),
    ]).pipe(
        map(
            ([stations, tripDirection]) =>
                new Map(
                    stations.map((station) => [
                        station.stationId,
                        TimetableAllLineUtil.getBorderSetting(
                            station,
                            (tripDirection ?? 1) as 0 | 1,
                        ),
                    ]),
                ),
        ),
    ),

    routeOptions$: combineLatest([
        store.pipe(select((state) => state.stations)),
        store.pipe(select((state) => state.agencies)),
        store.pipe(select((state) => state.routeOrder)),
    ]).pipe(
        map(([stations, agencies, routeOrder]) =>
            extractRouteOptions(stations, agencies, routeOrder),
        ),
    ),

    get calendarId(): CalendarDetailsDto['calendarId'] | null {
        return store.getValue().calendarId;
    },
    get tripDirection(): TripDetailsDto['tripDirection'] | null {
        return store.getValue().tripDirection;
    },
    get tripBlockId(): TripBlockDetailsDto['tripBlockId'] | null {
        return store.getValue().tripBlockId;
    },
} as const;
