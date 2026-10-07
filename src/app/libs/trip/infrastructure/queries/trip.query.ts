import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QueryCache } from 'src/app/core/query-cache/query-cache';
import { environment } from 'src/environments/environment';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripDtoBuilder } from '../builders/trip.dto.builder';
import { TripModel } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trips';
    readonly #cache = new QueryCache();

    private readonly http = inject(HttpClient);

    findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripDetailsDto[]> {
        const { stationId, calendarId, tripDirection, forceReload } = params;

        return this.#cache
            .get({
                name: 'findManyByStationId',
                params: { stationId, calendarId, tripDirection },
                fetch: () => {
                    const httpParams = new HttpParams({
                        fromObject: {
                            calendarId,
                            tripDirection: String(tripDirection),
                        },
                    });
                    return this.http.get<TripModel[]>(
                        `${this.#v3ApiUrl}/station/${stationId}`,
                        { params: httpParams, observe: 'response' },
                    );
                },
                forceReload,
            })
            .pipe(
                map((res) =>
                    res.body.map((o) => TripDtoBuilder.buildFromModel(o)),
                ),
            );
    }
}
