import { createStore, select, setProp, withProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { minBy } from 'lodash-es';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';

type StoreProps = {
    mode: ETimetableEditFormMode | null;
    calendarId: string | null;
    tripDirection: ETripDirection | null;
    tripBlockId: string | null;
    calendar: CalendarDetailsDto | null;
    routes: RouteDetailsDto[];
    selectedRouteIds: string[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    copySourceCandidates: TripBlockDetailsDto[];
    targetTripBlock: TripBlockDetailsDto | null;
    isSaveTripsIndividually: boolean;
    loadingQueue: boolean[];
    submittedAt: number | null;
};

const initialProps: StoreProps = {
    mode: null,
    calendarId: null,
    tripDirection: null,
    tripBlockId: null,
    calendar: null,
    routes: [],
    selectedRouteIds: [],
    stations: [],
    operations: [],
    tripClasses: [],
    copySourceCandidates: [],
    targetTripBlock: null,
    isSaveTripsIndividually: false,
    loadingQueue: [],
    submittedAt: null,
};

const store = createStore(
    { name: 'TimetableEditFormStore' },
    withProps<StoreProps>(initialProps),
);

function sortTripsByFirstTime(trips: TripDetailsDto[]): TripDetailsDto[] {
    const format = 'HH:mm:ss';

    return [...trips].sort((a, b) => {
        const aTime = minBy(a.times ?? [], (o) => o.stopSequence);
        const bTime = minBy(b.times ?? [], (o) => o.stopSequence);

        if (!aTime || !bTime) return 0;

        const aValue = aTime.departureTime ?? aTime.arrivalTime;
        const bValue = bTime.departureTime ?? bTime.arrivalTime;
        const aDays = aTime.departureDays ?? aTime.arrivalDays ?? 1;
        const bDays = bTime.departureDays ?? bTime.arrivalDays ?? 1;

        if (!aValue || !bValue) return 0;

        return (
            dayjs(aValue, format).add(aDays - 1, 'days').unix() -
            dayjs(bValue, format).add(bDays - 1, 'days').unix()
        );
    });
}

export const TimetableEditFormStore = {
    /**
     * ページ再入（add→copy 等の遷移含む）ごとに、前回セッションの選択状態を
     * 引きずらないようにする。ストアはモジュールスコープの singleton であり、
     * add/copy/update は同一ルートコンポーネントを共有するため、ここで
     * リセットしないとコピー元選択や路線絞り込みが別モードへ漏れる。
     */
    resetForNewSession(): void {
        store.update(
            setProp('tripBlockId', () => initialProps.tripBlockId),
            setProp('selectedRouteIds', () => initialProps.selectedRouteIds),
            setProp(
                'copySourceCandidates',
                () => initialProps.copySourceCandidates,
            ),
            setProp('targetTripBlock', () => initialProps.targetTripBlock),
            setProp(
                'isSaveTripsIndividually',
                () => initialProps.isSaveTripsIndividually,
            ),
            setProp('submittedAt', () => initialProps.submittedAt),
        );
    },

    setMode(mode: ETimetableEditFormMode): void {
        store.update(setProp('mode', () => mode));
    },
    setCalendarId(calendarId: string): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setTripDirection(tripDirection: ETripDirection): void {
        store.update(setProp('tripDirection', () => tripDirection));
    },
    setTripBlockId(tripBlockId: string | null): void {
        store.update(setProp('tripBlockId', () => tripBlockId));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setRoutes(routes: RouteDetailsDto[]): void {
        store.update(setProp('routes', () => routes));
    },
    setSelectedRouteIds(routeIds: string[]): void {
        store.update(setProp('selectedRouteIds', () => routeIds));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setOperations(operations: OperationDetailsDto[]): void {
        store.update(setProp('operations', () => operations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setCopySourceCandidates(tripBlocks: TripBlockDetailsDto[]): void {
        store.update(setProp('copySourceCandidates', () => tripBlocks));
    },
    setTargetTripBlock(tripBlock: TripBlockDetailsDto | null): void {
        store.update(setProp('targetTripBlock', () => tripBlock));
    },
    setIsSaveTripsIndividually(bool: boolean): void {
        store.update(setProp('isSaveTripsIndividually', () => bool));
    },
    setSubmittedAt(time: number): void {
        store.update(setProp('submittedAt', () => time));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (s) => s.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (s) => s.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
    },

    mode$: store.pipe(select((s) => s.mode)),
    calendarId$: store.pipe(select((s) => s.calendarId)),
    tripDirection$: store.pipe(select((s) => s.tripDirection)),
    tripBlockId$: store.pipe(select((s) => s.tripBlockId)),
    calendar$: store.pipe(select((s) => s.calendar)),
    routes$: store.pipe(select((s) => s.routes)),
    selectedRouteIds$: store.pipe(select((s) => s.selectedRouteIds)),
    stations$: store.pipe(select((s) => s.stations)),
    operations$: store.pipe(select((s) => s.operations)),
    tripClasses$: store.pipe(select((s) => s.tripClasses)),
    copySourceCandidates$: store.pipe(select((s) => s.copySourceCandidates)),
    targetTripBlock$: store.pipe(select((s) => s.targetTripBlock)),
    isSaveTripsIndividually$: store.pipe(
        select((s) => s.isSaveTripsIndividually),
    ),
    isLoading$: store.pipe(select((s) => s.loadingQueue.length > 0)),
    submittedAt$: store.pipe(select((s) => s.submittedAt)),

    /** 方向反映済みの全駅リスト（フォームの times FormArray 構築に使う。情報は削減しない） */
    sortedStations$: combineLatest([
        store.pipe(select((s) => s.stations)),
        store.pipe(select((s) => s.tripDirection)),
    ]).pipe(
        map(([stations, tripDirection]) =>
            tripDirection === ETripDirection.INBOUND
                ? [...stations].reverse()
                : stations,
        ),
    ),

    /** B8-1: 路線チップの選択状態で絞り込んだ、方向反映済みの表示対象駅リスト（行の表示/非表示にのみ使う） */
    sortedVisibleStations$: combineLatest([
        store.pipe(select((s) => s.stations)),
        store.pipe(select((s) => s.tripDirection)),
        store.pipe(select((s) => s.selectedRouteIds)),
    ]).pipe(
        map(([stations, tripDirection, selectedRouteIds]) => {
            const sorted =
                tripDirection === ETripDirection.INBOUND
                    ? [...stations].reverse()
                    : stations;

            return visibleStations(sorted, selectedRouteIds);
        }),
    ),

    /** ADD 以外のモードでプリフィル対象となる trips（trip-block 単位） */
    trips$: store.pipe(
        select((s) => s.targetTripBlock),
        map((tripBlock) => sortTripsByFirstTime(tripBlock?.trips ?? [])),
    ),

    get mode(): ETimetableEditFormMode | null {
        return store.getValue().mode;
    },
    get calendarId(): string | null {
        return store.getValue().calendarId;
    },
    get tripDirection(): ETripDirection | null {
        return store.getValue().tripDirection;
    },
    get tripBlockId(): string | null {
        return store.getValue().tripBlockId;
    },
    get selectedRouteIds(): string[] {
        return store.getValue().selectedRouteIds;
    },
    get routes(): RouteDetailsDto[] {
        return store.getValue().routes;
    },
    get isSaveTripsIndividually(): boolean {
        return store.getValue().isSaveTripsIndividually;
    },
} as const;
