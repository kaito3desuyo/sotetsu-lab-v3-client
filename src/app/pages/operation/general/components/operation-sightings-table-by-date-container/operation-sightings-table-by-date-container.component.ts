import { Component, OnInit } from '@angular/core';
import { OperationPastTimeService } from '../../services/operation-past-time.service';
import { Observable, zip } from 'rxjs';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { IFormation } from 'src/app/general/interfaces/formation';
import { Moment } from 'moment';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-operation-sightings-table-by-date-container',
    templateUrl: './operation-sightings-table-by-date-container.component.html',
    styleUrls: ['./operation-sightings-table-by-date-container.component.scss']
})
export class OperationSightingsTableByDateContainerComponent {
    formations$: Observable<IFormation[]>;
    operationSightings$: Observable<IOperationSighting[]>;
    calendars$: Observable<{ date: Moment; calendar: ICalendar }[]>;

    constructor(private operationPastTimeService: OperationPastTimeService) {
        this.formations$ = this.operationPastTimeService.formations$;
        this.operationSightings$ = this.operationPastTimeService.operationSightings$;
        this.calendars$ = this.operationPastTimeService.calendars$;
    }
}
