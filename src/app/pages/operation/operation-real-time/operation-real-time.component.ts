import { BreakpointObserver } from '@angular/cdk/layout';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { interval, lastValueFrom, map } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { OperationRealTimeControllerComponent } from './components/operation-real-time-controller/operation-real-time-controller.component';
import { OperationRealTimeFilterComponent } from './components/operation-real-time-filter/operation-real-time-filter.component';
import { OperationRealTimeFormationTableComponent } from './components/operation-real-time-formation-table/operation-real-time-formation-table.component';
import { OperationRealTimeLegendComponent } from './components/operation-real-time-legend/operation-real-time-legend.component';
import { OperationRealTimeOperationTableComponent } from './components/operation-real-time-operation-table/operation-real-time-operation-table.component';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeStore } from './stores/operation-real-time.store';
import { filterRealTimeOperations } from './utils/operation-real-time-filter.util';
import { formatRealTimeSummary } from './utils/operation-real-time-summary.util';

/** Tailwind の md。これ以上は運用順・編成順を横並び、未満はタブ */
const DESKTOP_QUERY = '(min-width: 768px)';

const firstLoading = signal(true);
OperationRealTimeStore.resetLoading();

@Component({
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        ControlBandComponent,
        MatTabsModule,
        OperationRealTimeControllerComponent,
        OperationRealTimeFilterComponent,
        OperationRealTimeOperationTableComponent,
        OperationRealTimeFormationTableComponent,
        OperationRealTimeLegendComponent,
    ],
})
export class OperationRealTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #socketService = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #breakpointObserver = inject(BreakpointObserver);
    readonly #postDialog = inject(OperationPostDialogService);

    /** 最初の描画から正しい側を作るよう、初期値は同期で読む（違う配置が一瞬出ると CLS になる） */
    readonly isDesktop = toSignal(
        this.#breakpointObserver
            .observe(DESKTOP_QUERY)
            .pipe(map((state) => state.matches)),
        { initialValue: this.#breakpointObserver.isMatched(DESKTOP_QUERY) },
    );

    readonly isLoading = toSignal(OperationRealTimeStore.isLoading$);

    readonly #agencies = toSignal(inject(AgencyListStateQuery).agencies$, {
        initialValue: [],
    });
    readonly #operations = toSignal(OperationRealTimeStore.operations$, {
        initialValue: [],
    });
    readonly #formations = toSignal(OperationRealTimeStore.formations$, {
        initialValue: [],
    });
    readonly #timeCrossSections = toSignal(
        OperationRealTimeStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );
    readonly #selectedAgencyIds = toSignal(
        OperationRealTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly #selectedGroupNames = toSignal(
        OperationRealTimeStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly filterActive = computed(
        () =>
            this.#selectedAgencyIds().length > 0 ||
            this.#selectedGroupNames().length > 0,
    );
    readonly bandSummary = computed(() => {
        const operations = this.#operations() ?? [];
        const shown = filterRealTimeOperations(
            operations,
            this.#selectedAgencyIds(),
            this.#selectedGroupNames(),
            this.#timeCrossSections() ?? {},
            this.#formations() ?? [],
        ).length;
        return formatRealTimeSummary({
            agencies: this.#agencies(),
            selectedAgencyIds: this.#selectedAgencyIds(),
            selectedGroupNames: this.#selectedGroupNames(),
            shown,
            total: operations.length,
        });
    });

    onClearFilter(): void {
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    }

    openPost(): void {
        this.#postDialog.open();
    }

    constructor() {
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        OperationRealTimeStore.enableLoading();
        try {
            // 運用群は他フェッチに依存しないため最初に取得する。
            // 旧実装は目撃・在線の大量リクエストの後（チェーン末尾）だったため、
            // チェーン途中の 1 失敗や離脱で群チップが「休」のみに退化していた（98 §G2 A3）
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperationGroups(),
            );
            await lastValueFrom(this.#operationRealTimeService.fetchRoutes());
            await lastValueFrom(this.#operationRealTimeService.fetchStations());
            await lastValueFrom(
                this.#operationRealTimeService.fetchTripClasses(),
            );
            await lastValueFrom(this.#operationRealTimeService.fetchCalendar());
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperations(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchItineraryLinks(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchFormations(),
            );
            // 現在位置は operations にのみ依存するため、
            // 目撃断面の大量リクエストより先に取得する（98 §G2 A4: 現在位置行の復旧）
            await lastValueFrom(
                this.#operationRealTimeService.fetchCurrentPositions(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchSightingHistories(),
            );

            if (firstLoading()) {
                OperationRealTimeStore.setFinalUpdateTime();
                firstLoading.set(false);
            }
        } catch (error) {
            console.error(error);
            this.#notification.open('データの取得に失敗しました', 'OK');
        } finally {
            OperationRealTimeStore.disableLoading();
        }
    }

    hookEvent(): void {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象がある場合は更新する
        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        interval(1000 * 1)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                try {
                    await lastValueFrom(
                        this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate(),
                    );
                } catch {
                    // 毎秒通知しないよう黙って捨て、次の 1 秒で取り直す
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });
        // });

        // 自分が運用目撃情報を投稿したとき
        this.#operationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });

        // 他人が運用目撃情報を投稿したとき
        this.#socketService
            .on()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                if (!OperationRealTimeStore.isEnableAutoReload) return;

                this.#notification.open('更新中...', 'OK');
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                    this.#notification.open('データが更新されました', 'OK');
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });
    }

    /** 目撃の断面と履歴を、キャッシュを使わず取り直す */
    async #reloadSightings(): Promise<void> {
        await lastValueFrom(
            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchSightingHistories({
                forceReload: true,
            }),
        );
    }
}
