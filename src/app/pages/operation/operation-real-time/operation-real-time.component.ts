import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { interval, lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { NewOperationPostCardComponent } from 'src/app/shared/new-operation-post-card/new-operation-post-card.component';
import { NewOperationPostCardService } from 'src/app/shared/new-operation-post-card/new-operation-post-card.service';
import { OperationRealTimeControllerComponent } from './components/operation-real-time-controller/operation-real-time-controller.component';
import { OperationRealTimeFilterComponent } from './components/operation-real-time-filter/operation-real-time-filter.component';
import { OperationRealTimeFormationTableComponent } from './components/operation-real-time-formation-table/operation-real-time-formation-table.component';
import { OperationRealTimeLegendComponent } from './components/operation-real-time-legend/operation-real-time-legend.component';
import { OperationRealTimeOperationTableComponent } from './components/operation-real-time-operation-table/operation-real-time-operation-table.component';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeStore } from './stores/operation-real-time.store';

const firstLoading = signal(true);
OperationRealTimeStore.resetLoading();

@Component({
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    styleUrls: ['./operation-real-time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        MatTabsModule,
        OperationRealTimeControllerComponent,
        OperationRealTimeFilterComponent,
        OperationRealTimeOperationTableComponent,
        OperationRealTimeFormationTableComponent,
        OperationRealTimeLegendComponent,
        NewOperationPostCardComponent,
    ],
})
export class OperationRealTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #socketService = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #newOperationPostCardService = inject(NewOperationPostCardService);

    readonly isLoading = toSignal(OperationRealTimeStore.isLoading$);

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
                await lastValueFrom(
                    this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate(),
                );
                OperationRealTimeStore.disableLoading();
            });
        // });

        // 自分が運用目撃情報を投稿したとき
        this.#newOperationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
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
                OperationRealTimeStore.disableLoading();
                OperationRealTimeStore.setFinalUpdateTime();
            });

        // 他人が運用目撃情報を投稿したとき
        this.#socketService
            .on()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                if (!OperationRealTimeStore.isEnableAutoReload) return;

                this.#notification.open('更新中...', 'OK');
                OperationRealTimeStore.enableLoading();
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
                OperationRealTimeStore.disableLoading();
                OperationRealTimeStore.setFinalUpdateTime();
                this.#notification.open('データが更新されました', 'OK');
            });
    }
}
