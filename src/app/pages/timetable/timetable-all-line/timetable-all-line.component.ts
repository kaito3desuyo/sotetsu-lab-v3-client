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
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { parseTripDirectionParam } from 'src/app/shared/trip-direction-param.util';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { TimetableSearchCardComponent } from 'src/app/shared/timetable-search-card/timetable-search-card.component';
import { TimetableAllLineRouteFilterComponent } from './components/timetable-all-line-route-filter/timetable-all-line-route-filter.component';
import { TimetableAllLineTableComponent } from './components/timetable-all-line-table/timetable-all-line-table.component';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TimetableAllLineStore.resetLoading();

// 取得の世代番号。ストアと同じくモジュールに置き、ページのインスタンスをまたいで一意にする
// （離れてすぐ戻ったとき、前のインスタンスの取得の終わりが新しい骨組みを消さないように）
let fetchSeq = 0;

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrl: './timetable-all-line.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        SkeletonBarComponent,
        TimetableAllLineRouteFilterComponent,
        TimetableAllLineTableComponent,
        TimetableSearchCardComponent,
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
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly isLoading = toSignal(TimetableAllLineStore.isLoading$);
    readonly calendarId = toSignal(TimetableAllLineStore.calendarId$);
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
    readonly endpoints = toSignal(TimetableAllLineStore.endpoints$, {
        initialValue: new Map(),
    });
    readonly previousTrips = toSignal(TimetableAllLineStore.previousTrips$, {
        initialValue: new Map(),
    });
    readonly isAwaitingTripBlocks = toSignal(
        TimetableAllLineStore.isAwaitingTripBlocks$,
        { initialValue: false },
    );
    /** 骨組みの行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
    /** 骨組みの列車の列の数 */
    readonly skeletonColumns = Array.from({ length: 30 }, (_, i) => i);
    readonly calendar = toSignal(
        TimetableAllLineStore.calendarId$.pipe(
            mergeMap((id) =>
                this.#calendarListStateQuery.selectByCalendarId(id),
            ),
        ),
    );

    constructor() {
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        TimetableAllLineStore.setHasFetchedTripBlocks(false);

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const calendarId = paramMap.get('calendar_id');
                const tripDirection = parseTripDirectionParam(
                    paramMap.get('trip_direction'),
                );
                const tripBlockId = paramMap.get('trip_block_id');

                // 向きが無い・読めない URL は上りに置き換える（駅別時刻表と同じ）。
                // 以前は +null で黙って上り、+'abc' で NaN を API に送っていた
                if (calendarId && tripDirection === null) {
                    this.#router.navigate(
                        [
                            'timetable',
                            'all-line',
                            {
                                ...this.#route.snapshot.params,
                                trip_direction: ETripDirection.INBOUND,
                            },
                        ],
                        { replaceUrl: true },
                    );
                    return;
                }

                TimetableAllLineStore.setCalendarId(calendarId);
                TimetableAllLineStore.setTripDirection(tripDirection);
                TimetableAllLineStore.setTripBlockId(tripBlockId ?? null);

                this.fetchData();
            });
    }

    async fetchData(): Promise<void> {
        if (!TimetableAllLineStore.calendarId) return;

        const seq = ++fetchSeq;
        TimetableAllLineStore.enableLoading();
        TimetableAllLineStore.setHasFetchedTripBlocks(false);

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            TimetableAllLineStore.setAgencies(
                this.#agencyListStateQuery.agencies,
            );
            TimetableAllLineStore.setRouteOrder(
                (
                    await firstValueFrom(
                        this.#routeStationListStateQuery.routeStations$,
                    )
                ).map((route) => route.routeId),
            );
            await lastValueFrom(this.#timetableAllLineService.fetchStations());
            await lastValueFrom(
                this.#timetableAllLineService.fetchTripBlocks(),
            );
            TimetableAllLineStore.initializeSelectedRouteIds();
        } finally {
            TimetableAllLineStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === fetchSeq) {
                TimetableAllLineStore.setHasFetchedTripBlocks(true);
            }
        }
    }

    onPaged(pageSettings: PageEvent): void {
        TimetableAllLineStore.setPageSettings(pageSettings);
    }

    /** G12: 空状態の次アクション（反対方向へ切り替え。現在の calendar/route_ids 等は維持）。 */
    onToggleDirection(): void {
        const next = this.tripDirection() === 0 ? 1 : 0;
        this.#router.navigate([
            'timetable',
            'all-line',
            { ...this.#route.snapshot.params, trip_direction: next },
        ]);
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
