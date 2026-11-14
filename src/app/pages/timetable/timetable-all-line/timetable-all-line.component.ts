import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { calendarCacheTag } from 'src/app/core/ssr/cache-control';
import { afterFirstRender } from 'src/app/core/ssr/first-render';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { formatPageTitle } from 'src/app/core/utils/format-page-title.util';
import { tripDirectionLabel } from 'src/app/libs/trip/usecase/constants/trip.constant';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { parseTripDirectionParam } from 'src/app/shared/trip-direction-param.util';
import { parseUuid, readUrlParam } from 'src/app/shared/url-params/url-param';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { NotFoundContentComponent } from 'src/app/shared/not-found-content/not-found-content.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { buildStationGroups } from 'src/app/shared/station-groups.util';
import { formatTimetableAllLineSummaryLead } from './utils/timetable-all-line-summary.util';
import { StickyDirectionToggleComponent } from 'src/app/shared/sticky-direction-toggle/sticky-direction-toggle.component';
import { TodayCalendarButtonComponent } from 'src/app/shared/today-calendar-button/today-calendar-button.component';
import { TimetableAllLineRouteFilterComponent } from './components/timetable-all-line-route-filter/timetable-all-line-route-filter.component';
import { TimetableAllLineTableComponent } from './components/timetable-all-line-table/timetable-all-line-table.component';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';

