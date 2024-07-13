import { Component } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationTableStateQuery } from '../../states/operation-table.state';

@Component({
    selector: 'app-operation-table-table-container',
    templateUrl: './operation-table-table-container.component.html',
    styleUrls: ['./operation-table-table-container.component.scss'],
})
export class OperationTableTableContainerComponent {
    readonly calendar$ = this.operationTableStateQuery.calendarId$.pipe(
        switchMap((calendarId) =>
            this.calendarListStateQuery.selectByCalendarId(calendarId)
        )
    );
    // readonly operationNumbers$ =
    //     this.operationTableStateQuery.operationNumbers$;
    readonly operationTrips$ = this.operationTableStateQuery.operationTrips$;
    readonly stations$ = this.operationTableStateQuery.stations$;
    readonly tripClasses$ = this.operationTableStateQuery.tripClasses$;

    constructor(
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly operationTableStateQuery: OperationTableStateQuery
    ) {}
}
