import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TrainDiagramControllerComponent } from './components/train-diagram-controller/train-diagram-controller.component';
import { TrainDiagramInfoPanelComponent } from './components/train-diagram-info-panel/train-diagram-info-panel.component';
import { TrainDiagramLegendComponent } from './components/train-diagram-legend/train-diagram-legend.component';
import { TrainDiagramChartComponent } from './components/train-diagram-chart/train-diagram-chart.component';
import { TrainDiagramSelectedTripInfo } from './interfaces/train-diagram-selected-trip-info.interface';
import { TrainDiagramService } from './services/train-diagram.service';
import {
    DIAGRAM_ZOOM_LEVELS,
    DiagramDirectionFilter,
    DiagramZoomLevel,
    TrainDiagramStore,
} from './stores/train-diagram.store';
import { buildRouteIdsByStation } from './utils/build-route-ids-by-station.util';
import { filterTripBlocksByDirection } from './utils/filter-trip-blocks-by-direction.util';
import {
    computeDefaultWindowStartHour,
    formatWindowValue,
    parseWindowStartHour,
} from './utils/generate-diagram-window-options.util';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TrainDiagramStore.resetLoading();

@Component({
    selector: 'app-train-diagram',
    templateUrl: './train-diagram.component.html',
    styleUrl: './train-diagram.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        TrainDiagramControllerComponent,
        TrainDiagramLegendComponent,
        TrainDiagramChartComponent,
        TrainDiagramInfoPanelComponent,
    ],
})
export class TrainDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #timetableDiagramService = inject(TrainDiagramService);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly isLoading = toSignal(TrainDiagramStore.isLoading$);
    readonly calendarId = toSignal(TrainDiagramStore.calendarId$, {
        initialValue: null,
    });
    readonly selectedRouteIds = toSignal(
        TrainDiagramStore.selectedRouteIds$,
        { initialValue: [] },
    );
    readonly windowStartHour = toSignal(
        TrainDiagramStore.windowStartHour$,
        { initialValue: 7 },
    );
    readonly zoomLevel = toSignal(TrainDiagramStore.zoomLevel$, {
        initialValue: 'standard' as DiagramZoomLevel,
    });
    readonly pxPerMinute = computed(() => DIAGRAM_ZOOM_LEVELS[this.zoomLevel()]);
    readonly directionFilter = toSignal(TrainDiagramStore.directionFilter$, {
        initialValue: 'both' as DiagramDirectionFilter,
    });
    readonly stationAxisStations = toSignal(
        TrainDiagramStore.stationAxisStations$,
        { initialValue: [] },
    );
    readonly stationAxis = toSignal(TrainDiagramStore.stationAxis$, {
        initialValue: null,
    });
    readonly tripClasses = toSignal(TrainDiagramStore.tripClasses$, {
        initialValue: [],
    });
    readonly tripBlocksByDirection = toSignal(
        TrainDiagramStore.tripBlocksByDirection$,
        { initialValue: {} },
    );
    /**
     * 方向フィルタ（上り/下り/両方）で絞り込んだ tripBlocksByDirection。chart には
     * この絞り込み済み Record を渡すことで chart 側を変更せずに描画列車を絞る。
     */
    readonly filteredTripBlocksByDirection = computed(() =>
        filterTripBlocksByDirection(
            this.tripBlocksByDirection(),
            this.directionFilter(),
        ),
    );
    readonly selectedTripId = toSignal(TrainDiagramStore.selectedTripId$, {
        initialValue: null,
    });
    readonly operationSightingTimeCrossSections = toSignal(
        TrainDiagramStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );

    readonly todaysCalendarIds = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarIds$,
        { initialValue: [] },
    );
    readonly #routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly isTodaySelected = computed(() =>
        this.todaysCalendarIds().includes(this.calendarId() ?? ''),
    );

    /**
     * 全ルートの駅から stationId → 駅名 のマップを作る。行き先（trip 最終駅）は
     * 表示中の路線軸外（直通先の他社線駅）になりうるため、軸ではなく全駅から引く。
     */
    readonly #stationNameById = computed(() => {
        const map = new Map<string, string>();
        for (const route of this.#routeStations()) {
            for (const rsl of route.routeStationLists ?? []) {
                const station = rsl.station;
                if (station?.stationId && station.stationName) {
                    map.set(station.stationId, station.stationName);
                }
            }
        }
        return map;
    });

    /**
     * 駅ID → 所属routeId集合（選択路線に限定）。
     * build-trip-diagram-line で「経由しない分岐区間」を判定するために chart へ渡す。
     */
    readonly routeIdsByStation = computed(() =>
        buildRouteIdsByStation(this.#routeStations(), this.selectedRouteIds()),
    );

    readonly #allTrips = computed<TripDetailsDto[]>(() =>
        Object.values(this.tripBlocksByDirection())
            .flat()
            .flatMap((block) => block.trips ?? []),
    );

    readonly selectedTripInfo = computed<TrainDiagramSelectedTripInfo | null>(
        () => {
            const tripId = this.selectedTripId();
            if (!tripId) {
                return null;
            }
            const trip = this.#allTrips().find((t) => t.tripId === tripId);
            if (!trip) {
                return null;
            }

            const times = [...(trip.times ?? [])].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            const lastStationId = times[times.length - 1]?.stationId;
            const destinationName = lastStationId
                ? this.#stationNameById().get(lastStationId) ?? ''
                : '';

            const tripOperationList = trip.tripOperationLists?.[0];
            const operationId = tripOperationList?.operationId;
            const operationNumber = tripOperationList?.operation?.operationNumber;
            const formationNumber = operationNumber
                ? this.operationSightingTimeCrossSections()[operationNumber]
                      ?.expectedSighting?.formation?.formationNumber
                : undefined;

            return {
                tripId,
                tripNumber: trip.tripNumber ?? '',
                tripClassName: trip.tripClass?.tripClassName ?? '',
                tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
                destinationName,
                operationId,
                operationNumber,
                formationNumber: this.isTodaySelected()
                    ? formationNumber
                    : undefined,
                detailLink: [
                    '/timetable',
                    'all-line',
                    {
                        calendar_id: this.calendarId() ?? '',
                        trip_direction: String(trip.tripDirection ?? ''),
                        trip_block_id: trip.tripBlockId ?? '',
                    },
                ],
            };
        },
    );

    readonly #firstLoadDone = signal(false);

    constructor() {
        this.#routeStationListStateQuery.routeStations$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((routeStations) => {
                TrainDiagramStore.setRouteStations(routeStations);
            });

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const calendarId =
                    paramMap.get('calendar_id') ??
                    this.#todaysCalendarListStateQuery.todaysCalendarId;

                const routeIdsParam = paramMap.get('route_ids');
                const resolvedRouteIds = routeIdsParam
                    ? routeIdsParam.split(',').filter(Boolean)
                    : this.#defaultRouteIds();
                const windowStartHour =
                    parseWindowStartHour(paramMap.get('window')) ??
                    computeDefaultWindowStartHour(new Date());
                const directionFilter = this.#parseDirectionFilter(
                    paramMap.get('direction'),
                );

                const missingParams =
                    !paramMap.get('calendar_id') ||
                    !routeIdsParam ||
                    !paramMap.get('window');

                if (missingParams && calendarId && resolvedRouteIds.length) {
                    this.#router.navigate(
                        [
                            '/train-diagram',
                            {
                                calendar_id: calendarId,
                                route_ids: resolvedRouteIds.join(','),
                                window: formatWindowValue(windowStartHour),
                            },
                        ],
                        { replaceUrl: true },
                    );
                    return;
                }

                const calendarChanged =
                    TrainDiagramStore.calendarId !== calendarId;

                TrainDiagramStore.setCalendarId(calendarId ?? null);
                TrainDiagramStore.setSelectedRouteIds(resolvedRouteIds);
                TrainDiagramStore.setWindowStartHour(windowStartHour);
                TrainDiagramStore.setDirectionFilter(directionFilter);
                TrainDiagramStore.setSelectedTripId(null);

                this.fetchData({
                    refetchTripBlocks: calendarChanged || !this.#firstLoadDone(),
                });
            });
    }

    /** 既定 = 全路線（route_ids 未指定時。全線時刻表の initializeSelectedRouteIds と同じ既定）。 */
    #defaultRouteIds(): string[] {
        return this.#routeStations().map((route) => route.routeId);
    }

    /** matrix param `direction` を検証して方向フィルタに復元する（不正/未指定は既定 'both'）。 */
    #parseDirectionFilter(value: string | null): DiagramDirectionFilter {
        return value === 'up' || value === 'down' ? value : 'both';
    }

    async fetchData(flags: { refetchTripBlocks: boolean }): Promise<void> {
        TrainDiagramStore.enableLoading();

        if (!this.#firstLoadDone()) {
            await lastValueFrom(this.#timetableDiagramService.fetchTripClasses());
            await lastValueFrom(
                this.#timetableDiagramService.fetchNetworkStations(),
            );
        }
        if (flags.refetchTripBlocks) {
            await lastValueFrom(this.#timetableDiagramService.fetchTripBlocks());
        }

        TrainDiagramStore.disableLoading();
        this.#firstLoadDone.set(true);
    }

    onCalendarIdChange(calendarId: string): void {
        this.#navigate({ calendar_id: calendarId });
    }

    onRouteIdsChange(routeIds: string[]): void {
        this.#navigate({ route_ids: routeIds.join(',') });
    }

    onWindowStartHourChange(hour: number): void {
        this.#navigate({ window: formatWindowValue(hour) });
    }

    onZoomLevelChange(level: DiagramZoomLevel): void {
        TrainDiagramStore.setZoomLevel(level);
    }

    onDirectionFilterChange(directionFilter: DiagramDirectionFilter): void {
        this.#navigate({ direction: directionFilter });
    }

    async onTripSelected(tripId: string | null): Promise<void> {
        TrainDiagramStore.setSelectedTripId(tripId);

        if (!tripId || !this.isTodaySelected()) {
            return;
        }

        const trip = this.#allTrips().find((t) => t.tripId === tripId);
        const operationNumber =
            trip?.tripOperationLists?.[0]?.operation?.operationNumber;

        if (
            operationNumber &&
            !this.operationSightingTimeCrossSections()[operationNumber]
        ) {
            await lastValueFrom(
                this.#timetableDiagramService.fetchOperationSightingTimeCrossSection(
                    operationNumber,
                ),
            );
        }
    }

    onTripActivated(tripId: string): void {
        const trip = this.#allTrips().find((t) => t.tripId === tripId);
        if (!trip) {
            return;
        }
        this.#router.navigate([
            '/timetable',
            'all-line',
            {
                calendar_id: this.calendarId() ?? '',
                trip_direction: String(trip.tripDirection ?? ''),
                trip_block_id: trip.tripBlockId ?? '',
            },
        ]);
    }

    onInfoPanelClosed(): void {
        TrainDiagramStore.setSelectedTripId(null);
    }

    #navigate(overrides: Record<string, string>): void {
        const params = { ...this.#route.snapshot.params, ...overrides };
        this.#router.navigate(['/train-diagram', params]);
    }
}
