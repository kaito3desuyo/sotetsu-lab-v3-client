import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import {
    buildTripClassDetailsDto,
    TripClassesDtoBuilder,
} from '../builders/trip-class-dto.builder';
import { TripClassModel } from '../models/trip-class.model';

@Injectable({ providedIn: 'root' })
export class TripClassQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/trip-classes';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/trip-classes';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<TripClassDetailsDto> | TripClassDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<TripClassModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildTripClassDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildTripClassDetailsDto(o));
                }),
            );
    }

    // v3

    findMany_V3(params: {
        forceReload?: boolean;
    }): Observable<TripClassDetailsDto[]> {
        const { forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findMany',
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<TripClassModel[]>(this.#v3ApiUrl, { observe: 'response' })
                .pipe(
                    shareReplay({ bufferSize: 1, refCount: true }),
                    map((res) => TripClassesDtoBuilder.toDetailsDtos(res.body)),
                );
        }

        return this.#obs[key];
    }
}
