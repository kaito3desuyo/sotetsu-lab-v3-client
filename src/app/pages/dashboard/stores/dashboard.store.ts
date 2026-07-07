import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';

type StoreProps = {
    todaysCalendar: CalendarDetailsDto | null;
    runningTripCount: number;
    sightingCountToday: number;
    latestSightings: OperationSightingDetailsDto[];
    latestSightingPositions: Record<string, OperationCurrentPositionDto>;
    /** 「サイト説明」パネルを初回訪問時のみ自動展開するための既訪問フラグ */
    hasVisitedBefore: boolean;
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'DashboardStore' },
    withProps<StoreProps>({
        todaysCalendar: null,
        runningTripCount: 0,
        sightingCountToday: 0,
        latestSightings: [],
        latestSightingPositions: {},
        hasVisitedBefore: false,
        loadingQueue: [],
    }),
);

const persist = persistState(store, {
    key: 'DashboardStore',
    storage: localForage,
    source: () => store.pipe(debounceTime(1000)),
});

export const DashboardStore = {
    persistInitialized$: persist.initialized$,

    setTodaysCalendar(calendar: CalendarDetailsDto | null): void {
        store.update(setProp('todaysCalendar', () => calendar));
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
    runningTripCount$: store.pipe(select((state) => state.runningTripCount)),
    sightingCountToday$: store.pipe(
        select((state) => state.sightingCountToday),
    ),
    latestSightings$: store.pipe(select((state) => state.latestSightings)),
    latestSightingPositions$: store.pipe(
        select((state) => state.latestSightingPositions),
    ),
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
