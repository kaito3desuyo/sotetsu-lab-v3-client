import {
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { first, interval, lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { OperationPostCardModule } from 'src/app/shared/operation-post-card/operation-post-card.module';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/services/operation-post-card.service';
import { OperationRealTimeControllerComponent } from './components/operation-real-time-controller/operation-real-time-controller.component';
import { OperationRealTimeFormationTableComponent } from './components/operation-real-time-formation-table/operation-real-time-formation-table.component';
import { OperationRealTimeHeaderComponent } from './components/operation-real-time-header/operation-real-time-header.component';
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
        OperationRealTimeHeaderComponent,
        OperationRealTimeControllerComponent,
        OperationRealTimeOperationTableComponent,
        OperationRealTimeFormationTableComponent,
        OperationRealTimeLegendComponent,

        OperationPostCardModule,
    ],
})
export class OperationRealTimeComponent {
    readonly #appRef = inject(ApplicationRef);
    readonly #destroyRef = inject(DestroyRef);
    readonly #socketService = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #operationPostCardService = inject(OperationPostCardService);

    readonly isLoading = toSignal(OperationRealTimeStore.isLoading$);

    constructor() {
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        OperationRealTimeStore.enableLoading();
        await lastValueFrom(this.#operationRealTimeService.fetchRoutes_V3());
        await lastValueFrom(this.#operationRealTimeService.fetchStations_V3());
        await lastValueFrom(
            this.#operationRealTimeService.fetchTripClasses_V3(),
        );
        await lastValueFrom(this.#operationRealTimeService.fetchCalendar_V3());
        await lastValueFrom(
            this.#operationRealTimeService.fetchOperations_V3(),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchFormations_V3(),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections_V3(),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections_V3(),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchSightingHistories_V3(),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchCurrentPositions_V3(),
        );
        OperationRealTimeStore.disableLoading();

        if (firstLoading()) {
            OperationRealTimeStore.setFinalUpdateTime();
            firstLoading.set(false);
        }
    }

    hookEvent(): void {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象がある場合は更新する
        this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
            interval(1000 * 1)
                .pipe(takeUntilDestroyed(this.#destroyRef))
                .subscribe(async () => {
                    OperationRealTimeStore.enableLoading();
                    await lastValueFrom(
                        this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate_V3(),
                    );
                    OperationRealTimeStore.disableLoading();
                });
        });

        // 自分が運用目撃情報を投稿したとき
        this.#operationPostCardService
            .receiveSubmitOperationSightingEvent()
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                await lastValueFrom(
                    this.#operationRealTimeService.fetchOperationSightingTimeCrossSections_V3(
                        {
                            forceReload: true,
                        },
                    ),
                );
                await lastValueFrom(
                    this.#operationRealTimeService.fetchFormationSightingTimeCrossSections_V3(
                        {
                            forceReload: true,
                        },
                    ),
                );
                await lastValueFrom(
                    this.#operationRealTimeService.fetchSightingHistories_V3({
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
                    this.#operationRealTimeService.fetchOperationSightingTimeCrossSections_V3(
                        {
                            forceReload: true,
                        },
                    ),
                );
                await lastValueFrom(
                    this.#operationRealTimeService.fetchFormationSightingTimeCrossSections_V3(
                        {
                            forceReload: true,
                        },
                    ),
                );
                await lastValueFrom(
                    this.#operationRealTimeService.fetchSightingHistories_V3({
                        forceReload: true,
                    }),
                );
                OperationRealTimeStore.disableLoading();
                OperationRealTimeStore.setFinalUpdateTime();
                this.#notification.open('データが更新されました', 'OK');
            });
    }
}
