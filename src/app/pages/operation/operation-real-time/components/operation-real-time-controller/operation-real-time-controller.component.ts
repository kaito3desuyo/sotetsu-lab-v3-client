import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { lastValueFrom } from 'rxjs';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

@Component({
    selector: 'app-operation-real-time-controller',
    templateUrl: './operation-real-time-controller.component.html',
    styleUrl: './operation-real-time-controller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatSlideToggleModule, MatButtonModule, MatIconModule],
})
export class OperationRealTimeControllerComponent {
    readonly #operationRealTimeService = inject(OperationRealTimeService);

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
    }
}
