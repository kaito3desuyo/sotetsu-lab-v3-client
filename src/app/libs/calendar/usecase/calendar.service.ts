import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CalendarQuery } from '../infrastructure/queries/calendar.query';
import { CalendarDetailsDto } from './dtos/calendar-details.dto';

@Injectable({ providedIn: 'root' })
export class CalendarService {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    findMany_V3(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto[]> {
        return this.calendarQuery.findMany_V3(params);
    }

    findOne(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        return this.calendarQuery.findOne(params);
    }

    findOneBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        return this.calendarQuery.findOneBySpecificDate(params);
    }
}
