import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { buildTripBlockDetailsDto } from '../builders/trip-block-dto.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable({ providedIn: 'root' })
export class TripBlockQuery {
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findManyByFilter_V3(params: {
        calendarId: string;
        tripDirection: number;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto[]> {
        const { calendarId, tripDirection, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByFilter',
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
                .get<TripBlockModel[]>(this.#v3ApiUrl, {
                    params: httpParams,
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) =>
                        res.body.map((o) => buildTripBlockDetailsDto(o)),
                    ),
                );
        }

        return this.#obs[key];
    }

    findOneById_V3(params: {
        id: string;
        forceReload?: boolean;
    }): Observable<TripBlockDetailsDto> {
        const { id, forceReload } = params;

        const key = md5(JSON.stringify({ name: 'findOneById', id }));

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<TripBlockModel>(`${this.#v3ApiUrl}/${id}`, {
                    observe: 'response',
                })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => buildTripBlockDetailsDto(res.body)),
                );
        }

        return this.#obs[key];
    }

}

