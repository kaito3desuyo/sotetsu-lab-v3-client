import { Component, OnInit } from '@angular/core';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { Observable } from 'rxjs';
import { Moment } from 'moment';

@Component({
    selector: 'app-operation-sightings-control-panel-container',
    templateUrl: './operation-sightings-control-panel-container.component.html',
    styleUrls: ['./operation-sightings-control-panel-container.component.scss']
})
export class OperationSightingsControlPanelContainerComponent {
    finalUpdateTime$: Observable<Moment>;
    isAutoReloadEnabled$: Observable<boolean>;
    isVisibleCurrentPosition$: Observable<boolean>;

    constructor(private operationRealTimeService: OperationRealTimeService) {
        this.finalUpdateTime$ = this.operationRealTimeService.finalUpdateTime$;
        this.isAutoReloadEnabled$ = this.operationRealTimeService.isAutoReloadEnabled$;
        this.isVisibleCurrentPosition$ = this.operationRealTimeService.isVisibleCurrentPosition$;
    }

    onReceiveChangeAutoReloadToggle(bool: boolean): void {
        this.operationRealTimeService.isAutoReloadEnabled = bool;
    }

    onReceiveChangeVisibleCurrentPositionToggle(bool: boolean): void {
        this.operationRealTimeService.isVisibleCurrentPosition = bool;
    }
}
