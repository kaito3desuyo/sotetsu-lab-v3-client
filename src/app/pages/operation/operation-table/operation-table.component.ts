import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableCardComponent } from './components/operation-table-card/operation-table-card.component';
import { OperationTableFilterComponent } from './components/operation-table-filter/operation-table-filter.component';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';
import {
    deriveGroupName,
    matchesGroupFilter,
} from 'src/app/shared/operation-group.util';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
OperationTableStore.resetLoading();

@Component({
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    styleUrls: ['./operation-table.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        AdsenseModule,
        EmptyStateComponent,
        OperationTableFilterComponent,
        OperationTableCardComponent,
        OperationSearchCardCComponent,
    ],
})
export class OperationTableComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);
    readonly #operationTableService = inject(OperationTableService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );

    readonly isLoading = toSignal(OperationTableStore.isLoading$);
    readonly calendarId = toSignal(OperationTableStore.calendarId$);
    readonly calendar = toSignal(OperationTableStore.calendar$);
    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly operationTrips = toSignal(OperationTableStore.operationTrips$, {
        initialValue: [],
    });
    readonly stations = toSignal(OperationTableStore.stations$, {
        initialValue: [],
    });
    readonly tripClasses = toSignal(OperationTableStore.tripClasses$, {
        initialValue: [],
    });
    readonly selectedGroupNames = toSignal(
        OperationTableStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly isEmpty = computed(
        () => !!this.calendar() && this.operationTrips().length === 0,
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const calendarId =
                    paramMap.get('calendar_id') ??
                    this.#todaysCalendarListStateQuery.todaysCalendarId;

                // モック 03: 無パラメータ時は今日の calendar_id へフォールバックし、
                // 初回からカードを表示する（train-diagram と同一の replaceUrl 方式）
                if (!paramMap.get('calendar_id') && calendarId) {
                    this.#handleNavigationResult(
                        this.#router.navigate(
                            ['/operation/table', { calendar_id: calendarId }],
                            { replaceUrl: true },
                        ),
                    );
                    return;
                }

                OperationTableStore.setCalendarId(calendarId ?? null);
                this.#operationSearchCardStateStore.setCalendarId(
                    calendarId ?? null,
                );

                this.fetchData();
            });

        this.#operationSearchCardService
            .receiveSearchOperationTableEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((calendarId) => {
                this.#handleNavigationResult(
                    this.#router.navigate([
                        '/operation/table',
                        { calendar_id: calendarId },
                    ]),
                );
            });

        this.#operationSearchCardService
            .receiveSearchOperationRouteDiagramEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((operationId) => {
                this.#handleNavigationResult(
                    this.#router.navigate([
                        '/operation/route-diagram',
                        { operation_id: operationId },
                    ]),
                );
            });
    }

    async fetchData(): Promise<void> {
        OperationTableStore.enableLoading();

        // 4 つは互いに依存しないので並行に取る。カードは全部そろってから 1 回だけ描く
        // （順に取ると、届くたびに 104 枚・2,500 行余りを描き直していた）
        const results = await Promise.allSettled([
            lastValueFrom(this.#operationTableService.fetchCalendar()),
            lastValueFrom(this.#operationTableService.fetchOperationTrips()),
            lastValueFrom(this.#operationTableService.fetchStations()),
            lastValueFrom(this.#operationTableService.fetchTripClasses()),
        ]);

        // 取得に失敗しても読み込み中を解く。ストアは通信断に備えて全体を保存しており、
        // 取れなかった分は前回保存したデータでカードを出す
        OperationTableStore.disableLoading();

        const failure = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );
        if (failure) {
            throw failure.reason;
        }
    }

    /**
     * 運用群はリアルタイム運用情報と同じく運用番号から導く（shared/operation-group.util）。
     * API `/v3/operations/groups` は 15 群のうち 5 群しか返さないので使わない。
     */
    isCardVisible(operationNumber: string): boolean {
        return matchesGroupFilter(operationNumber, this.selectedGroupNames());
    }

    /**
     * @defer の場所取りの高さ。カードと同じく、見出しと上下の余白（計 63px）+ 列車 1 本 32px
     * + 同じ向きへ続けて走る所のつなぎの行 8px（operation-table-card と同じ判定）。
     */
    placeholderHeight(operationTrip: OperationTripsDto): number {
        const trips = operationTrip.trips.map(({ trip }) => trip);
        const links = trips.filter((trip, index) => {
            const next = trips[index + 1];
            return (
                !!next &&
                !trip.depotIn &&
                !next.depotOut &&
                next.tripDirection === trip.tripDirection
            );
        }).length;
        return 63 + trips.length * 32 + links * 8;
    }

    /** カードヘッダの群バッジ。導けない運用番号なら undefined（バッジ非表示）。 */
    groupNameFor(operationNumber: string): string | undefined {
        return deriveGroupName(operationNumber) ?? undefined;
    }

    /** ダイヤ select 変更で calendar_id を差し替えて再取得する（モック 03） */
    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;

        this.#handleNavigationResult(
            this.#router.navigate([
                '/operation/table',
                { calendar_id: calendarId },
            ]),
        );
    }

    #handleNavigationResult(navigation: Promise<boolean>): void {
        navigation
            .then((succeeded) => {
                if (!succeeded) {
                    console.error('operation table navigation did not complete');
                    this.#notificationService.open(
                        'ページの遷移に失敗しました',
                        'OK',
                    );
                }
            })
            .catch((error) => {
                console.error('operation table navigation failed', error);
                this.#notificationService.open(
                    'ページの遷移に失敗しました',
                    'OK',
                );
            });
    }
}
