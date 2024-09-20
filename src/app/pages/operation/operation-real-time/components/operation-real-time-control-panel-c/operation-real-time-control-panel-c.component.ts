import { RxPush } from '@rx-angular/template/push';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../../states/operation-real-time.state';
import { OperationRealTimeControlPanelPComponent } from '../operation-real-time-control-panel-p/operation-real-time-control-panel-p.component';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-control-panel-c',
    templateUrl: './operation-real-time-control-panel-c.component.html',
    styleUrls: ['./operation-real-time-control-panel-c.component.scss'],
    imports: [CommonModule, RxPush, OperationRealTimeControlPanelPComponent],
    providers: [RxState],
})
export class OperationRealTimeControlPanelCComponent {
    private readonly state = inject(RxState);
    private readonly operationRealTimeStateStore = inject(
        OperationRealTimeStateStore,
    );
    private readonly operationRealTimeStateQuery = inject(
        OperationRealTimeStateQuery,
    );

    readonly isEnableAutoReload$ =
        this.operationRealTimeStateQuery.isEnableAutoReload$;
    readonly isVisibleSightingHistories$ =
        this.operationRealTimeStateQuery.isVisibleSightingHistories$;
    readonly isVisibleCurrentPosition$ =
        this.operationRealTimeStateQuery.isVisibleCurrentPosition$;

    readonly onToggledAutoReload$ = new Subject<boolean>();
    readonly onToggledVisibleSightingHistories$ = new Subject<boolean>();
    readonly onToggledVisibleCurrentPosition$ = new Subject<boolean>();

    constructor() {
        this.state.hold(this.onToggledAutoReload$.asObservable(), (bool) => {
            this.operationRealTimeStateStore.setIsEnableAutoReload(bool);
        });

        this.state.hold(
            this.onToggledVisibleSightingHistories$.asObservable(),
            (bool) => {
                this.operationRealTimeStateStore.setIsVisibleSightingHistories(
                    bool,
                );
            },
        );

        this.state.hold(
            this.onToggledVisibleCurrentPosition$.asObservable(),
            (bool) => {
                this.operationRealTimeStateStore.setIsVisibleCurrentPosition(
                    bool,
                );
            },
        );
    }
}
