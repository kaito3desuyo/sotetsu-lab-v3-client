import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from '../../usecase/dtos/operation-sighting-time-cross-section.dto';
import {
    OperationSightingDtoBuilder,
    buildOperationSightingDetailsDto,
} from '../builders/operation-sighting-dto.builder';
import { OperationSightingTimeCrossSectionModel } from '../models/operation-sighting-time-cross-section.model';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { omitBy } from 'es-toolkit';

@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/operation-sightings';
    private readonly v3ApiUrl = environment.apiUrl + '/v3/operation-sightings';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationSightingModel[]>(this.apiUrl, {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) =>
                                  buildOperationSightingDetailsDto(o),
                              ),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) =>
                              buildOperationSightingDetailsDto(o),
                          );
                }),
            );
    }

    findManyLatestGroupByOperation(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationSightingModel[]>(this.apiUrl + '/latest/operation', {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) =>
                                  buildOperationSightingDetailsDto(o),
                              ),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) =>
                              buildOperationSightingDetailsDto(o),
                          );
                }),
            );
    }

    findManyLatestGroupByFormation(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationSightingModel[]>(this.apiUrl + '/latest/formation', {
                params: httpParams,
                observe: 'response',
            })
            .pipe(
                map((res) => {
                    return Pagination.isApiPaginated(res)
                        ? Pagination.create(
                              res.body.map((o) =>
                                  buildOperationSightingDetailsDto(o),
                              ),
                              Pagination.getApiPageSettings(res),
                          )
                        : res.body.map((o) =>
                              buildOperationSightingDetailsDto(o),
                          );
                }),
            );
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        const { from, to, includeInvalidated } = params;

        return this.http
            .get<
                OperationSightingDetailsDto[]
            >(this.v3ApiUrl + `/from/${from}/to/${to}`, { params: omitBy({ includeInvalidated }, (v) => v === undefined), observe: 'response' })
            .pipe(map((res) => res.body));
    }

    findOneTimeCrossSectionFromOperationNumber(params: {
        operationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { operationNumber } = params;

        return this.http
            .get<OperationSightingTimeCrossSectionModel>(
                `${this.apiUrl}/time-cross-section/from-operation-number/${operationNumber}`,
                { observe: 'response' },
            )
            .pipe(
                map((res) => {
                    return OperationSightingDtoBuilder.toTimeCrossSectionDto(
                        res.body,
                    );
                }),
            );
    }

    findOneTimeCrossSectionFromFormationNumber(params: {
        formationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        const { formationNumber } = params;

        return this.http
            .get<OperationSightingTimeCrossSectionModel>(
                `${this.apiUrl}/time-cross-section/from-formation-number/${formationNumber}`,
                { observe: 'response' },
            )
            .pipe(
                map((res) => {
                    return OperationSightingDtoBuilder.toTimeCrossSectionDto(
                        res.body,
                    );
                }),
            );
    }
}
