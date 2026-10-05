import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime, map } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type StoreProps = {
    todaysCalendar: CalendarDetailsDto | null;
    /** 今日（鉄道日）が何の日か（祝日名・年末年始・特別ダイヤ）。該当しなければ null */
    todaysDayName: string | null;
    runningTripCount: number;
    sightingCountToday: number;
    latestSightings: OperationSightingDetailsDto[];
    latestSightingPositions: Record<string, OperationCurrentPositionDto>;
    /** 目撃時の位置に出す種別チップの名称・色の解決用 */
    tripClasses: TripClassDetailsDto[];
    /** 「サイト説明」パネルを初回訪問時のみ自動展開するための既訪問フラグ */
    hasVisitedBefore: boolean;
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'DashboardStore' },
    withProps<StoreProps>({
        todaysCalendar: null,
        todaysDayName: null,
        runningTripCount: 0,
        sightingCountToday: 0,
        latestSightings: [],
        latestSightingPositions: {},
        tripClasses: [],
        hasVisitedBefore: false,
        loadingQueue: [],
    }),
);

const persist = persistState(store, {
    key: 'DashboardStore',
    storage: localForage,
    // loadingQueue は永続化しない（ロード中にタブを閉じると非空 queue が保存・
    // 復元され、次回訪問時に isLoading が true のまま回復不能になるため）
    source: () =>
        store.pipe(
            debounceTime(1000),
            map(({ loadingQueue: _loadingQueue, ...rest }) => rest),
        ),
});

export const DashboardStore = {
    persistInitialized$: persist.initialized$,

    setTodaysCalendar(calendar: CalendarDetailsDto | null): void {
        store.update(setProp('todaysCalendar', () => calendar));
    },
    setTodaysDayName(name: string | null): void {
        store.update(setProp('todaysDayName', () => name));
    },
    setRunningTripCount(count: number): void {
        store.update(setProp('runningTripCount', () => count));
    },
    setSightingCountToday(count: number): void {
        store.update(setProp('sightingCountToday', () => count));
    },
    setLatestSightings(sightings: OperationSightingDetailsDto[]): void {
        store.update(setProp('latestSightings', () => sightings));
    },
    setLatestSightingPosition(
        operationSightingId: string,
        position: OperationCurrentPositionDto,
    ): void {
        store.update(
            setProp('latestSightingPositions', (state) => ({
                ...state,
                [operationSightingId]: position,
            })),
        );
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    markVisited(): void {
        store.update(setProp('hasVisitedBefore', () => true));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },

    todaysCalendar$: store.pipe(select((state) => state.todaysCalendar)),
    todaysDayName$: store.pipe(select((state) => state.todaysDayName)),
    runningTripCount$: store.pipe(select((state) => state.runningTripCount)),
    sightingCountToday$: store.pipe(
        select((state) => state.sightingCountToday),
    ),
    latestSightings$: store.pipe(select((state) => state.latestSightings)),
    latestSightingPositions$: store.pipe(
        select((state) => state.latestSightingPositions),
    ),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    hasVisitedBefore$: store.pipe(select((state) => state.hasVisitedBefore)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    get latestSightings(): OperationSightingDetailsDto[] {
        return store.getValue().latestSightings;
    },
    get todaysCalendar(): CalendarDetailsDto | null {
        return store.getValue().todaysCalendar;
    },
    get hasVisitedBefore(): boolean {
        return store.getValue().hasVisitedBefore;
    },
} as const;
