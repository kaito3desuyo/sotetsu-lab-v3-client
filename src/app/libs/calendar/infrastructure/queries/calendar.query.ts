import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
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
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(params?: {
        serviceName?: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto[]> {
        const { serviceName, forceReload } = params ?? {};
        const key = md5(JSON.stringify({ name: 'findMany', serviceName }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            const httpParams = new HttpParams(
                serviceName ? { fromObject: { serviceName } } : {},
            );
            this.#obs[key] = this.http
                .get<CalendarModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => buildCalendarDetailsDto(o)),
                    ),
                );
        }

        return this.#obs[key];
    }

    findOne(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<CalendarDetailsDto> {
        const { calendarId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findOne',
                calendarId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<CalendarModel>(`${this.#v3ApiUrl}/${calendarId}`, {
                    observe: 'response',
                })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return CalendarDtoBuilder.buildFromModel(res.body);
                    }),
                );
        }

        return this.#obs[key];
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
                        return CalendarDtoBuilder.buildFromModel(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }
}
