import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AdsenseModule } from 'ng2-adsense';
import { filter } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationRouteDiagramDrawingContainerComponent } from './components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramRouteFilterComponent } from './components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';

OperationRouteDiagramStore.resetLoading();

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    styleUrls: ['./operation-route-diagram.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        AdsenseModule,
        OperationRouteDiagramRouteFilterComponent,
        OperationRouteDiagramDrawingContainerComponent,
        OperationSearchCardCComponent,
    ],
})
export class OperationRouteDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationSearchCardService = inject(OperationSearchCardService);
    readonly #operationSearchCardStateStore = inject(
        OperationSearchCardStateStore,
    );
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );

    readonly isLoading = toSignal(OperationRouteDiagramStore.isLoading$);

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const operationId = paramMap.get('operation_id');

                OperationRouteDiagramStore.setOperationId(operationId);
                this.fetchData();
            });

        OperationRouteDiagramStore.calendar$
            .pipe(
                filter((calendar) => !!calendar),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe((calendar) => {
                this.#operationSearchCardStateStore.setCalendarId(
                    calendar.calendarId,
                );
            });

        OperationRouteDiagramStore.operation$
            .pipe(
                filter((operation) => !!operation),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe((operation) => {
                this.#operationSearchCardStateStore.setOperationId(
                    operation.operationId,
                );
            });

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

        this.#operationRouteDiagramService
            .receiveNavigateTimetableEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((ev) => {
                this.#router.navigate([
                    '/timetable',
                    'all-line',
                    {
                        calendar_id: OperationRouteDiagramStore.calendarId,
                        trip_block_id: ev.tripBlockId,
                        trip_direction: ev.tripDirection,
                    },
                ]);
            });
    }

    /** G12: 空状態（運用番号未設定）の次アクション。運用表へ誘導する。 */
    onEmptyStateActionClick(): void {
        this.#router.navigate(['/operation/table']);
    }

    async fetchData(): Promise<void> {
        if (!OperationRouteDiagramStore.operationId) return;

        OperationRouteDiagramStore.enableLoading();

        // 列車と駅は互いに依存しないので並行に取る
        const results = await Promise.allSettled([
            lastValueFrom(
                this.#operationRouteDiagramService.fetchOperationTrips(),
            ),
            lastValueFrom(this.#operationRouteDiagramService.fetchStations()),
        ]);

        // 取得に失敗しても読み込み中を解く（進捗バーが出たまま止まらないように）
        OperationRouteDiagramStore.initializeSelectedRouteIds();
        OperationRouteDiagramStore.disableLoading();

        const failure = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );
        if (failure) {
            throw failure.reason;
        }
    }
}
