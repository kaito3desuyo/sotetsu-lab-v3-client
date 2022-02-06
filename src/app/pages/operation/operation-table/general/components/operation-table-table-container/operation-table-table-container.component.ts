import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { OperationTableStateQuery } from '../../../states/operation-table.state';
import { OperationTableService } from '../../services/operation-table.service';

@Component({
    selector: 'app-operation-table-table-container',
    templateUrl: './operation-table-table-container.component.html',
    styleUrls: ['./operation-table-table-container.component.scss'],
})
export class OperationTableTableContainerComponent {
    tripClasses$: Observable<ITripClass[]>;

    // v2
    readonly allOperationTrips$ =
        this.operationTableStateQuery.allOperationTrips$;
    readonly stations$ = this.operationTableStateQuery.stations$;
    readonly calendar$ = this.operationTableStateQuery.calendarId$.pipe(
        switchMap((calendarId) =>
            this.calendarListStateQuery.findByCalendarId(calendarId)
        )
    );

    constructor(
        private operationTableService: OperationTableService,
        private readonly calendarListStateQuery: CalendarListStateQuery,
        private readonly operationTableStateQuery: OperationTableStateQuery
    ) {
        this.tripClasses$ = this.operationTableService.tripClasses$;
    }
}
