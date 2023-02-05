import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { NotificationService } from 'src/app/core/services/notification.service';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../../states/timetable-all-line.state';

@Component({
    selector: 'app-timetable-all-line-table-c',
    templateUrl: './timetable-all-line-table-c.component.html',
    styleUrls: ['./timetable-all-line-table-c.component.scss'],
    providers: [RxState],
})
export class TimetableAllLineTableCComponent {
    readonly calendar$ = this.timetableAllLineStateQuery.calendarId$.pipe(
        mergeMap((id) => this.calendarListStateQuery.selectByCalendarId(id))
    );
    readonly tripDirection$ = this.timetableAllLineStateQuery.tripDirection$;
    readonly stations$ = this.timetableAllLineStateQuery.stations$;
    readonly trips$ = this.timetableAllLineStateQuery.trips$;
    readonly pageSettings$ = this.timetableAllLineStateQuery.pageSettings$;

    readonly onPaged$ = new Subject<PageEvent>();
    readonly onClickedEditButton$ = new Subject<TripDetailsDto>();
    readonly onClickedCopyButton$ = new Subject<TripDetailsDto>();
    readonly onClickedDeleteButton$ = new Subject<TripDetailsDto>();
    readonly onClickedAddTripInGroup$ = new Subject<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();
    readonly onClickedDeleteTripInGroup$ = new Subject<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();

    constructor(
        private readonly dialog: MatDialog,
        private readonly router: Router,
        private readonly state: RxState<{}>,
        private readonly notification: NotificationService,
        private readonly confirmDialogService: ConfirmDialogService,
        private readonly timetableAllLineService: TimetableAllLineService,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly timetableAllLineStateStore: TimetableAllLineStateStore,
        private readonly timetableAllLineStateQuery: TimetableAllLineStateQuery,
        private readonly calendarSelectDialogService: CalendarSelectDialogService,
        private readonly tripApi: TripApiService
    ) {
        this.state.hold(this.onPaged$, (pageSettings) => {
            this.timetableAllLineStateStore.setPageSettings(pageSettings);
        });
        this.state.hold(this.onClickedEditButton$, (trip) => {
            this.router.navigate([
                'timetable',
                'update',
                {
                    calendarId: trip.calendarId,
                    tripBlockId: trip.tripBlockId,
                },
            ]);
        });
        this.state.hold(this.onClickedCopyButton$, (trip) => {
            const dialogRef = this.calendarSelectDialogService.open();

            dialogRef.afterClosed().subscribe((calendarId) => {
                if (!calendarId) return;
                this.router.navigate([
                    'timetable',
                    'copy',
                    { calendarId, tripBlockId: trip.tripBlockId },
                ]);
            });
        });
        this.state.hold(this.onClickedDeleteButton$, (trip) => {
            const dialogRef = this.confirmDialogService.open({
                width: '480px',
                data: {
                    title: '列車を削除する',
                    html: `<p>${trip.tripNumber}列車を削除しますか？この操作は元に戻すことができません。</p>`,
                    cancelButtonText: 'キャンセル',
                    goButtonText: '削除する',
                    goButtonColor: 'warn',
                },
            });

            dialogRef.afterClosed().subscribe((done) => {
                if (!done) return;
                this.tripApi
                    .deleteTripById(trip.tripId)
                    .pipe(
                        switchMap(() =>
                            this.timetableAllLineService.fetchTripBlocksV2()
                        )
                    )
                    .subscribe({
                        complete: () => {
                            this.notification.open('削除しました', 'OK');
                        },
                        error: (e) => {
                            this.notification.open(
                                'エラーが発生しました',
                                'OK'
                            );
                        },
                    });
            });
        });
        this.state.hold(this.onClickedAddTripInGroup$, ({ base, target }) => {
            const dialogRef = this.confirmDialogService.open({
                width: '480px',
                data: {
                    title: 'グループに追加する',
                    html: `<p>${target.tripNumber}列車を${base.tripNumber}列車が所属するグループに追加しますか？</p>`,
                    cancelButtonText: 'キャンセル',
                    goButtonText: '追加する',
                    goButtonColor: 'primary',
                },
            });

            dialogRef.afterClosed().subscribe((done) => {
                if (done) {
                    this.tripApi
                        .addTripToTripBlockById(target.tripId, base.tripBlockId)
                        .pipe(
                            switchMap(() =>
                                this.timetableAllLineService.fetchTripBlocksV2()
                            )
                        )
                        .subscribe({
                            complete: () => {
                                this.notification.open(
                                    'グループに追加しました',
                                    'OK'
                                );
                            },
                            error: (e) => {
                                this.notification.open(
                                    'エラーが発生しました',
                                    'OK'
                                );
                            },
                        });
                }
            });
        });
        this.state.hold(
            this.onClickedDeleteTripInGroup$,
            ({ base, target }) => {
                const dialogRef = this.confirmDialogService.open({
                    width: '480px',
                    data: {
                        title: 'グループから除外する',
                        html: `<p>${target.tripNumber}列車を${base.tripNumber}列車が所属するグループから除外しますか？</p>`,
                        cancelButtonText: 'キャンセル',
                        goButtonText: '除外する',
                        goButtonColor: 'warn',
                    },
                });

                dialogRef.afterClosed().subscribe((done) => {
                    if (done) {
                        this.tripApi
                            .removeTripFromTripBlockById(target.tripId)
                            .pipe(
                                switchMap(() =>
                                    this.timetableAllLineService.fetchTripBlocksV2()
                                )
                            )
                            .subscribe({
                                complete: () => {
                                    this.notification.open(
                                        'グループから除外しました',
                                        'OK'
                                    );
                                },
                                error: (e) => {
                                    this.notification.open(
                                        'エラーが発生しました',
                                        'OK'
                                    );
                                },
                            });
                    }
                });
            }
        );
    }
}
