import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPastTimeFilterComponent } from './components/operation-past-time-filter/operation-past-time-filter.component';
import { OperationPastTimeSearchFormComponent } from './components/operation-past-time-search-form/operation-past-time-search-form.component';
import { OperationPastTimeTableComponent } from './components/operation-past-time-table/operation-past-time-table.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';
import { formatPastTimeSummary } from './utils/operation-past-time-summary.util';

OperationPastTimeStore.resetLoading();

// 取得の世代番号。ストアと同じくモジュールに置き、ページのインスタンスをまたいで一意にする
// （離れてすぐ戻ったとき、前のインスタンスの取得の終わりが新しい骨組みを消さないように）
let fetchSeq = 0;

@Component({
    selector: 'app-operation-past-time',
    templateUrl: './operation-past-time.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        OperationPastTimeSearchFormComponent,
        OperationPastTimeFilterComponent,
        OperationPastTimeTableComponent,
    ],
})
export class OperationPastTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationPastTimeService = inject(OperationPastTimeService);

    readonly isLoading = toSignal(OperationPastTimeStore.isLoading$);

    readonly #referenceDate = toSignal(OperationPastTimeStore.referenceDate$, {
        initialValue: null,
    });
    readonly #days = toSignal(OperationPastTimeStore.days$, {
        initialValue: null,
    });
    readonly #agencies = toSignal(inject(AgencyListStateQuery).agencies$, {
        initialValue: [],
    });
    readonly #selectedAgencyIds = toSignal(
        OperationPastTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );

    readonly filterActive = computed(
        () => this.#selectedAgencyIds().length > 0,
    );
    readonly bandSummary = computed(() =>
        formatPastTimeSummary({
            referenceDate: this.#referenceDate(),
            days: this.#days(),
            agencies: this.#agencies(),
            selectedAgencyIds: this.#selectedAgencyIds(),
        }),
    );

    onClearFilter(): void {
        OperationPastTimeStore.setSelectedAgencyIds([]);
    }

    constructor() {
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        OperationPastTimeStore.setHasFetchedPastTime(false);

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
    }

    async fetchData(): Promise<void> {
        const seq = ++fetchSeq;
        OperationPastTimeStore.enableLoading();
        OperationPastTimeStore.setHasFetchedPastTime(false);

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
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === fetchSeq) {
                OperationPastTimeStore.setHasFetchedPastTime(true);
            }
        }
    }
}
