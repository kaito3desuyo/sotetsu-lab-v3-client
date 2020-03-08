import { Component, OnInit } from '@angular/core';
import { OperationTableService } from '../../services/operation-table.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { Router } from '@angular/router';

@Component({
    selector: 'app-operation-table-search-form-container',
    templateUrl: './operation-table-search-form-container.component.html',
    styleUrls: ['./operation-table-search-form-container.component.scss']
})
export class OperationTableSearchFormContainerComponent implements OnInit {
    calendars$: Observable<ICalendar[]> = this.operationTableService.calendars$;

    constructor(
        private router: Router,
        private operationTableService: OperationTableService
    ) {
        this.calendars$ = this.operationTableService.calendars$;
    }

    ngOnInit(): void {}

    onReceiveClickSearch(calendarId: string): void {
        this.router.navigate(['/operation/table', { calendar_id: calendarId }]);
    }
}
