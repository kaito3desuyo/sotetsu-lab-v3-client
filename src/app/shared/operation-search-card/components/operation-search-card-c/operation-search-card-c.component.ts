import { Component, OnInit } from '@angular/core';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSearchCardService } from '../../services/operation-search-card.service';

@Component({
    selector: 'app-operation-search-card-c',
    templateUrl: './operation-search-card-c.component.html',
    styleUrls: ['./operation-search-card-c.component.scss'],
})
export class OperationSearchCardCComponent {
    readonly calendars$ = this.calendarListStateQuery.calendars$;

    constructor(
        private readonly operationSearchCardService: OperationSearchCardService,
        private readonly calendarListStateQuery: CalendarListStateQuery
    ) {}

    onReceiveClickSearchOperationTable(
        calendarId: CalendarDetailsDto['calendarId']
    ): void {
        this.operationSearchCardService.emitSearchOperationTableEvent(
            calendarId
        );
    }
}
