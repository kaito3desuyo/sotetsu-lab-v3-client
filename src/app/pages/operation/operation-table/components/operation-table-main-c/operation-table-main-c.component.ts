import { Component } from '@angular/core';
import { OperationTableStateQuery } from '../../states/operation-table.state';

@Component({
    selector: 'app-operation-table-main-c',
    templateUrl: './operation-table-main-c.component.html',
    styleUrls: ['./operation-table-main-c.component.scss'],
})
export class OperationTableMainCComponent {
    readonly calendarId$ = this.operationTableStateQuery.calendarId$;

    constructor(
        private readonly operationTableStateQuery: OperationTableStateQuery
    ) {}
}
