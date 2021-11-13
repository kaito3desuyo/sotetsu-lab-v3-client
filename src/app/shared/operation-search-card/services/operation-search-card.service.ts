import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Injectable()
export class OperationSearchCardService {
    private readonly _searchOpeartionTableEvent$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();

    constructor() {}

    emitSearchOperationTableEvent(
        calendarId: CalendarDetailsDto['calendarId']
    ): void {
        this._searchOpeartionTableEvent$.next(calendarId);
    }

    receiveSearchOperationTableEvent(): Observable<
        CalendarDetailsDto['calendarId']
    > {
        return this._searchOpeartionTableEvent$.asObservable();
    }
}
