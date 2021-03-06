import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { IOperation } from 'src/app/general/interfaces/operation';
import { OperationTableService } from '../../services/operation-table.service';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-operation-table-table-container',
    templateUrl: './operation-table-table-container.component.html',
    styleUrls: ['./operation-table-table-container.component.scss'],
})
export class OperationTableTableContainerComponent {
    operationTrips$: Observable<IOperation[]>;
    stations$: Observable<IStation[]>;
    tripClasses$: Observable<ITripClass[]>;
    calendar$: Observable<ICalendar>;

    constructor(private operationTableService: OperationTableService) {
        this.operationTrips$ = this.operationTableService.operationTrips$;
        this.stations$ = this.operationTableService.stations$;
        this.tripClasses$ = this.operationTableService.tripClasses$;
        this.calendar$ = this.operationTableService.calendar$;
    }
}
