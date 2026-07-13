import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { format } from 'date-fns';
import { interval, lastValueFrom } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { LoadingComponent } from 'src/app/shared/app-shared/loading/loading.component';
import { estimatePositions } from 'src/app/shared/train-position.util';
import { TrainLocationClockComponent } from './components/train-location-clock/train-location-clock.component';
import { TrainLocationControllerComponent } from './components/train-location-controller/train-location-controller.component';
import { TrainLocationLineComponent } from './components/train-location-line/train-location-line.component';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationMode, TrainLocationStore } from './stores/train-location.store';
import { buildInterchangeRoutesByStationId } from './utils/build-interchange-routes-by-station-id.util';
import { buildTrainLocationCards } from './utils/build-train-location-cards.util';
import { buildTrainLocationRows } from './utils/build-train-location-rows.util';
import { determineMajorStations } from './utils/determine-major-stations.util';
import {
    formatTimeParam,
    fromTimeInputValue,
    parseTimeParam,
    toDateWithTime,
    toTimeInputValue,
} from './utils/parse-time-param.util';

const CURRENT_TIME_REFRESH_MS = 10_000;

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（train-diagram と同一パターン）
TrainLocationStore.resetLoading();

@Component({
    selector: 'app-train-location',
    templateUrl: './train-location.component.html',
    styleUrl: './train-location.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        LoadingComponent,
        TrainLocationControllerComponent,
        TrainLocationClockComponent,
        TrainLocationLineComponent,
    ],
})
export class TrainLocationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #trainLocationService = inject(TrainLocationService);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly isLoading = toSignal(TrainLocationStore.isLoading$);
    readonly calendarId = toSignal(TrainLocationStore.calendarId$, {
        initialValue: null,
    });
    readonly selectedRouteId = toSignal(TrainLocationStore.selectedRouteId$, {
        initialValue: null,
    });
    readonly mode = toSignal(TrainLocationStore.mode$, {
        initialValue: 'now' as TrainLocationMode,
    });
    readonly specifiedTime = toSignal(TrainLocationStore.specifiedTime$, {
        initialValue: null,
    });
    readonly stationAxisStations = toSignal(
        TrainLocationStore.stationAxisStations$,
        { initialValue: [] },
    );
    readonly tripBlocksByDirection = toSignal(
        TrainLocationStore.tripBlocksByDirection$,
        { initialValue: {} },
    );
    readonly operationSightingTimeCrossSections = toSignal(
        TrainLocationStore.operationSightingTimeCrossSections$,
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
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    readonly isTodaySelected = computed(() =>
        this.todaysCalendarIds().includes(this.calendarId() ?? ''),
    );

    /** 現在時刻モードの 10 秒周期追従用。時刻指定モードでは参照しない。 */
    readonly #now = signal(new Date());

    readonly at = computed<Date>(() => {
        if (this.mode() === 'specified') {
            const parsed = parseTimeParam(this.specifiedTime());
            return parsed ? toDateWithTime(new Date(), parsed) : new Date();
        }
        return this.#now();
    });

    readonly #allTripBlocks = computed(() =>
        Object.values(this.tripBlocksByDirection()).flat(),
    );

    readonly #majorStationIds = computed(() => {
        const axisStationIds = new Set(
            this.stationAxisStations().map((s) => s.stationId),
        );
        return determineMajorStations(this.#allTripBlocks(), axisStationIds);
    });

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

    /** 編成の所属会社名解決用（agencyId → agencyName）。グローバル AgencyList 由来。 */
    readonly #agencyNameById = computed(() => {
        const map = new Map<string, string>();
        for (const agency of this.#agencies()) {
            if (agency.agencyId && agency.agencyName) {
                map.set(agency.agencyId, agency.agencyName);
            }
        }
        return map;
    });

    readonly #cardsById = computed(() =>
        buildTrainLocationCards(
            this.#allTripBlocks(),
            this.operationSightingTimeCrossSections(),
            this.isTodaySelected(),
            this.calendarId() ?? '',
            this.#stationNameById(),
            this.#agencyNameById(),
        ),
    );

    readonly positions = computed(() =>
        estimatePositions(
            this.#allTripBlocks(),
            this.stationAxisStations(),
            this.at(),
        ),
    );

    /** 選択中路線を除く、他ルートに属する乗換路線を stationId 別に引くためのマップ */
    readonly #interchangeRoutesByStationId = computed(() =>
        buildInterchangeRoutesByStationId(
            this.#routeStations(),
            this.selectedRouteId(),
        ),
    );

    readonly rows = computed(() =>
        buildTrainLocationRows(
            this.stationAxisStations(),
            this.positions(),
            this.#cardsById(),
            this.#majorStationIds(),
            this.#interchangeRoutesByStationId(),
        ),
    );

    readonly clockText = computed(() => format(this.at(), 'HH:mm:ss'));
    readonly timeInputValue = computed(() => {
        const parsed = parseTimeParam(this.specifiedTime());
        return parsed ? toTimeInputValue(parsed) : format(new Date(), 'HH:mm');
    });

    /** 現在アクティブ（停車中/走行中）な trip の operationNumber 一覧（充当編成番号の背景取得対象）。 */
    readonly #activeOperationNumbers = computed<string[]>(() => {
        const activeTripIds = new Set(this.positions().map((p) => p.tripId));
        const numbers = new Set<string>();
        for (const block of this.#allTripBlocks()) {
            for (const trip of block.trips ?? []) {
                if (!trip.tripId || !activeTripIds.has(trip.tripId)) {
                    continue;
                }
                const operationNumber =
                    trip.tripOperationLists?.[0]?.operation?.operationNumber;
                if (operationNumber) {
                    numbers.add(operationNumber);
                }
            }
        }
        return Array.from(numbers);
    });

    readonly #firstLoadDone = signal(false);

    constructor() {
        interval(CURRENT_TIME_REFRESH_MS)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => this.#now.set(new Date()));

        toObservable(this.#activeOperationNumbers)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((operationNumbers) => {
                if (!this.isTodaySelected() || !operationNumbers.length) {
                    return;
                }
                void lastValueFrom(
                    this.#trainLocationService.fetchMissingOperationSightingTimeCrossSections(
                        operationNumbers,
                    ),
                );
            });

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const routeId = paramMap.get('route_id') ?? this.#defaultRouteId();
                const timeParam = paramMap.get('time');
                const mode: TrainLocationMode = timeParam ? 'specified' : 'now';
                const todaysCalendarId =
                    this.#todaysCalendarListStateQuery.todaysCalendarId;
                const calendarId =
                    mode === 'specified'
                        ? (paramMap.get('calendar_id') ?? todaysCalendarId)
                        : todaysCalendarId;

                const missingParams = !paramMap.get('route_id');
                if (missingParams && routeId) {
                    this.#router.navigate(
                        ['/train-location', { route_id: routeId }],
                        { replaceUrl: true },
                    );
                    return;
                }

                const routeChanged =
                    TrainLocationStore.selectedRouteId !== (routeId ?? null);
                const calendarChanged =
                    TrainLocationStore.calendarId !== (calendarId ?? null);

                TrainLocationStore.setSelectedRouteId(routeId ?? null);
                TrainLocationStore.setCalendarId(calendarId ?? null);
                TrainLocationStore.setMode(mode);
                TrainLocationStore.setSpecifiedTime(
                    mode === 'specified' ? (timeParam ?? null) : null,
                );

                this.fetchData({
                    refetchTripBlocks: calendarChanged || !this.#firstLoadDone(),
                    refetchStationAxis:
                        routeChanged || !this.#firstLoadDone(),
                });
            });
    }

    #defaultRouteId(): string | undefined {
        return this.#routeStations()[0]?.routeId;
    }

    async fetchData(flags: {
        refetchTripBlocks: boolean;
        refetchStationAxis: boolean;
    }): Promise<void> {
        TrainLocationStore.enableLoading();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            if (!this.#firstLoadDone()) {
                await lastValueFrom(
                    this.#trainLocationService.fetchTripClasses(),
                );
            }
            if (flags.refetchTripBlocks) {
                await lastValueFrom(
                    this.#trainLocationService.fetchTripBlocks(),
                );
            }
            if (flags.refetchStationAxis) {
                await lastValueFrom(
                    this.#trainLocationService.fetchStationAxis(),
                );
            }
            this.#firstLoadDone.set(true);
        } finally {
            TrainLocationStore.disableLoading();
        }
    }

    onCalendarIdChange(calendarId: string): void {
        if (this.mode() !== 'specified') {
            return;
        }
        this.#navigate({ calendar_id: calendarId });
    }

    onRouteIdChange(routeId: string): void {
        this.#navigate({ route_id: routeId });
    }

    onModeChange(mode: TrainLocationMode): void {
        if (mode === 'specified') {
            const timeValue = formatTimeParam({
                hours: this.at().getHours(),
                minutes: this.at().getMinutes(),
            });
            this.#navigate({
                time: timeValue,
                calendar_id:
                    this.calendarId() ??
                    this.#todaysCalendarListStateQuery.todaysCalendarId ??
                    '',
            });
            return;
        }
        this.#navigateWithoutTimeParams();
    }

    onTimeInputValueChange(value: string): void {
        const parsed = fromTimeInputValue(value);
        if (!parsed) {
            return;
        }
        this.#navigate({
            time: formatTimeParam(parsed),
            calendar_id:
                this.calendarId() ??
                this.#todaysCalendarListStateQuery.todaysCalendarId ??
                '',
        });
    }

    #navigate(overrides: Record<string, string>): void {
        const params = { ...this.#route.snapshot.params, ...overrides };
        this.#router.navigate(['/train-location', params]);
    }

    #navigateWithoutTimeParams(): void {
        const { time, calendar_id, ...rest } = this.#route.snapshot.params;
        void time;
        void calendar_id;
        this.#router.navigate(['/train-location', rest]);
    }
}
