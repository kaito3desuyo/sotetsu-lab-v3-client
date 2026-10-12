import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { OperationSearchCardComponent } from 'src/app/shared/operation-search-card/operation-search-card.component';
import { OperationRouteDiagramDrawingContainerComponent } from './components/operation-route-diagram-drawing-container/operation-route-diagram-drawing-container.component';
import { OperationRouteDiagramRouteFilterComponent } from './components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';

OperationRouteDiagramStore.resetLoading();

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        OperationRouteDiagramRouteFilterComponent,
        OperationRouteDiagramDrawingContainerComponent,
        OperationSearchCardComponent,
    ],
})
export class OperationRouteDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );

    readonly isLoading = toSignal(OperationRouteDiagramStore.isLoading$);
    /** 検索カードに出すダイヤと運用。取得し直す間も前の値を出し続ける。 */
    readonly searchCalendarId = toSignal(
        OperationRouteDiagramStore.calendar$.pipe(
            filter((calendar) => !!calendar),
            map((calendar) => calendar.calendarId),
        ),
        { initialValue: null },
    );
    readonly searchOperationId = toSignal(
        OperationRouteDiagramStore.operation$.pipe(
            filter((operation) => !!operation),
            map((operation) => operation.operationId),
        ),
        { initialValue: null },
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const operationId = paramMap.get('operation_id');

                OperationRouteDiagramStore.setOperationId(operationId);
                this.fetchData();
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
