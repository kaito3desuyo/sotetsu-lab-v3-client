import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { buildTripDetailsDto } from '../builders/trip-dto.builder';
import { TripModel } from '../models/trip.model';

@Injectable({ providedIn: 'root' })
export class TripQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trips';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findManyByStationId(params: {
        stationId: string;
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripDetailsDto[]> {
        const { stationId, calendarId, tripDirection, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByStationId',
                stationId,
                calendarId,
                tripDirection,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            const httpParams = new HttpParams({
                fromObject: {
                    calendarId,
                    tripDirection: String(tripDirection),
                },
            });
            this.#obs[key] = this.http
                .get<TripModel[]>(
                    `${this.#v3ApiUrl}/station/${stationId}`,
                    { params: httpParams, observe: 'response' },
                )
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => res.body.map((o) => buildTripDetailsDto(o))),
                );
        }

        return this.#obs[key];
    }

}

