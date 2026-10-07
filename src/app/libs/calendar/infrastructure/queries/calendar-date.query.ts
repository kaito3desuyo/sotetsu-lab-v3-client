import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateDtoBuilder } from '../builders/calendar-date.dto.builder';
import { CalendarDateModel } from '../models/calendar-date.model';

@Injectable({ providedIn: 'root' })
export class CalendarDateQuery {
    readonly #http = inject(HttpClient);
    readonly #v3ApiUrl = environment.apiUrl + '/v3/calendar-dates';
    readonly #cache = new QueryCache();

    /** 期間（from〜to、YYYY-MM-DD・両端含む）の運行日例外を取得する。 */
    findMany(params: {
        from: string;
        to: string;
        calendarId?: string;
        forceReload?: boolean;
    }): Observable<CalendarDateDetailsDto[]> {
        const { from, to, calendarId, forceReload } = params;

        return this.#cache
            .get({
                name: 'findMany',
                params: { from, to, calendarId },
                fetch: () => {
                    const httpParams = new HttpParams({
                        fromObject: {
                            from,
                            to,
                            ...(calendarId ? { calendarId } : {}),
                        },
                    });
                    return this.#http.get<CalendarDateModel[]>(this.#v3ApiUrl, {
                        params: httpParams,
                        observe: 'response',
                    });
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) =>
                        CalendarDateDtoBuilder.buildFromModel(o),
                    ),
                ),
            );
    }
}
