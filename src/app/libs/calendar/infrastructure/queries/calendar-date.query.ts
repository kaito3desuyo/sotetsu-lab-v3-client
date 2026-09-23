import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateDtoBuilder } from '../builders/calendar-date.dto.builder';
import { CalendarDateModel } from '../models/calendar-date.model';

@Injectable({ providedIn: 'root' })
export class CalendarDateQuery {
    readonly #http = inject(HttpClient);
    readonly #v3ApiUrl = environment.apiUrl + '/v3/calendar-dates';
    #obs: Record<string, Observable<CalendarDateDetailsDto[]>> = {};

    /** 期間（from〜to、YYYY-MM-DD・両端含む）の運行日例外を取得する。 */
    findMany(params: {
        from: string;
        to: string;
        calendarId?: string;
        forceReload?: boolean;
    }): Observable<CalendarDateDetailsDto[]> {
        const { from, to, calendarId, forceReload } = params;
        const key = md5(
            JSON.stringify({ name: 'findMany', from, to, calendarId }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            const httpParams = new HttpParams({
                fromObject: { from, to, ...(calendarId ? { calendarId } : {}) },
            });
            this.#obs[key] = this.#http
                .get<CalendarDateModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) =>
                            CalendarDateDtoBuilder.buildFromModel(o),
                        ),
                    ),
                );
        }

        return this.#obs[key];
    }
}
