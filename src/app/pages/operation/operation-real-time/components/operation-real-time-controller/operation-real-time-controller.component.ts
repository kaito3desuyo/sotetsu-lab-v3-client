import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { lastValueFrom } from 'rxjs';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

@Component({
    selector: 'app-operation-real-time-controller',
    templateUrl: './operation-real-time-controller.component.html',
    styleUrl: './operation-real-time-controller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatSlideToggleModule,
        MatButtonModule,
        MatIconModule,
        DateFnsPipe,
    ],
})
export class OperationRealTimeControllerComponent {
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #notification = inject(NotificationService);
    readonly #store = inject(OperationRealTimeStore);

    /** 再読み込みボタンの真横に出す最終更新時刻（ユーザー指示 2026-08-22）。 */
    readonly finalUpdateTime = this.#store.finalUpdateTime;

    readonly isEnableAutoReload = this.#store.isEnableAutoReload;
    readonly isVisibleSightingHistories =
        this.#store.isVisibleSightingHistories;
    readonly isVisibleCurrentPosition = this.#store.isVisibleCurrentPosition;

    toggleAutoReload(isEnable: boolean): void {
        this.#store.setIsEnableAutoReload(isEnable);
    }

    toggleVisibleSightingHistories(isVisible: boolean): void {
        this.#store.setIsVisibleSightingHistories(isVisible);
    }

    toggleVisibleCurrentPosition(isVisible: boolean): void {
        this.#store.setIsVisibleCurrentPosition(isVisible);
    }

    async reload(): Promise<void> {
        this.#store.enableLoading();
        try {
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
            this.#store.setFinalUpdateTime();
        } catch (error) {
            console.error(error);
            this.#notification.open('データの取得に失敗しました', 'OK');
        } finally {
            this.#store.disableLoading();
        }
    }
}