@Component({
    selector: 'app-timetable-all-line',
    templateUrl: './timetable-all-line.component.html',
    styleUrl: './timetable-all-line.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatProgressBarModule,
        MatSelectModule,
        DateFnsPipe,
        LazyOptionsDirective,
        NotFoundContentComponent,
        SkeletonBarComponent,
        StickyDirectionToggleComponent,
        TimetableAllLineRouteFilterComponent,
        TimetableAllLineTableComponent,
        TodayCalendarButtonComponent,
    ],
})
export class TimetableAllLineComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #notification = inject(NotificationService);
    readonly #store = inject(TimetableAllLineStore);
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #calendarSelectDialogService = inject(CalendarSelectDialogService);
    readonly #timetableAllLineService = inject(TimetableAllLineService);
    readonly #calendarListState = inject(CalendarListState);
    readonly #agencyListState = inject(AgencyListState);
    readonly #routeStationListState = inject(RouteStationListState);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #ssrResponse = inject(SsrResponse);
    readonly #pageMeta = inject(PageMeta);
    readonly #pageNotFound = inject(PageNotFound);

    /** URL に値があるのに不正、または存在しない列車の運行のとき true（本体の代わりに見つからない表示を出す） */
    readonly notFound = signal(false);

    /** 編集・コピー・削除・グループの操作は、時刻表を書ける役割だけに出す。
     * サーバーと、それを引き継ぐ最初の描画では出さない（spec 5.3） */
    readonly canEdit = afterFirstRender(
        inject(UserState).canEditTimetable,
        false,
    );
    readonly isLoading = this.#store.isLoading;
    readonly calendarId = this.#store.calendarId;
    readonly tripDirection = this.#store.tripDirection;
    readonly stations = this.#store.visibleStations;
    readonly trips = this.#store.trips;
    readonly pageSettings = this.#store.pagination;
    readonly viewModes = this.#store.viewModes;
    readonly bordersAfter = this.#store.bordersAfter;
    readonly endpoints = this.#store.endpoints;
    readonly previousTrips = this.#store.previousTrips;
    readonly isAwaitingTripBlocks = this.#store.isAwaitingTripBlocks;
    /** 骨組みの行の数（画面 1 枚分を埋める数。あふれた分は箱が隠す） */
    readonly skeletonRows = Array.from({ length: 24 }, (_, i) => i);
    /** 骨組みの列車の列の数 */
    readonly skeletonColumns = Array.from({ length: 30 }, (_, i) => i);
    readonly calendar = computed(
        () => this.#calendarListState.entityMap()[this.calendarId()],
    );

    readonly calendars = this.#calendarListState.calendars;
    readonly #routeStations = this.#routeStationListState.routeStations;
    readonly #agencies = this.#agencyListState.agencies;
    /** 駅別時刻表へ移る選択欄の選択肢（駅別時刻表と同じ）。 */
    readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    /** 要約の頭に付ける「上り 改正日 ダイヤ名」 */
    readonly summaryLead = computed(() =>
        formatTimetableAllLineSummaryLead({
            calendar: this.calendar(),
            directionLabel: tripDirectionLabel.get(
                this.tripDirection() as ETripDirection,
            ),
        }),
    );

    /** 題名。方向とダイヤは取ったデータから作る */
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('全線時刻表', [
            tripDirectionLabel.get(this.tripDirection() as ETripDirection),
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });

    constructor() {
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        // 見つからない間は動かさない（PageNotFound.mark() の題名を上書きしない）
        effect(() => {
            if (this.notFound()) return;
            this.#pageMeta.setTitle(this.pageTitle());
        });

        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        this.#store.setHasFetchedTripBlocks(false);

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const calendarIdParam = readUrlParam(
                    paramMap.get('calendar_id'),
                    parseUuid,
                );
                const tripDirectionParam = readUrlParam(
                    paramMap.get('trip_direction'),
                    parseTripDirectionParam,
                );
                const tripBlockIdParam = readUrlParam(
                    paramMap.get('trip_block_id'),
                    parseUuid,
                );

                // 値があるのに不正（"undefined"・"abc" など）なら、見つからない表示にして取得しない
                if (
                    calendarIdParam.kind === 'invalid' ||
                    tripDirectionParam.kind === 'invalid' ||
                    tripBlockIdParam.kind === 'invalid'
                ) {
                    this.#markNotFound();
                    return;
                }
                this.notFound.set(false);

                // 値が無いものは今までどおり扱う
                const calendarId =
                    calendarIdParam.kind === 'ok'
                        ? calendarIdParam.value
                        : null;
                const tripDirection =
                    tripDirectionParam.kind === 'ok'
                        ? tripDirectionParam.value
                        : null;
                const tripBlockId =
                    tripBlockIdParam.kind === 'ok'
                        ? tripBlockIdParam.value
                        : null;

                // 向きが無い URL は上りに置き換える（駅別時刻表と同じ）。
                // 以前は +null で黙って上り、+'abc' で NaN を API に送っていた
                if (calendarId && tripDirection === null) {
                    // サーバーでは補わない。骨組みのまま返し、ブラウザで補う（駅別時刻表と同じ）
                    if (this.#isServer) return;

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

                if (calendarId) {
                    this.#ssrResponse.addCacheTags([
                        calendarCacheTag(calendarId),
                    ]);
                }
                this.#store.setCalendarId(calendarId);
                this.#store.setTripDirection(tripDirection);
                this.#store.setTripBlockId(tripBlockId);

                this.fetchData();
            });
    }

    #markNotFound(): void {
        this.notFound.set(true);
        this.#pageNotFound.mark();
    }

    async fetchData(): Promise<void> {
        if (!this.#store.calendarId()) return;

        const seq = this.#store.nextFetchSeq();
        this.#store.enableLoading();
        this.#store.setHasFetchedTripBlocks(false);
        const conditions = {
            calendarId: this.#store.calendarId(),
            tripDirection: this.#store.tripDirection(),
        };
        // 取得を始めたときの値で決める（待っている間に URL が替わっても、新しい URL を巻き込まない）
        const requestedTripBlockId = this.#store.tripBlockId();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            this.#store.setAgencies(this.#agencyListState.agencies());
            this.#store.setRouteOrder(
                this.#routeStationListState
                    .routeStations()
                    .map((route) => route.routeId),
            );
            // 駅一覧と trip-blocks は互いの結果を使わないので、同時に取る
            // （駅一覧は serviceId、trip-blocks はストアの条件で決まる）
            // 失敗を決める前に両方の終わりを待つ（遅れて届いた成功が、戻した中身を上書きしないように）
            const results = await Promise.allSettled([
                lastValueFrom(this.#timetableAllLineService.fetchStations()),
                lastValueFrom(this.#timetableAllLineService.fetchTripBlocks()),
            ]);
            const failure = results.find(
                (result) => result.status === 'rejected',
            );
            if (failure) {
                // 通信できないときは、同じ条件で保存した中身を出す（古い取得の失敗では戻さない）
                if (this.#store.isLatestFetch(seq)) {
                    try {
                        await this.#store.restoreOfflineSnapshot(
                            'main',
                            conditions,
                        );
                    } catch {
                        // 保存した中身が壊れていても、取得の失敗をそのまま投げる
                    }
                }
                throw failure.reason;
            }
            // 列車の運行（trip_block_id）を指して「無い」と返ったときだけ、見つからない表示にする
            // （失敗は上で今までどおり扱っている）
            if (
                this.#store.isLatestFetch(seq) &&
                requestedTripBlockId &&
                this.#store.tripBlocks().length === 0
            ) {
                this.#markNotFound();
                return;
            }
            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            if (this.#store.isLatestFetch(seq)) {
                void this.#store.saveOfflineSnapshot('main', conditions);
            }
            this.#store.initializeSelectedRouteIds();
        } finally {
            this.#store.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (this.#store.isLatestFetch(seq)) {
                this.#store.setHasFetchedTripBlocks(true);
            }
        }
    }

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'all-line',
                { ...this.#paramsWithoutTripBlock(), calendar_id: calendarId },
            ]),
            this.#notification,
        );
    }

    onStationSelect(stationId: string): void {
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'station',
                {
                    calendar_id: this.calendarId(),
                    station_id: stationId,
                    trip_direction: this.tripDirection(),
                },
            ]),
            this.#notification,
        );
    }

    onDirectionChange(tripDirection: number): void {
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'all-line',
                {
                    ...this.#paramsWithoutTripBlock(),
                    trip_direction: tripDirection,
                },
            ]),
            this.#notification,
        );
    }

    /**
     * 今の URL のパラメータから trip_block_id（列車番号のリンクで開いた 1 本）を除いたもの。
     * ダイヤ・方向を替えたら、前の 1 本ではなくその条件の全列車を出す（消した検索カードと同じ）
     */
    #paramsWithoutTripBlock(): Params {
        const params: Params = { ...this.#route.snapshot.params };
        delete params['trip_block_id'];
        return params;
    }

    onPaged(pageSettings: PageEvent): void {
        this.#store.setPageSettings(pageSettings);
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
