import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime, map } from 'rxjs';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { normalizeGroupNames } from 'src/app/shared/operation-group.util';

type StoreProps = {
    calendarId: string | null;
    calendar: CalendarDetailsDto | null;
    operationTrips: OperationTripsDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    selectedGroupNames: string[];
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'OperationTableStore' },
    withProps<StoreProps>({
        calendarId: null,
        calendar: null,
        operationTrips: [],
        stations: [],
        tripClasses: [],
        selectedGroupNames: [],
        loadingQueue: [],
    }),
);

// B4: リアルタイム運用情報ページ（OperationRealTimeStore）とは独立した永続化キー
const persist = persistState(store, {
    key: 'OperationTableStore',
    storage: localForage,
    source: () => store.pipe(debounceTime(1000)),
});

export const OperationTableStore = {
    persistInitialized$: persist.initialized$,

    setCalendarId(calendarId: string): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setOperationTrips(operationTrips: OperationTripsDto[]): void {
        store.update(setProp('operationTrips', () => operationTrips));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setSelectedGroupNames(groupNames: string[]): void {
        store.update(setProp('selectedGroupNames', () => groupNames));
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
    calendar$: store.pipe(select((state) => state.calendar)),
    operationTrips$: store.pipe(
        select((state) =>
            [...state.operationTrips].sort(
                (a, b) =>
                    Number(
                        generateOperationSortNumber(
                            a.operation.operationNumber,
                        ),
                    ) -
                    Number(
                        generateOperationSortNumber(
                            b.operation.operationNumber,
                        ),
                    ),
            ),
        ),
    ),
    stations$: store.pipe(select((state) => state.stations)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    // 2026-10-06 より前に保存した群名（「3G群」など）は今の名前に置き換える
    selectedGroupNames$: store.pipe(
        select((state) => state.selectedGroupNames),
        map(normalizeGroupNames),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    get calendarId(): string | null {
        return store.getValue().calendarId;
    },
    get operations(): OperationTripsDto[] {
        return store.getValue().operationTrips;
    },
} as const;
