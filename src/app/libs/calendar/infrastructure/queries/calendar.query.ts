import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import {
    buildCalendarDetailsDto,
    CalendarDtoBuilder,
} from '../builders/calendar-dto.builder';
import { CalendarModel } from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class CalendarQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/calendars';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/calendars';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<CalendarDetailsDto> | CalendarDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<CalendarModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildCalendarDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildCalendarDetailsDto(o));
                }),
            );
    }

    findManyBySpecificDate(
        qb: RequestQueryBuilder,
        params: { date: string },
    ): Observable<Pagination<CalendarDetailsDto> | CalendarDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<CalendarModel[]>(this.apiUrl + '/as/of/' + params.date, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildCalendarDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildCalendarDetailsDto(o));
                }),
            );
    }

    findOneBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        const { date, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOneBySpecificDate',
                date,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<CalendarModel>(`${this.#v3ApiUrl}/as/of/${params.date}`, {
                    observe: 'response',
                })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return CalendarDtoBuilder.toDetailsDto(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }
}
