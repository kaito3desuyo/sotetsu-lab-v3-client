import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
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
        MatProgressBarModule,
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
                const calendarId = paramMap.get('calendar_id');
                const stationId = paramMap.get('station_id');
                const tripDirection = Number(
                    paramMap.get('trip_direction'),
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
