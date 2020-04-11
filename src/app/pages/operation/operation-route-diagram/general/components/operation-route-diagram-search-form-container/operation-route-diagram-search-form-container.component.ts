import { Component, OnInit } from '@angular/core';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';
import { Router } from '@angular/router';

@Component({
    selector: 'app-operation-route-diagram-search-form-container',
    templateUrl:
        './operation-route-diagram-search-form-container.component.html',
    styleUrls: [
        './operation-route-diagram-search-form-container.component.scss',
    ],
})
export class OperationRouteDiagramSearchFormContainerComponent
    implements OnInit {
    calendars$: Observable<ICalendar[]>;
    operations$: Observable<IOperation[]>;

    constructor(
        private router: Router,
        private operationRouteDiagramService: OperationRouteDiagramService
    ) {
        this.calendars$ = this.operationRouteDiagramService.calendars$;
        this.operations$ = this.operationRouteDiagramService.operations$;
    }

    ngOnInit(): void {}

    onReceiveChangeCalendarId(calendarId: string): void {
        this.operationRouteDiagramService.calendarId = calendarId;
        this.operationRouteDiagramService.fetchOperations().subscribe();
    }

    onReceiveClickSearch(operationId: string): void {
        this.router.navigate([
            '/operation/route-diagram',
            { operation_id: operationId },
        ]);
    }
}
