import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableCardComponent } from './components/operation-table-card/operation-table-card.component';
import { OperationTableFilterComponent } from './components/operation-table-filter/operation-table-filter.component';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';
import {
    matchesGroupFilter,
    withRetiredGroup,
} from './utils/operation-table-filter.util';

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
    readonly operationGroups = toSignal(OperationTableStore.operationGroups$, {
        initialValue: [],
    });
    readonly selectedGroupNames = toSignal(
        OperationTableStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly isEmpty = computed(
        () => !!this.calendar() && this.operationTrips().length === 0,
    );

    // モック 03: カードヘッダの運用番号バッジ用に、運用番号 → 群名（実データそのまま）を解決する。
    // 休車（運用番号 100）は operationGroups API に含まれないため withRetiredGroup で補う
    // （filter chip と同じ扱い。operation-table-filter.component.ts と同一パターン）。
    readonly #groupNameByOperationNumber = computed(() => {
        const map = new Map<string, string>();
        for (const group of withRetiredGroup(this.operationGroups())) {
            for (const operationNumber of group.operationNumbers) {
                if (!map.has(operationNumber)) {
                    map.set(operationNumber, group.groupName);
                }
            }
        }
        return map;
    });

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

        await lastValueFrom(this.#operationTableService.fetchCalendar());
        await lastValueFrom(this.#operationTableService.fetchOperationTrips());
        await lastValueFrom(this.#operationTableService.fetchStations());
        await lastValueFrom(this.#operationTableService.fetchTripClasses());
        await lastValueFrom(
            this.#operationTableService.fetchOperationGroups(),
        );

        OperationTableStore.disableLoading();
    }

    isCardVisible(operationNumber: string): boolean {
        return matchesGroupFilter(
            operationNumber,
            this.selectedGroupNames(),
            this.operationGroups(),
        );
    }

    /** 運用番号が属する群名（実データそのまま）。未解決なら undefined（バッジ非表示）。 */
    groupNameFor(operationNumber: string): string | undefined {
        return this.#groupNameByOperationNumber().get(operationNumber);
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

    onJump(operationNumber: string): void {
        const target = document.getElementById(
            `operation-card-${operationNumber}`,
        );
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
