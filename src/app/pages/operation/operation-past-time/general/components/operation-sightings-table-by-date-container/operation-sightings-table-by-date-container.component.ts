import { Component } from '@angular/core';
import { OperationPastTimeStateQuery } from '../../../states/operation-past-time.state';

@Component({
    selector: 'app-operation-sightings-table-by-date-container',
    templateUrl: './operation-sightings-table-by-date-container.component.html',
    styleUrls: ['./operation-sightings-table-by-date-container.component.scss'],
})
export class OperationSightingsTableByDateContainerComponent {
    readonly calendars$ =
        this.operationPastTimeStateQuery.selectCalendarsFilteredByDates();
    readonly formations$ = this.operationPastTimeStateQuery.formations$;
    readonly operationSightings$ =
        this.operationPastTimeStateQuery.selectOperationSightingsGroupedByDate();

    constructor(
        private readonly operationPastTimeStateQuery: OperationPastTimeStateQuery
    ) {}
}
