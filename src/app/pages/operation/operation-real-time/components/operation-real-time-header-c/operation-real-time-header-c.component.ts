import { Component, OnInit } from '@angular/core';
import { OperationRealTimeStateQuery } from '../../states/operation-real-time.state';

@Component({
    selector: 'app-operation-real-time-header-c',
    templateUrl: './operation-real-time-header-c.component.html',
    styleUrls: ['./operation-real-time-header-c.component.scss'],
})
export class OperationRealTimeHeaderCComponent {
    readonly finalUpdateTime$ =
        this.operationRealTimeStateQuery.finalUpdateTime$;

    constructor(
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery
    ) {}
}
