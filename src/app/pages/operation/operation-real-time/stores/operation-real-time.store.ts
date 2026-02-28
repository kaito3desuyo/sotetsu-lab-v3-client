import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import { addDays, getHours, parse } from 'date-fns';
import localForage from 'localforage';
import { debounceTime } from 'rxjs';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type StoreProps = {
    routes: RouteDetailsDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    calendar: CalendarDetailsDto;
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    formationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    operationSightingHistories: Record<string, OperationSightingDetailsDto[]>;
    formationSightingHistories: Record<string, OperationSightingDetailsDto[]>;
    currentPositions: Record<string, OperationCurrentPositionDto>;
    finalUpdateTime: number;
    loadingQueue: boolean[];
    isEnableAutoReload: boolean;
    isVisibleSightingHistories: boolean;
    isVisibleCurrentPosition: boolean;
};

const store = createStore(
    { name: 'OperationRealTimeStore' },
    withProps<StoreProps>({
        routes: [],
        stations: [],
        tripClasses: [],
        calendar: null,
        operations: [],
        formations: [],
        operationSightingTimeCrossSections: {},
        formationSightingTimeCrossSections: {},
        operationSightingHistories: {},
        formationSightingHistories: {},
        currentPositions: {},
        finalUpdateTime: Date.now() / 1000,
        loadingQueue: [],
        isEnableAutoReload: true,
        isVisibleSightingHistories: true,
        isVisibleCurrentPosition: true,
    }),
);

const persist = persistState(store, {
    key: 'OperationRealTimeStore',
    storage: localForage,
    source: () => store.pipe(debounceTime(1000)),
});

export const OperationRealTimeStore = {
    persistInitialized$: persist.initialized$,

    setRoutes(routes: RouteDetailsDto[]): void {
        store.update(setProp('routes', () => routes));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setOperations(operations: OperationDetailsDto[]): void {
        store.update(setProp('operations', () => operations));
    },
    setFormations(formations: FormationDetailsDto[]): void {
        store.update(setProp('formations', () => formations));
    },
    setOperationSightingTimeCrossSection(
        operationNumber: string,
        timeCrossSection: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('operationSightingTimeCrossSections', (state) => ({
                ...state,
                [operationNumber]: timeCrossSection,
            })),
        );
    },
    setFormationSightingTimeCrossSection(
        formationNumber: string,
        timeCrossSection: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('formationSightingTimeCrossSections', (state) => ({
                ...state,
                [formationNumber]: timeCrossSection,
            })),
        );
    },
    setOperationSightingHistory(
        operationNumber: string,
        histories: OperationSightingDetailsDto[],
    ): void {
        store.update(
            setProp('operationSightingHistories', (state) => ({
                ...state,
                [operationNumber]: histories,
            })),
        );
    },
    setFormationSightingHistory(
        formationNumber: string,
        histories: OperationSightingDetailsDto[],
    ): void {
        store.update(
            setProp('formationSightingHistories', (state) => ({
                ...state,
                [formationNumber]: histories,
            })),
        );
    },
    setCurrentPosition(
        operationNumber: string,
        currentPosition: OperationCurrentPositionDto,
    ): void {
        store.update(
            setProp('currentPositions', (state) => ({
                ...state,
                [operationNumber]: currentPosition,
            })),
        );
    },
    setFinalUpdateTime(finalUpdateTime?: number): void {
        const time = finalUpdateTime ?? Date.now() / 1000;
        store.update(setProp('finalUpdateTime', () => time));
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
    setIsEnableAutoReload(isEnable: boolean): void {
        store.update(setProp('isEnableAutoReload', () => isEnable));
    },
    setIsVisibleSightingHistories(isVisible: boolean): void {
        store.update(setProp('isVisibleSightingHistories', () => isVisible));
    },
    setIsVisibleCurrentPosition(isVisible: boolean): void {
        store.update(setProp('isVisibleCurrentPosition', () => isVisible));
    },

    routes$: store.pipe(select((state) => state.routes)),
    stations$: store.pipe(select((state) => state.stations)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    calendar$: store.pipe(select((state) => state.calendar)),
    operations$: store.pipe(
        select((state) =>
            state.operations
                .filter((o) => o.operationNumber !== '100')
                .sort(
                    (a, b) =>
                        Number(generateOperationSortNumber(a.operationNumber)) -
                        Number(generateOperationSortNumber(b.operationNumber)),
                ),
        ),
    ),
    formations$: store.pipe(
        select((state) =>
            state.formations
                .sort(
                    (a, b) =>
                        Number(a.formationNumber) - Number(b.formationNumber),
                )
                .sort((a, b) => {
                    const index = {
                        相鉄: 0,
                        JR東日本: 1,
                        東急: 2,
                    };

                    return (
                        index[a.agency.agencyName] - index[b.agency.agencyName]
                    );
                }),
        ),
    ),
    operationSightingTimeCrossSections$: store.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    ),
    formationSightingTimeCrossSections$: store.pipe(
        select((state) => state.formationSightingTimeCrossSections),
    ),
    operationSightingHistories$: store.pipe(
        select((state) => state.operationSightingHistories),
    ),
    formationSightingHistories$: store.pipe(
        select((state) => state.formationSightingHistories),
    ),
    currentPositions$: store.pipe(select((state) => state.currentPositions)),
    finalUpdateTime$: store.pipe(select((state) => state.finalUpdateTime)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),
    isEnableAutoReload$: store.pipe(
        select((state) => state.isEnableAutoReload),
    ),
    isVisibleSightingHistories$: store.pipe(
        select((state) => state.isVisibleSightingHistories),
    ),
    isVisibleCurrentPosition$: store.pipe(
        select((state) => state.isVisibleCurrentPosition),
    ),

    get routes(): RouteDetailsDto[] {
        return store.getValue().routes;
    },
    get calendar(): CalendarDetailsDto {
        return store.getValue().calendar;
    },
    get operations(): OperationDetailsDto[] {
        return store
            .getValue()
            .operations.filter((o) => o.operationNumber !== '100')
            .sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            );
    },
    get formations(): FormationDetailsDto[] {
        return store.getValue().formations;
    },
    get currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
        const currentPositions = store.getValue().currentPositions;
        const now = new Date();
        const target = (days: number, time: string) =>
            addDays(
                parse(time, 'HH:mm:ss', now),
                days - (getHours(now) < 4 ? 1 : 0) - 1,
            );

        return Object.values(currentPositions).filter(
            ({ prev, current, next }) => {
                // 出庫前
                if (!prev && !current && !!next) {
                    return (
                        now >=
                        target(
                            next.startTime.departureDays,
                            next.startTime.departureTime,
                        )
                    );
                }

                // 走行中
                if (!prev && !!current && !next) {
                    return (
                        now >=
                        target(
                            current.endTime.arrivalDays,
                            current.endTime.arrivalTime,
                        )
                    );
                }

                // 間隙時間
                if (!!prev && !current && !!next) {
                    return (
                        now >=
                        target(
                            next.startTime.departureDays,
                            next.startTime.departureTime,
                        )
                    );
                }

                // 入庫済み
                if (!!prev && !current && !next) {
                    return false;
                }

                return false;
            },
        );
    },
} as const;
