import { Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';

@Component({
    selector: 'app-operation-route-diagram-main-c',
    templateUrl: './operation-route-diagram-main-c.component.html',
    styleUrls: ['./operation-route-diagram-main-c.component.scss'],
    providers: [RxState],
})
export class OperationRouteDiagramMainCComponent {
    constructor(
        private readonly state: RxState<{}>,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery,
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly operationSearchCardStateStore: OperationSearchCardStateStore
    ) {
        this.state.hold(
            this.operationRouteDiagramStateQuery.calendar$,
            (calendar) => {
                this.operationSearchCardStateStore.setCalendarId(
                    calendar.calendarId
                );
                this.operationSearchCardService.fetchOperations().subscribe();
            }
        );

        this.state.hold(
            this.operationRouteDiagramStateQuery.operation$,
            (operation) => {
                this.operationSearchCardStateStore.setOperationId(
                    operation.operationId
                );
            }
        );
    }
}
