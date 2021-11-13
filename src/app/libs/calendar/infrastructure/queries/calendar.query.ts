import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { parse } from 'qs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { buildCalendarDetailsDto } from '../builders/calendar-dto.builder';
import { CalendarModel } from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class CalendarQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/calendars';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<CalendarDetailsDto> | CalendarDetailsDto[]> {
        return this.http
            .get<CalendarModel[]>(this.apiUrl, {
                params: parse(qb.query()) as any,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildCalendarDetailsDto(o)),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildCalendarDetailsDto(o));
                })
            );
    }
}
