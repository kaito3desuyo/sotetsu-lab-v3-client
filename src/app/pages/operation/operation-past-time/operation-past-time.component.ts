import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
} from '@angular/core';
import { format, parse } from 'date-fns';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { formatPageTitle } from 'src/app/core/utils/format-page-title.util';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPastTimeFilterComponent } from './components/operation-past-time-filter/operation-past-time-filter.component';
import { OperationPastTimeSearchFormComponent } from './components/operation-past-time-search-form/operation-past-time-search-form.component';
import { OperationPastTimeTableComponent } from './components/operation-past-time-table/operation-past-time-table.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';
import { formatPastTimeSummary } from './utils/operation-past-time-summary.util';
import { pastTimeCacheHints } from './utils/past-time-cache-hints.util';

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
    readonly #ssrResponse = inject(SsrResponse);
    readonly #store = inject(OperationPastTimeStore);
    readonly #pageMeta = inject(PageMeta);

    readonly isLoading = this.#store.isLoading;

    readonly #referenceDate = this.#store.referenceDate;
    readonly #days = this.#store.days;
    readonly #agencies = inject(AgencyListState).agencies;
    readonly #selectedAgencyIds = this.#store.selectedAgencyIds;

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

    /** 題名。起点の日と日数は取ったデータから作る */
    readonly pageTitle = computed(() => {
        const referenceDate = this.#referenceDate();
        const days = this.#days();
        return formatPageTitle('過去の運用情報', [
            referenceDate && days
                ? `${format(parse(referenceDate, 'yyyy-MM-dd', new Date()), 'yyyy/M/d')} から ${days} 日間`
                : null,
        ]);
    });

    onClearFilter(): void {
        this.#store.setSelectedAgencyIds([]);
    }

    constructor() {
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        effect(() => this.#pageMeta.setTitle(this.pageTitle()));

        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の表が一瞬出ないようにする
        this.#store.setHasFetchedPastTime(false);

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const referenceDate =
                    paramMap.get('reference_date') ?? undefined;
                const days = paramMap.get('days') ?? undefined;
                const includeInvalidated =
                    paramMap.get('include_invalidated') ?? undefined;

                this.#store.setReferenceDate(referenceDate);
                this.#store.setDays(days && +days);
                this.#store.setIncludeInvalidated(
                    includeInvalidated === 'true',
                );

                // サーバーで描くときの置き方。ブラウザでは何もしない（spec 6.2）
                const hints = pastTimeCacheHints(
                    this.#store.dates(),
                    new Date(),
                );
                this.#ssrResponse.setCachePolicy(hints.policy);
                this.#ssrResponse.addCacheTags(hints.tags);

                this.fetchData();
            });
    }

    async fetchData(): Promise<void> {
        const seq = this.#store.nextFetchSeq();
        const conditions = {
            referenceDate: this.#store.referenceDate() ?? null,
            days: this.#store.days() ?? null,
            includeInvalidated: this.#store.includeInvalidated(),
        };
        this.#store.enableLoading();
        this.#store.setHasFetchedPastTime(false);

        try {
            // どれも日付の範囲だけで取れるので並行に取る（以前は 1 本ずつ待っていた）
            // 失敗を決める前に全部の終わりを待つ（遅れて届いた成功が、戻した中身を上書きしないように）
            const results = await Promise.allSettled([
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
            const failure = results.find(
                (result): result is PromiseRejectedResult =>
                    result.status === 'rejected',
            );
            if (failure) {
                // 通信できないときは、同じ条件で保存した中身を出す（古い取得の失敗では戻さない）。
                // 戻す処理が壊れていても、取得の失敗をそのまま投げる（読み込み中は finally で解く）
                if (this.#store.isLatestFetch(seq)) {
                    try {
                        await this.#store.restoreOfflineSnapshot(
                            'main',
                            conditions,
                        );
                    } catch {
                        // 保存した中身が壊れていても、取得の失敗を優先する
                    }
                }
                throw failure.reason;
            }
            // 取得がすべて成功した中身を、次に圏外のときのために保存する。
            // 起点の日・日数の無い URL は、取るものが無く空のままなので保存しない
            if (
                this.#store.isLatestFetch(seq) &&
                this.#store.dates().length > 0
            ) {
                void this.#store.saveOfflineSnapshot('main', conditions);
            }
        } finally {
            // 途中の reject でローディングバーが残り続けないようにする
            this.#store.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (this.#store.isLatestFetch(seq)) {
                this.#store.setHasFetchedPastTime(true);
            }
        }
    }
}
