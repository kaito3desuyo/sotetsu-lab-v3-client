import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { omitBy } from 'es-toolkit';
import { md5 } from 'js-md5';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { buildTripOperationListDetailsDto } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list-dto.builder';
import { environment } from 'src/environments/environment';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationTripsDto } from '../../usecase/dtos/operation-trips.dto';
import {
    buildOperationDetailsDto,
    OperationDtoBuilder,
    OperationsDtoBuilder,
} from '../builders/operation-dto.builder';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationTripsModel } from '../models/operation-trips.model';
import { OperationModel } from '../models/operation.model';

@Injectable({ providedIn: 'root' })
export class OperationQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/operations';
    readonly #v3ApiUrl = environment.apiUrl + '/v3/operations';
    #obs: Record<string, Observable<any>> = {};

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<Pagination<OperationDetailsDto> | OperationDetailsDto[]> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) => buildOperationDetailsDto(o)),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) => buildOperationDetailsDto(o));
                }),
            );
    }

    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { calendarId, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyByCalendarId',
                calendarId,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<
                    OperationModel[]
                >(`${this.#v3ApiUrl}/calendar/${calendarId}`, { observe: 'response' })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationsDtoBuilder.toDetailsDto(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        const { from, to, forceReload } = params;

        const key = md5(
            JSON.stringify({
                name: 'findManyBySpecificPeriod',
                from,
                to,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<
                    OperationModel[]
                >(`${this.#v3ApiUrl}/from/${from}/to/${to}`, { observe: 'response' })
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationsDtoBuilder.toDetailsDto(res.body);
                    }),
                );
        }

        return this.#obs[key];
    }

    findOne(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationDetailsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationModel>(this.apiUrl + '/' + operationId, {
                params: httpParams,
            })
            .pipe(
                map((data) => {
                    return buildOperationDetailsDto(data);
                }),
            );
    }

    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationCurrentPositionDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationCurrentPositionModel>(
                this.apiUrl + '/' + operationId + '/current-position',
                {
                    params: httpParams,
                },
            )
            .pipe(
                map((data) => {
                    return {
                        operation: buildOperationDetailsDto(data.operation),
                        position: {
                            prev: buildTripOperationListDetailsDto(
                                data.position.prev,
                            ),
                            current: buildTripOperationListDetailsDto(
                                data.position.current,
                            ),
                            next: buildTripOperationListDetailsDto(
                                data.position.next,
                            ),
                        },
                    };
                }),
            );
    }

    findOneWithCurrentPosition_V3(params: {
        operationId: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto> {
        const { operationId, searchTime, forceReload } = params;

        const httpParams = new HttpParams({
            fromObject: omitBy({ searchTime }, (v) => v === undefined),
        });

        const key = md5(
            JSON.stringify({
                name: 'findOneWithCurrentPosition',
                operationId,
                searchTime,
            }),
        );

        if (forceReload) {
            this.#obs[key] = undefined;
        }

        if (!this.#obs[key]) {
            this.#obs[key] = this.http
                .get<OperationCurrentPositionModel>(
                    `${this.#v3ApiUrl}/${operationId}/current-position`,
                    {
                        params: httpParams,
                        observe: 'response',
                    },
                )
                .pipe(
                    shareReplay({
                        bufferSize: 1,
                        refCount: true,
                    }),
                    map((res) => {
                        return OperationDtoBuilder.toCurrentPositionDto(
                            res.body,
                        );
                    }),
                );
        }

        return this.#obs[key];
    }

    findOneWithTrips(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationTripsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationTripsModel>(
                this.apiUrl + '/' + operationId + '/trips',
                {
                    params: httpParams,
                },
            )
            .pipe(
                map((data) => {
                    return {
                        operation: buildOperationDetailsDto(data.operation),
                        trips: data.trips.map((o) =>
                            buildTripOperationListDetailsDto(o),
                        ),
                    };
                }),
            );
    }
}
