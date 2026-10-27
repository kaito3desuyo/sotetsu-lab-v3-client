import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withFeature,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type StoreProps = {
    todaysCalendar: CalendarDetailsDto | null;
    /** 今日（鉄道日）が何の日か（祝日名・年末年始・特別ダイヤ）。該当しなければ null */
    todaysDayName: string | null;
    runningTripCount: number;
    sightingCountToday: number;
    latestSightings: OperationSightingDetailsDto[];
    latestSightingPositions: Record<string, OperationCurrentPositionDto>;
    /** 運用のつながり（目撃時の位置と走行本数で乗り移りの端を見分ける） */
    itineraryLinks: OperationItineraryLinkDto[];
    /** 目撃時の位置に出す種別チップの名称・色の解決用 */
    tripClasses: TripClassDetailsDto[];
    /** 「サイト説明」パネルを初回訪問時のみ自動展開するための既訪問フラグ */
    hasVisitedBefore: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。画面の設定（hasVisitedBefore）と loadingQueue は入れない。
 */
export type DashboardSnapshot = Pick<
    StoreProps,
    | 'todaysCalendar'
    | 'todaysDayName'
    | 'runningTripCount'
    | 'sightingCountToday'
    | 'latestSightings'
    | 'latestSightingPositions'
    | 'itineraryLinks'
    | 'tripClasses'
>;

const initialState: StoreProps = {
    todaysCalendar: null,
    todaysDayName: null,
    runningTripCount: 0,
    sightingCountToday: 0,
    latestSightings: [],
    latestSightingPositions: {},
    itineraryLinks: [],
    tripClasses: [],
    hasVisitedBefore: false,
    loadingQueue: [],
};

export const DashboardStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
    })),
    withMethods((store) => ({
        setTodaysCalendar(calendar: CalendarDetailsDto | null): void {
            patchState(store, { todaysCalendar: calendar });
        },
        setTodaysDayName(name: string | null): void {
            patchState(store, { todaysDayName: name });
        },
        setRunningTripCount(count: number): void {
            patchState(store, { runningTripCount: count });
        },
        setSightingCountToday(count: number): void {
            patchState(store, { sightingCountToday: count });
        },
        setLatestSightings(sightings: OperationSightingDetailsDto[]): void {
            patchState(store, { latestSightings: sightings });
        },
        setLatestSightingPosition(
            operationSightingId: string,
            position: OperationCurrentPositionDto,
        ): void {
            patchState(store, (state) => ({
                latestSightingPositions: {
                    ...state.latestSightingPositions,
                    [operationSightingId]: position,
                },
            }));
        },
        setItineraryLinks(links: OperationItineraryLinkDto[]): void {
            patchState(store, { itineraryLinks: links });
        },
        setTripClasses(tripClasses: TripClassDetailsDto[]): void {
            patchState(store, { tripClasses });
        },
        markVisited(): void {
            patchState(store, { hasVisitedBefore: true });
        },
        /** 圏外のために保存する中身を取り出す */
        snapshot(): DashboardSnapshot {
            return {
                todaysCalendar: store.todaysCalendar(),
                todaysDayName: store.todaysDayName(),
                runningTripCount: store.runningTripCount(),
                sightingCountToday: store.sightingCountToday(),
                latestSightings: store.latestSightings(),
                latestSightingPositions: store.latestSightingPositions(),
                itineraryLinks: store.itineraryLinks(),
                tripClasses: store.tripClasses(),
            };
        },
        /** 保存した中身を戻す（既訪問フラグと読み込み中は今のまま） */
        restoreSnapshot(data: DashboardSnapshot): void {
            patchState(store, {
                todaysCalendar: data.todaysCalendar,
                todaysDayName: data.todaysDayName,
                runningTripCount: data.runningTripCount,
                sightingCountToday: data.sightingCountToday,
                latestSightings: data.latestSightings,
                latestSightingPositions: data.latestSightingPositions,
                itineraryLinks: data.itineraryLinks,
                tripClasses: data.tripClasses,
            });
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
    })),
    // 保存するのは既訪問フラグだけ。ページの中身は取得に失敗したときだけ OfflineSnapshots から戻す
    withSettingsStorage<StoreProps>({
        key: 'DashboardStore',
        fields: ['hasVisitedBefore'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'Dashboard',
                select: () => store.snapshot(),
                apply: (data: DashboardSnapshot) => store.restoreSnapshot(data),
            },
        }),
    ),
    withAppDevtools('DashboardStore'),
);
