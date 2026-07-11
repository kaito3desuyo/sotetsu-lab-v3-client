import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';

export type TrainLocationMode = 'now' | 'specified';

type StoreProps = {
    calendarId: string | null;
    selectedRouteId: string | null;
    mode: TrainLocationMode;
    /** 時刻指定モードの指定時刻（"HHmm"）。現在時刻モードでは未使用（null）。 */
    specifiedTime: string | null;
    stationAxisStations: RouteStationDto[];
    tripClasses: TripClassDetailsDto[];
    tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>;
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'TrainLocationStore' },
    withProps<StoreProps>({
        calendarId: null,
        selectedRouteId: null,
        mode: 'now',
        specifiedTime: null,
        stationAxisStations: [],
        tripClasses: [],
        tripBlocksByDirection: {},
        operationSightingTimeCrossSections: {},
        loadingQueue: [],
    }),
);

export const TrainLocationStore = {
    setCalendarId(calendarId: string | null): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setSelectedRouteId(routeId: string | null): void {
        store.update(setProp('selectedRouteId', () => routeId));
    },
    setMode(mode: TrainLocationMode): void {
        store.update(setProp('mode', () => mode));
    },
    setSpecifiedTime(time: string | null): void {
        store.update(setProp('specifiedTime', () => time));
    },
    setStationAxisStations(stations: RouteStationDto[]): void {
        store.update(setProp('stationAxisStations', () => stations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setTripBlocksByDirection(
        tripBlocksByDirection: Record<number, TripBlockDetailsDto[]>,
    ): void {
        store.update(
            setProp('tripBlocksByDirection', () => tripBlocksByDirection),
        );
    },
    setOperationSightingTimeCrossSection(
        operationNumber: string,
        dto: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('operationSightingTimeCrossSections', (state) => ({
                ...state,
                [operationNumber]: dto,
            })),
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
    selectedRouteId$: store.pipe(select((state) => state.selectedRouteId)),
    mode$: store.pipe(select((state) => state.mode)),
    specifiedTime$: store.pipe(select((state) => state.specifiedTime)),
    stationAxisStations$: store.pipe(
        select((state) => state.stationAxisStations),
    ),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    tripBlocksByDirection$: store.pipe(
        select((state) => state.tripBlocksByDirection),
    ),
    operationSightingTimeCrossSections$: store.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    get calendarId(): string | null {
        return store.getValue().calendarId;
    },
    get selectedRouteId(): string | null {
        return store.getValue().selectedRouteId;
    },
    get mode(): TrainLocationMode {
        return store.getValue().mode;
    },
    get tripBlocksByDirection(): Record<number, TripBlockDetailsDto[]> {
        return store.getValue().tripBlocksByDirection;
    },
    get operationSightingTimeCrossSections(): Record<
        string,
        OperationSightingTimeCrossSectionDto
    > {
        return store.getValue().operationSightingTimeCrossSections;
    },
} as const;
