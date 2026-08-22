import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { lastValueFrom } from 'rxjs';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
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

    /** 再読み込みボタンの真横に出す最終更新時刻（ユーザー指示 2026-08-22）。 */
    readonly finalUpdateTime = toSignal(
        OperationRealTimeStore.finalUpdateTime$,
    );

    readonly isEnableAutoReload = toSignal(
        OperationRealTimeStore.isEnableAutoReload$,
    );
    readonly isVisibleSightingHistories = toSignal(
        OperationRealTimeStore.isVisibleSightingHistories$,
    );
    readonly isVisibleCurrentPosition = toSignal(
        OperationRealTimeStore.isVisibleCurrentPosition$,
    );

    toggleAutoReload(isEnable: boolean): void {
        OperationRealTimeStore.setIsEnableAutoReload(isEnable);
    }

    toggleVisibleSightingHistories(isVisible: boolean): void {
        OperationRealTimeStore.setIsVisibleSightingHistories(isVisible);
    }

    toggleVisibleCurrentPosition(isVisible: boolean): void {
        OperationRealTimeStore.setIsVisibleCurrentPosition(isVisible);
    }

    async reload(): Promise<void> {
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
    }
}
