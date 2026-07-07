import { PageEvent } from '@angular/material/paginator';
import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { arrayUniqueBy } from 'src/app/core/utils/array-unique-by';
import { borderAfterStation } from 'src/app/core/utils/border-after-station.util';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

type StoreProps = {
    calendarId: CalendarDetailsDto['calendarId'] | null;
    tripDirection: TripDetailsDto['tripDirection'] | null;
    tripBlockId: TripBlockDetailsDto['tripBlockId'] | null;
    stations: StationDetailsDto[];
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

/** ダイヤ並び替え済みの全列車（ページング前）。列は路線絞り込みの影響を受けない。 */
function sortedAllTrips(
    orderedStations: StationDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
): TripDetailsDto[] {
    return arrayUniqueBy(
        TimetableAllLineUtil.sortTrips(orderedStations, tripBlocks).reverse(),
        'tripBlockId',
    )
        .reverse()
        .map((o) => o.trips)
        .reduce<TripDetailsDto[]>((a, b) => [...a, ...b], []);
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

function allRouteIds(stations: StationDetailsDto[]): string[] {
    return extractRouteOptions(stations).map((option) => String(option.value));
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
        const length = tripBlocks
            .map((tripBlock) => tripBlock.trips.length)
            .reduce((a, b) => a + b, 0);
        store.update(setProp('tripBlocks', () => tripBlocks));
        store.update(
            setProp('pageSettings', (pageSettings) => ({
                ...pageSettings,
                length,
            })),
        );
    },
    setPageSettings(pageSettings: PageEvent): void {
        store.update(setProp('pageSettings', () => pageSettings));
    },
    setSelectedRouteIds(routeIds: FilterChipValue[]): void {
        store.update(
            setProp('selectedRouteIds', () => routeIds.map((id) => String(id))),
        );
    },
    /** 既定 = 全路線 ON（B6: 全路線 ON 時に現行の罫線・行と一致させる）。 */
    initializeSelectedRouteIds(): void {
        store.update(
            setProp('selectedRouteIds', () =>
                allRouteIds(store.getValue().stations),
            ),
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
    pageSettings$: store.pipe(select((state) => state.pageSettings)),
    selectedRouteIds$: store.pipe(select((state) => state.selectedRouteIds)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    /** 表示駅（並び替え + 路線絞り込み済み）。 */
    stations$: visibleStations$,

    /** ページングした表示列車（列。路線絞り込みの影響は受けない）。 */
    trips$: combineLatest([
        sortedAllTrips$,
        store.pipe(select((state) => state.pageSettings)),
    ]).pipe(
        map(([trips, pageSettings]) =>
            trips.filter(
                (_, i) =>
                    pageSettings.pageIndex * pageSettings.pageSize <= i &&
                    i < (pageSettings.pageIndex + 1) * pageSettings.pageSize,
            ),
        ),
    ),

    /** 駅ごとの表示モード（着発2段/発のみ/着のみ）。データ駆動。 */
    viewModes$: combineLatest([
        visibleStations$,
        sortedAllTrips$,
        store.pipe(select((state) => state.tripDirection)),
    ]).pipe(
        map(([stations, trips, tripDirection]) =>
            TimetableAllLineUtil.deriveStationViewModes(
                stations,
                trips,
                (tripDirection ?? 1) as 0 | 1,
            ),
        ),
    ),

    /** 駅直後の罫線フラグ（データ駆動。get-border-setting.util.ts の置換）。 */
    bordersAfter$: visibleStations$.pipe(
        map((stations) => {
            const flags = borderAfterStation(stations);
            return new Map<string, boolean>(
                stations.map((station, index) => [
                    station.stationId,
                    flags[index] ?? false,
                ]),
            );
        }),
    ),

    routeOptions$: store.pipe(
        select((state) => state.stations),
        map((stations) => extractRouteOptions(stations)),
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
