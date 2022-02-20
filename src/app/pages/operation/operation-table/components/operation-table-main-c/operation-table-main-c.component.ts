import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';

@Component({
    selector: 'app-operation-table-main-c',
    templateUrl: './operation-table-main-c.component.html',
    styleUrls: ['./operation-table-main-c.component.scss'],
    providers: [RxState],
})
export class OperationTableMainCComponent {
    constructor(
        private readonly state: RxState<{}>,
        private readonly operationTableStateQuery: OperationTableStateQuery,
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly operationSearchCardStateStore: OperationSearchCardStateStore
    ) {
        this.state.hold(
            this.operationTableStateQuery.calendarId$,
            (calendarId) => {
                this.operationSearchCardStateStore.setCalendarId(calendarId);
                this.operationSearchCardService.fetchOperations().subscribe();
            }
        );
    }
}
