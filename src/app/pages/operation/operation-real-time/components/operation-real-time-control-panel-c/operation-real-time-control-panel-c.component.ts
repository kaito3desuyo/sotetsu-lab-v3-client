import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../../states/operation-real-time.state';
import { OperationRealTimeControlPanelPComponent } from '../operation-real-time-control-panel-p/operation-real-time-control-panel-p.component';

@Component({
    selector: 'app-operation-real-time-control-panel-c',
    templateUrl: './operation-real-time-control-panel-c.component.html',
    styleUrls: ['./operation-real-time-control-panel-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, OperationRealTimeControlPanelPComponent],
    providers: [RxState]
})
export class OperationRealTimeControlPanelCComponent {
    readonly #state = inject(RxState);
    readonly #operationRealTimeStateStore = inject(OperationRealTimeStateStore);
    readonly #operationRealTimeStateQuery = inject(OperationRealTimeStateQuery);

    readonly isEnableAutoReload = toSignal(
        this.#operationRealTimeStateQuery.isEnableAutoReload$,
    );
    readonly isVisibleSightingHistories = toSignal(
        this.#operationRealTimeStateQuery.isVisibleSightingHistories$,
    );
    readonly isVisibleCurrentPosition = toSignal(
        this.#operationRealTimeStateQuery.isVisibleCurrentPosition$,
    );

    readonly onToggledAutoReload$ = new Subject<boolean>();
    readonly onToggledVisibleSightingHistories$ = new Subject<boolean>();
    readonly onToggledVisibleCurrentPosition$ = new Subject<boolean>();

    constructor() {
        this.#state.hold(this.onToggledAutoReload$.asObservable(), (bool) => {
            this.#operationRealTimeStateStore.setIsEnableAutoReload(bool);
        });

        this.#state.hold(
            this.onToggledVisibleSightingHistories$.asObservable(),
            (bool) => {
                this.#operationRealTimeStateStore.setIsVisibleSightingHistories(
                    bool,
                );
            },
        );

        this.#state.hold(
            this.onToggledVisibleCurrentPosition$.asObservable(),
            (bool) => {
                this.#operationRealTimeStateStore.setIsVisibleCurrentPosition(
                    bool,
                );
            },
        );
    }
}
