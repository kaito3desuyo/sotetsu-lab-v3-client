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
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';

export type TrainLocationMode = 'now' | 'specified';

type StoreProps = {
    calendarId: string | null;
    selectedRouteId: string | null;
    selectedStationId: string | null;
    mode: TrainLocationMode;
    /** 時刻指定モードの指定時刻（"HHmm"）。現在時刻モードでは未使用（null）。 */
    specifiedTime: string | null;
    stationAxisStations: RouteStationDto[];
    tripClasses: TripClassDetailsDto[];
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    itineraryLinks: OperationItineraryLinkDto[];
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    /** 操作帯を畳んでいるか。端末に保存する */
    controlCollapsed: boolean;
    loadingQueue: boolean[];
    hasFetchedTrainLocation: boolean;
};

/**
 * 圏外のために端末に保存する中身。条件（calendarId・selectedRouteId）と画面の状態
 * （駅・モード・指定時刻・読み込み中の印）、目撃（別に保存する）は入れない。
 */
export type TrainLocationSnapshot = Pick<
    StoreProps,
    | 'stationAxisStations'
    | 'tripClasses'
    | 'tripBlocksByDirection'
    | 'itineraryLinks'
>;

/** 圏外のために端末に保存する目撃（運用番号ごと。列車の保存とは別に、日付つきで保存する） */
export type TrainLocationSightingsSnapshot =
    StoreProps['operationSightingTimeCrossSections'];

const initialState: StoreProps = {
    calendarId: null,
    selectedRouteId: null,
    selectedStationId: null,
    mode: 'now',
    specifiedTime: null,
    stationAxisStations: [],
    tripClasses: [],
    tripBlocksByDirection: {},
    itineraryLinks: [],
    operationSightingTimeCrossSections: {},
    controlCollapsed: false,
    loadingQueue: [],
    hasFetchedTrainLocation: false,
};

export const TrainLocationStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
    })),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得の終わりが
        // 新しい骨組みを消さないよう、インスタンスでなくストアで数える
        let fetchSeq = 0;

        return {
            /** 取得を始めるときに世代を進めて、その番号を返す */
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setCalendarId(calendarId: string | null): void {
                patchState(store, { calendarId });
            },
            setSelectedRouteId(routeId: string | null): void {
                patchState(store, { selectedRouteId: routeId });
            },
            setSelectedStationId(stationId: string | null): void {
                patchState(store, { selectedStationId: stationId });
            },
            setMode(mode: TrainLocationMode): void {
                patchState(store, { mode });
            },
            setSpecifiedTime(time: string | null): void {
                patchState(store, { specifiedTime: time });
            },
            setStationAxisStations(stations: RouteStationDto[]): void {
                patchState(store, { stationAxisStations: stations });
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
            setControlCollapsed(collapsed: boolean): void {
                patchState(store, { controlCollapsed: collapsed });
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
            /** いまの路線・ダイヤの取得が終わったか（失敗しても true）。取る前は本文の代わりに骨組みを出す */
            setHasFetchedTrainLocation(value: boolean): void {
                patchState(store, { hasFetchedTrainLocation: value });
            },
            /** 圏外のために保存する中身を取り出す */
            snapshot(): TrainLocationSnapshot {
                return {
                    stationAxisStations: store.stationAxisStations(),
                    tripClasses: store.tripClasses(),
                    tripBlocksByDirection: store.tripBlocksByDirection(),
                    itineraryLinks: store.itineraryLinks(),
                };
            },
            /** 保存した中身を戻す（条件の calendarId・selectedRouteId と画面の状態は今のまま） */
            restoreSnapshot(data: TrainLocationSnapshot): void {
                patchState(store, {
                    stationAxisStations: data.stationAxisStations,
                    tripClasses: data.tripClasses,
                    tripBlocksByDirection: data.tripBlocksByDirection,
                    itineraryLinks: data.itineraryLinks,
                });
            },
            /** 圏外のために保存する目撃を取り出す */
            snapshotOperationSightingTimeCrossSections(): TrainLocationSightingsSnapshot {
                return store.operationSightingTimeCrossSections();
            },
            /** 保存した目撃に置き換える */
            restoreOperationSightingTimeCrossSections(
                data: TrainLocationSightingsSnapshot,
            ): void {
                patchState(store, { operationSightingTimeCrossSections: data });
            },
        };
    }),
    // 保存するのは操作帯の開閉だけ。全部保存すると取得したデータまで書き、前の条件へ戻ってしまう
    withSettingsStorage<StoreProps>({
        key: 'TrainLocationStore',
        fields: ['controlCollapsed'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'TrainLocation',
                select: () => store.snapshot(),
                apply: (data: TrainLocationSnapshot) =>
                    store.restoreSnapshot(data),
            },
            // 目撃は Service Worker に残らないので、列車の保存とは別に日付つきで保存する。
            // 戻した目撃は、すでに取れている目撃を上書きしない
            sightings: {
                key: 'TrainLocationSightings',
                select: () =>
                    store.snapshotOperationSightingTimeCrossSections(),
                apply: (data: TrainLocationSightingsSnapshot) =>
                    store.restoreOperationSightingTimeCrossSections({
                        ...data,
                        ...store.operationSightingTimeCrossSections(),
                    }),
            },
        }),
    ),
    withAppDevtools('TrainLocationStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
