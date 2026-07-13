import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableStationTableComponent } from './components/timetable-station-table/timetable-station-table.component';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TimetableStationStore.resetLoading();

@Component({
    selector: 'app-timetable-station',
    templateUrl: './timetable-station.component.html',
    styleUrls: ['./timetable-station.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonToggleModule,
        MatFormFieldModule,
        MatProgressBarModule,
        MatSelectModule,
        AdsenseModule,
        EmptyStateComponent,
        TimetableStationTableComponent,
        TimetableSearchCardCComponent,
    ],
})
export class TimetableStationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);
    readonly #timetableStationService = inject(TimetableStationService);
    readonly #timetableSearchCardService = inject(TimetableSearchCardService);
    readonly #timetableSearchCardStateStore = inject(
        TimetableSearchCardStateStore,
    );
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly stationOptions = toSignal(
        this.#routeStationListStateQuery.stations$,
        { initialValue: [] },
    );

    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    readonly isLoading = toSignal(TimetableStationStore.isLoading$);
    readonly calendarId = toSignal(TimetableStationStore.calendarId$);
    readonly stationId = toSignal(TimetableStationStore.stationId$);
    readonly tripDirection = toSignal(TimetableStationStore.tripDirection$);
    readonly calendar = toSignal(TimetableStationStore.calendar$);
    readonly timetableData = toSignal(TimetableStationStore.timetableData$, {
        initialValue: [],
    });
    readonly todaysCalendarIds = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarIds$,
        { initialValue: [] as string[] },
    );

    /**
     * B7: 表示中 calendar が「今日有効なダイヤ集合」に含まれるか。
     * resolver/ストアに新規状態を足さず、コンポーネント内の派生値として持つ。
     */
    readonly isTodaysCalendar = computed(() => {
        const calendarId = this.calendarId();
        return !!calendarId && this.todaysCalendarIds().includes(calendarId);
    });

    readonly isEmpty = computed(
        () => !!this.calendar() && this.timetableData().length === 0,
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const rawCalendarId = paramMap.get('calendar_id');
                const rawStationId = paramMap.get('station_id');
                const rawTripDirection = paramMap.get('trip_direction');

                // 既定表示（mockup-01）: パラメータ不足時は 横浜 / 今日のダイヤ / 上り へ補完
                if (!rawCalendarId || !rawStationId || rawTripDirection === null) {
                    const defaultCalendarId =
                        rawCalendarId ??
                        this.#todaysCalendarListStateQuery.todaysCalendarId;
                    const defaultStationId =
                        rawStationId ??
                        this.stationOptions().find(
                            (s) => s.stationName === '横浜',
                        )?.stationId ??
                        this.stationOptions()[0]?.stationId;
                    const defaultTripDirection =
                        rawTripDirection ?? String(ETripDirection.INBOUND);

                    if (defaultCalendarId && defaultStationId) {
                        this.#router.navigate(
                            [
                                'timetable',
                                'station',
                                {
                                    calendar_id: defaultCalendarId,
                                    station_id: defaultStationId,
                                    trip_direction: defaultTripDirection,
                                },
                            ],
                            { replaceUrl: true },
                        );
                        return;
                    }
                }

                const calendarId = rawCalendarId;
                const stationId = rawStationId;
                const tripDirection = Number(
                    rawTripDirection,
                ) as ETripDirection;

                TimetableStationStore.setCalendarId(calendarId);
                TimetableStationStore.setStationId(stationId);
                TimetableStationStore.setTripDirection(tripDirection);

                this.#timetableSearchCardStateStore.setCalendarId(calendarId);
                this.#timetableSearchCardStateStore.setTripDirection(
                    tripDirection,
                );
                this.#timetableSearchCardStateStore.enableSearchByStation();
                this.#timetableSearchCardStateStore.setStationId(stationId);

                this.fetchData();
            });

        this.#timetableSearchCardService
            .receiveSearchTimetableEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((state) => {
                const navigation = state.searchByStation
                    ? this.#router.navigate([
                          'timetable',
                          'station',
                          {
                              calendar_id: state.calendarId,
                              station_id: state.stationId,
                              trip_direction: state.tripDirection,
                          },
                      ])
                    : this.#router.navigate([
                          'timetable',
                          'all-line',
                          {
                              calendar_id: state.calendarId,
                              trip_direction: state.tripDirection,
                          },
                      ]);

                this.#handleNavigationResult(navigation);
            });
    }

    async fetchData(): Promise<void> {
        TimetableStationStore.enableLoading();

        await lastValueFrom(this.#timetableStationService.fetchCalendar());
        await lastValueFrom(this.#timetableStationService.fetchTrips());
        await lastValueFrom(this.#timetableStationService.fetchTripClasses());
        await lastValueFrom(this.#timetableStationService.fetchStations());
        await lastValueFrom(this.#timetableStationService.fetchOperations());
        await lastValueFrom(this.#timetableStationService.fetchTripBlocks());

        // B7: 過去ダイヤ表示時は編成関連（目撃クロスセクション）のフェッチ自体をスキップする
        if (this.isTodaysCalendar()) {
            await lastValueFrom(
                this.#timetableStationService.fetchOperationSightingTimeCrossSections(),
            );
        } else {
            TimetableStationStore.setOperationSightingTimeCrossSections([]);
        }

        TimetableStationStore.disableLoading();
    }

    onStationChange(stationId: string): void {
        if (stationId === this.stationId()) return;
        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: this.calendarId(),
                station_id: stationId,
                trip_direction: this.tripDirection(),
            },
        ]);
        this.#handleNavigationResult(navigation);
    }

    onCalendarChange(calendarId: string): void {
        if (calendarId === this.calendarId()) return;
        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: calendarId,
                station_id: this.stationId(),
                trip_direction: this.tripDirection(),
            },
        ]);
        this.#handleNavigationResult(navigation);
    }

    onDirectionChange(tripDirection: ETripDirection): void {
        if (tripDirection === this.tripDirection()) return;

        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: this.calendarId(),
                station_id: this.stationId(),
                trip_direction: tripDirection,
            },
        ]);

        this.#handleNavigationResult(navigation);
    }

    #handleNavigationResult(navigation: Promise<boolean>): void {
        navigation
            .then((succeeded) => {
                if (!succeeded) {
                    console.error(
                        'timetable navigation did not complete',
                    );
                    this.#notificationService.open(
                        'ページの遷移に失敗しました',
                        'OK',
                    );
                }
            })
            .catch((error) => {
                console.error('timetable navigation failed', error);
                this.#notificationService.open(
                    'ページの遷移に失敗しました',
                    'OK',
                );
            });
    }
}
