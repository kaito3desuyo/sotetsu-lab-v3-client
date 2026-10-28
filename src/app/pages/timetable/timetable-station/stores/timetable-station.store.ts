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
import { format, parse } from 'date-fns';
import { minBy } from 'es-toolkit/compat';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';

type StoreProps = {
    calendarId: CalendarDetailsDto['calendarId'] | null;
    stationId: StationDetailsDto['stationId'] | null;
    tripDirection: ETripDirection | null;
    calendar: CalendarDetailsDto | null;
    trips: TripDetailsDto[];
    tripBlocks: TripBlockDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    /**
     * G1（充当編成「不明」バグ修正）: operation-real-time と同じキー付け方に統一する。
     * 配列で保持し expectedSighting.operation.operationNumber に一致するものを
     * 都度スキャンして探す旧実装は、その nested プロパティが API レスポンスで
     * 常に requestした operationNumber と一致する保証がなく「不明」の主因だった。
     * リクエストに使った operationNumber をそのままキーにした Record にすることで
     * 取得結果と紐付けを一致させる（operation-real-time.store.ts と同一パターン）。
     */
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    /** 操作帯を畳んでいるか。端末に保存する */
    controlCollapsed: boolean;
    hasFetchedTimetable: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。充当編成（operationSightingTimeCrossSections）は
 * 「今日」で変わるので入れない。
 */
export type TimetableStationSnapshot = Pick<
    StoreProps,
    | 'calendar'
    | 'trips'
    | 'tripBlocks'
    | 'tripClasses'
    | 'stations'
    | 'operations'
>;

/** 圏外のために端末に保存する充当編成（時刻表とは別に、日付つきで保存する） */
export type TimetableStationSightingsSnapshot =
    StoreProps['operationSightingTimeCrossSections'];

const initialState: StoreProps = {
    calendarId: null,
    stationId: null,
    tripDirection: null,
    calendar: null,
    trips: [],
    tripBlocks: [],
    tripClasses: [],
    stations: [],
    operations: [],
    operationSightingTimeCrossSections: {},
    controlCollapsed: false,
    hasFetchedTimetable: false,
    loadingQueue: [],
};

function sortTrips(
    trips: TripDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
    stationId: StationDetailsDto['stationId'],
): TripDetailsDto[] {
    return trips
        .map((o) => ({
            ...o,
            tripBlock: tripBlocks.find(
                ({ tripBlockId }) => o.tripBlockId === tripBlockId,
            ),
        }))
        .map((o) => ({
            ...o,
            tripBlock: {
                ...o.tripBlock,
                trips: (o.tripBlock?.trips ?? []).sort((a, b) => {
                    const aTime = minBy(a.times, (o2) => o2.stopSequence);
                    const bTime = minBy(b.times, (o2) => o2.stopSequence);
                    if (!aTime || !bTime) return 0;
                    return (
                        toServiceSeconds(
                            aTime.departureDays,
                            aTime.departureTime,
                        ) -
                        toServiceSeconds(
                            bTime.departureDays,
                            bTime.departureTime,
                        )
                    );
                }),
            },
        }))
        .sort((a, b) => {
            const aStationTime = a.times.find((t) => t.stationId === stationId);
            const bStationTime = b.times.find((t) => t.stationId === stationId);
            const aDay =
                aStationTime?.departureDays ??
                aStationTime?.arrivalDays ??
                null;
            const aTime =
                aStationTime?.departureTime ??
                aStationTime?.arrivalTime ??
                null;
            const bDay =
                bStationTime?.departureDays ??
                bStationTime?.arrivalDays ??
                null;
            const bTime =
                bStationTime?.departureTime ??
                bStationTime?.arrivalTime ??
                null;

            return (
                toServiceSeconds(aDay, aTime) - toServiceSeconds(bDay, bTime)
            );
        });
}

function extractOperationIds(trips: TripDetailsDto[]): string[] {
    return Array.from(
        new Set(
            trips
                .filter((trip) => trip.tripOperationLists?.length)
                .map((trip) => trip.tripOperationLists?.[0]?.operationId),
        ),
    );
}

function generateTableData(
    trips: TripDetailsDto[],
    stationId: StationDetailsDto['stationId'],
): {
    day: number;
    hour: string;
    trips: TripDetailsDto[];
}[] {
    const data: {
        day: number;
        hour: string;
        trips: TripDetailsDto[];
    }[] = [];

    for (const trip of trips) {
        const stationTime = trip.times.find((t) => t.stationId === stationId);
        const day =
            stationTime?.departureDays ?? stationTime?.arrivalDays ?? null;
        const time =
            stationTime?.departureTime ?? stationTime?.arrivalTime ?? null;
        const hour = time
            ? format(parse(time, 'HH:mm:ss', new Date()), 'H')
            : null;

        const index = data.findIndex((o) => o.day === day && o.hour === hour);

        if (day && time && index !== -1) {
            data[index].trips.push(trip);
        } else if (day && time) {
            data.push({
                day,
                hour,
                trips: [trip],
            });
        } else {
            data.push({
                day: null,
                hour: '？',
                trips: [trip],
            });
        }
    }

    return data;
}

export const TimetableStationStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ trips, tripBlocks, stationId, loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
        operationIds: computed(() => extractOperationIds(trips())),
        timetableData: computed(() =>
            generateTableData(
                sortTrips(trips(), tripBlocks(), stationId()),
                stationId(),
            ),
        ),
    })),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、コンポーネントでなくストアで数える
        let fetchSeq = 0;

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
                patchState(store, { calendarId });
            },
            setStationId(stationId: StationDetailsDto['stationId']): void {
                patchState(store, { stationId });
            },
            setTripDirection(tripDirection: ETripDirection): void {
                patchState(store, { tripDirection });
            },
            setCalendar(calendar: CalendarDetailsDto): void {
                patchState(store, { calendar });
            },
            setTrips(trips: TripDetailsDto[]): void {
                patchState(store, { trips });
            },
            setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
                patchState(store, { tripBlocks });
            },
            setTripClasses(tripClasses: TripClassDetailsDto[]): void {
                patchState(store, { tripClasses });
            },
            setStations(stations: StationDetailsDto[]): void {
                patchState(store, { stations });
            },
            setOperations(operations: OperationDetailsDto[]): void {
                patchState(store, { operations });
            },
            setOperationSightingTimeCrossSection(
                operationNumber: string,
                timeCrossSection: OperationSightingTimeCrossSectionDto,
            ): void {
                patchState(store, (state) => ({
                    operationSightingTimeCrossSections: {
                        ...state.operationSightingTimeCrossSections,
                        [operationNumber]: timeCrossSection,
                    },
                }));
            },
            resetOperationSightingTimeCrossSections(): void {
                patchState(store, { operationSightingTimeCrossSections: {} });
            },
            setControlCollapsed(collapsed: boolean): void {
                patchState(store, { controlCollapsed: collapsed });
            },
            /** いまの駅・ダイヤ・方向の取得が終わったか（失敗しても true）。取る前は時刻表の代わりに骨組みを出す */
            setHasFetchedTimetable(value: boolean): void {
                patchState(store, { hasFetchedTimetable: value });
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
            /** 圏外のために保存する中身を取り出す */
            snapshot(): TimetableStationSnapshot {
                return {
                    calendar: store.calendar(),
                    trips: store.trips(),
                    tripBlocks: store.tripBlocks(),
                    tripClasses: store.tripClasses(),
                    stations: store.stations(),
                    operations: store.operations(),
                };
            },
            /** 保存した中身を戻す（条件の calendarId・stationId・tripDirection は今のまま） */
            restoreSnapshot(data: TimetableStationSnapshot): void {
                patchState(store, {
                    calendar: data.calendar,
                    trips: data.trips,
                    tripBlocks: data.tripBlocks,
                    tripClasses: data.tripClasses,
                    stations: data.stations,
                    operations: data.operations,
                });
            },

            /** 圏外のために保存する充当編成を取り出す */
            snapshotOperationSightingTimeCrossSections(): TimetableStationSightingsSnapshot {
                return store.operationSightingTimeCrossSections();
            },
            /** 保存した充当編成を戻す */
            restoreOperationSightingTimeCrossSections(
                data: TimetableStationSightingsSnapshot,
            ): void {
                patchState(store, { operationSightingTimeCrossSections: data });
            },
        };
    }),
    // 保存するのは操作帯の開閉だけ。全部保存すると取得したデータまで書き、前の条件へ戻ってしまう
    withSettingsStorage<StoreProps>({
        key: 'TimetableStationStore',
        fields: ['controlCollapsed'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'TimetableStation',
                select: () => store.snapshot(),
                apply: (data: TimetableStationSnapshot) =>
                    store.restoreSnapshot(data),
            },
            sightings: {
                key: 'TimetableStationSightings',
                select: () =>
                    store.snapshotOperationSightingTimeCrossSections(),
                apply: (data: TimetableStationSightingsSnapshot) =>
                    store.restoreOperationSightingTimeCrossSections(data),
            },
        }),
    ),
    withAppDevtools('TimetableStationStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
