import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CalendarDateQuery } from '../infrastructure/queries/calendar-date.query';
import { CalendarDateDetailsDto } from './dtos/calendar-date-details.dto';

@Injectable({ providedIn: 'root' })
export class CalendarDateService {
    readonly #calendarDateQuery = inject(CalendarDateQuery);

    findMany(params: {
        from: string;
        to: string;
        calendarId?: string;
        forceReload?: boolean;
    }): Observable<CalendarDateDetailsDto[]> {
        return this.#calendarDateQuery.findMany(params);
    }
}
