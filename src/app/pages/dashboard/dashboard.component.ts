import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { TimetablePostCardService } from 'src/app/shared/timetable-post-card/services/timetable-post-card.service';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { DashboardCollapsibleCardsComponent } from './components/dashboard-collapsible-cards/dashboard-collapsible-cards.component';
import { DashboardLatestSightingsComponent } from './components/dashboard-latest-sightings/dashboard-latest-sightings.component';
import { DashboardQuickTilesComponent } from './components/dashboard-quick-tiles/dashboard-quick-tiles.component';
import { DashboardStatusCardComponent } from './components/dashboard-status-card/dashboard-status-card.component';
import { DashboardService } from './services/dashboard.service';
import { DashboardStore } from './stores/dashboard.store';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        DashboardStatusCardComponent,
        DashboardQuickTilesComponent,
        DashboardLatestSightingsComponent,
        DashboardCollapsibleCardsComponent,
    ],
})
export class DashboardComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #router = inject(Router);
    readonly #dashboardService = inject(DashboardService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);
    readonly #timetableSearchCardService = inject(TimetableSearchCardService);
    readonly #timetablePostCardService = inject(TimetablePostCardService);

    readonly isLoading = toSignal(DashboardStore.isLoading$, {
        initialValue: false,
    });

    constructor() {
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        DashboardStore.enableLoading();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            await lastValueFrom(this.#dashboardService.fetchTodaysCalendar());
            await lastValueFrom(this.#dashboardService.fetchTodaysDayName());
            await lastValueFrom(
                this.#dashboardService.fetchRunningTripCount(),
            );
            await lastValueFrom(this.#dashboardService.fetchTodaysSightings());
            await lastValueFrom(
                this.#dashboardService.fetchLatestSightingPositions(),
            );
            await lastValueFrom(this.#dashboardService.fetchTripClasses());
        } finally {
            DashboardStore.disableLoading();
        }
    }

    hookEvent(): void {
        this.#operationSearchCardService
            .receiveSearchOperationTableEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((calendarId) => {
                this.#router.navigate([
                    '/operation/table',
                    { calendar_id: calendarId },
                ]);
            });

        this.#operationSearchCardService
            .receiveSearchOperationRouteDiagramEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((operationId) => {
                this.#router.navigate([
                    '/operation/route-diagram',
                    { operation_id: operationId },
                ]);
            });

        this.#timetableSearchCardService
            .receiveSearchTimetableEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((state) => {
                if (state.searchByStation) {
                    this.#router.navigate([
                        'timetable',
                        'station',
                        {
                            calendar_id: state.calendarId,
                            station_id: state.stationId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                } else {
                    this.#router.navigate([
                        'timetable',
                        'all-line',
                        {
                            calendar_id: state.calendarId,
                            trip_direction: state.tripDirection,
                        },
                    ]);
                }
            });

        this.#timetablePostCardService
            .receiveMoveTimetableAddEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((state) => {
                this.#router.navigate([
                    'timetable',
                    'add',
                    state.calendarId,
                    { trip_direction: state.tripDirection },
                ]);
            });
    }
}
