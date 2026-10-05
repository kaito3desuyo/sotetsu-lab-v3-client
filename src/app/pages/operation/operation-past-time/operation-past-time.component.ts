import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeFilterComponent } from './components/operation-past-time-filter/operation-past-time-filter.component';
import { OperationPastTimeSearchFormComponent } from './components/operation-past-time-search-form/operation-past-time-search-form.component';
import { OperationPastTimeTableComponent } from './components/operation-past-time-table/operation-past-time-table.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';

OperationPastTimeStore.resetLoading();

@Component({
    selector: 'app-operation-past-time',
    templateUrl: './operation-past-time.component.html',
    styleUrls: ['./operation-past-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        OperationPastTimeSearchFormComponent,
        OperationPastTimeFilterComponent,
        OperationPastTimeTableComponent,
        OperationSearchCardCComponent,
    ],
})
export class OperationPastTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationPastTimeService = inject(OperationPastTimeService);
    readonly #operationSearchCardService = inject(OperationSearchCardService);

    readonly isLoading = toSignal(OperationPastTimeStore.isLoading$);

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const referenceDate =
                    paramMap.get('reference_date') ?? undefined;
                const days = paramMap.get('days') ?? undefined;
                const includeInvalidated =
                    paramMap.get('include_invalidated') ?? undefined;

                OperationPastTimeStore.setReferenceDate(referenceDate);
                OperationPastTimeStore.setDays(days && +days);
                OperationPastTimeStore.setIncludeInvalidated(
                    includeInvalidated === 'true',
                );

                this.fetchData();
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
    }

    async fetchData(): Promise<void> {
        OperationPastTimeStore.enableLoading();

        try {
            // どれも日付の範囲だけで取れるので並行に取る（以前は 1 本ずつ待っていた）
            await Promise.all([
                lastValueFrom(
                    this.#operationPastTimeService.fetchCalendarByDate(),
                ),
                lastValueFrom(this.#operationPastTimeService.fetchFormations()),
                lastValueFrom(
                    this.#operationPastTimeService.fetchOperationsV3(),
                ),
                lastValueFrom(
                    this.#operationPastTimeService.fetchOperationSightingsV3(),
                ),
            ]);
        } finally {
            // 途中の reject でローディングバーが残り続けないようにする
            OperationPastTimeStore.disableLoading();
        }
    }
}
