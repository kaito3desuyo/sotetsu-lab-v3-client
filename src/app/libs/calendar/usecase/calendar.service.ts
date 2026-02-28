import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { CalendarQuery } from '../infrastructure/queries/calendar.query';
import { CalendarDetailsDto } from './dtos/calendar-details.dto';

@Injectable({ providedIn: 'root' })
export class CalendarService {
    constructor(private readonly calendarQuery: CalendarQuery) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<CalendarDetailsDto> | CalendarDetailsDto[]> {
        return this.calendarQuery.findMany(qb);
    }

    findManyBySpecificDate(
        qb: RequestQueryBuilder,
        params: { date: string },
    ): Observable<Pagination<CalendarDetailsDto> | CalendarDetailsDto[]> {
        return this.calendarQuery.findManyBySpecificDate(qb, params);
    }

    findOneBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        return this.calendarQuery.findOneBySpecificDate(params);
    }
}
