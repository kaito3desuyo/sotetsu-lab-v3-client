import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { lastValueFrom } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { LoadingComponent } from 'src/app/shared/app-shared/loading/loading.component';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableSearchCardStateStore } from 'src/app/shared/timetable-search-card/states/timetable-search-card.state';
import { TimetableAllLineRouteFilterComponent } from './components/timetable-all-line-route-filter/timetable-all-line-route-filter.component';
import { TimetableAllLineTableComponent } from './components/timetable-all-line-table/timetable-all-line-table.component';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TimetableAllLineStore.resetLoading();

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrls: ['./timetable-all-line.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        LoadingComponent,
        AdsenseModule,
        TimetableAllLineRouteFilterComponent,
        TimetableAllLineTableComponent,
        TimetableSearchCardCComponent,
    ],
})
export class TimetableAllLineComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #calendarSelectDialogService = inject(CalendarSelectDialogService);
    readonly #timetableAllLineService = inject(TimetableAllLineService);
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #timetableSearchCardService = inject(TimetableSearchCardService);
    readonly #timetableSearchCardStateStore = inject(
        TimetableSearchCardStateStore,
    );

    readonly isLoading = toSignal(TimetableAllLineStore.isLoading$);
    readonly tripDirection = toSignal(TimetableAllLineStore.tripDirection$);
    readonly stations = toSignal(TimetableAllLineStore.stations$, {
        initialValue: [],
    });
    readonly trips = toSignal(TimetableAllLineStore.trips$, {
        initialValue: [],
    });
    readonly pageSettings = toSignal(TimetableAllLineStore.pageSettings$);
    readonly viewModes = toSignal(TimetableAllLineStore.viewModes$, {
        initialValue: new Map(),
    });
    readonly bordersAfter = toSignal(TimetableAllLineStore.bordersAfter$, {
        initialValue: new Map(),
    });
    readonly calendar = toSignal(
        TimetableAllLineStore.calendarId$.pipe(
            mergeMap((id) =>
                this.#calendarListStateQuery.selectByCalendarId(id),
            ),
        ),
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const calendarId = paramMap.get('calendar_id');
                const tripDirection = +paramMap.get('trip_direction') as 0 | 1;
                const tripBlockId = paramMap.get('trip_block_id');

                TimetableAllLineStore.setCalendarId(calendarId);
                TimetableAllLineStore.setTripDirection(tripDirection);
                TimetableAllLineStore.setTripBlockId(tripBlockId ?? null);

                this.#timetableSearchCardStateStore.setCalendarId(calendarId);
                this.#timetableSearchCardStateStore.setTripDirection(
                    tripDirection,
                );

                this.fetchData();
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
    }

    async fetchData(): Promise<void> {
        if (!TimetableAllLineStore.calendarId) return;

        TimetableAllLineStore.enableLoading();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            await lastValueFrom(this.#timetableAllLineService.fetchStations());
            await lastValueFrom(
                this.#timetableAllLineService.fetchTripBlocks(),
            );
            TimetableAllLineStore.initializeSelectedRouteIds();
        } finally {
            TimetableAllLineStore.disableLoading();
        }
    }

    onPaged(pageSettings: PageEvent): void {
        TimetableAllLineStore.setPageSettings(pageSettings);
    }

    onClickedEditButton(trip: TripDetailsDto): void {
        this.#router.navigate([
            'timetable',
            'update',
            {
                calendar_id: trip.calendarId,
                trip_block_id: trip.tripBlockId,
            },
        ]);
    }

    onClickedCopyButton(trip: TripDetailsDto): void {
        const dialogRef = this.#calendarSelectDialogService.open();

        dialogRef.afterClosed().subscribe((calendarId) => {
            if (!calendarId) return;
            this.#router.navigate([
                'timetable',
                'copy',
                { calendar_id: calendarId, trip_block_id: trip.tripBlockId },
            ]);
        });
    }

    onClickedDeleteButton(trip: TripDetailsDto): void {
        const dialogRef = this.#confirmDialogService.open({
            width: '480px',
            data: {
                title: '列車を削除する',
                html: `<p>${trip.tripNumber}列車を削除しますか？この操作は元に戻すことができません。</p>`,
                cancelButtonText: 'キャンセル',
                goButtonText: '削除する',
                goButtonColor: 'warn',
            },
        });

        dialogRef.afterClosed().subscribe(async (done) => {
            if (!done) return;

            this.#loading.open();

            const result = await tryCatchAsync(
                this.#timetableAllLineService
                    .deleteTripFromTripBlock({
                        tripBlockId: trip.tripBlockId,
                        tripId: trip.tripId,
                    })
                    .pipe(
                        switchMap(() =>
                            this.#timetableAllLineService.fetchTripBlocks(),
                        ),
                    ),
            );

            this.#loading.close();

            if (result.isFailure()) {
                this.#error.handleError(result.error);
                this.#notification.open(result.error.message, 'OK');
                return;
            }

            this.#notification.open('削除しました', 'OK');
        });
    }

    onClickedAddTripInGroup({
        base,
        target,
    }: {
        base: TripDetailsDto;
        target: TripDetailsDto;
    }): void {
        const dialogRef = this.#confirmDialogService.open({
            width: '480px',
            data: {
                title: 'グループに追加する',
                html: `<p>${target.tripNumber}列車を${base.tripNumber}列車が所属するグループに追加しますか？</p>`,
                cancelButtonText: 'キャンセル',
                goButtonText: '追加する',
                goButtonColor: 'primary',
            },
        });

        dialogRef.afterClosed().subscribe(async (done) => {
            if (!done) return;

            this.#loading.open();

            const result = await tryCatchAsync(
                this.#timetableAllLineService
                    .addTripToTripBlock({
                        tripBlockId: base.tripBlockId,
                        tripId: target.tripId,
                    })
                    .pipe(
                        switchMap(() =>
                            this.#timetableAllLineService.fetchTripBlocks(),
                        ),
                    ),
            );

            this.#loading.close();

            if (result.isFailure()) {
                this.#error.handleError(result.error);
                this.#notification.open(result.error.message, 'OK');
                return;
            }

            this.#notification.open('グループに追加しました', 'OK');
        });
    }

    onClickedDeleteTripInGroup({
        base,
        target,
    }: {
        base: TripDetailsDto;
        target: TripDetailsDto;
    }): void {
        const dialogRef = this.#confirmDialogService.open({
            width: '480px',
            data: {
                title: 'グループから除外する',
                html: `<p>${target.tripNumber}列車を${base.tripNumber}列車が所属するグループから除外しますか？</p>`,
                cancelButtonText: 'キャンセル',
                goButtonText: '除外する',
                goButtonColor: 'warn',
            },
        });

        dialogRef.afterClosed().subscribe(async (done) => {
            if (!done) return;

            this.#loading.open();

            const result = await tryCatchAsync(
                this.#timetableAllLineService
                    .deleteTripFromTripBlock({
                        tripBlockId: base.tripBlockId,
                        tripId: target.tripId,
                        holdAsAnotherTripBlock: true,
                    })
                    .pipe(
                        switchMap(() =>
                            this.#timetableAllLineService.fetchTripBlocks(),
                        ),
                    ),
            );

            this.#loading.close();

            if (result.isFailure()) {
                this.#error.handleError(result.error);
                this.#notification.open(result.error.message, 'OK');
                return;
            }

            this.#notification.open('グループから除外しました', 'OK');
        });
    }
}
