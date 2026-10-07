import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import {
    buildCalendarDetailsDto,
    CalendarDtoBuilder,
} from '../builders/calendar.dto.builder';
import { CalendarModel } from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class CalendarQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/calendars';
    readonly #cache = new QueryCache();

    constructor(private readonly http: HttpClient) {}

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};

        return this.#cache
            .get({
                name: 'findMany',
                params: { serviceName },
                fetch: () => {
                    const httpParams = new HttpParams(
                        serviceName ? { fromObject: { serviceName } } : {},
                    );
                    return this.http.get<CalendarModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) => res.body.map((o) => buildCalendarDetailsDto(o))),
            );
    }

    findOne(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        const { calendarId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOne',
                params: { calendarId },
                fetch: () =>
                    this.http.get<CalendarModel>(
                        `${this.#v3ApiUrl}/${calendarId}`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(map((res) => CalendarDtoBuilder.buildFromModel(res.body)));
    }

    findOneBySpecificDate(params: {
        date: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        const { date, forceReload } = params;

        return this.#cache
            .get({
                name: 'findOneBySpecificDate',
                params: { date },
                fetch: () =>
                    this.http.get<CalendarModel>(
                        `${this.#v3ApiUrl}/as/of/${date}`,
                        { observe: 'response' },
                    ),
                forceReload,
            })
            .pipe(map((res) => CalendarDtoBuilder.buildFromModel(res.body)));
    }
}
