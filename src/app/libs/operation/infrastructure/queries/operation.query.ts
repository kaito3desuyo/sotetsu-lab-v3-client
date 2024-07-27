import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { buildTripOperationListDetailsDto } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list-dto.builder';
import { environment } from 'src/environments/environment';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationTripsDto } from '../../usecase/dtos/operation-trips.dto';
import { buildOperationDetailsDto } from '../builders/operation-dto.builder';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationTripsModel } from '../models/operation-trips.model';
import { OperationModel } from '../models/operation.model';

@Injectable({ providedIn: 'root' })
export class OperationQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/operations';

    constructor(private readonly http: HttpClient) {}

    findMany(
        qb: RequestQueryBuilder
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
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) => buildOperationDetailsDto(o));
                })
            );
    }

    findOne(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<OperationDetailsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationModel>(this.apiUrl + '/' + operationId, {
                params: httpParams,
            })
            .pipe(
                map((data) => {
                    return buildOperationDetailsDto(data);
                })
            );
    }

    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<OperationCurrentPositionDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationCurrentPositionModel>(
                this.apiUrl + '/' + operationId + '/current-position',
                {
                    params: httpParams,
                }
            )
            .pipe(
                map((data) => {
                    return {
                        operation: buildOperationDetailsDto(data.operation),
                        position: {
                            prev: buildTripOperationListDetailsDto(
                                data.position.prev
                            ),
                            current: buildTripOperationListDetailsDto(
                                data.position.current
                            ),
                            next: buildTripOperationListDetailsDto(
                                data.position.next
                            ),
                        },
                    };
                })
            );
    }

    findOneWithTrips(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<OperationTripsDto> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<OperationTripsModel>(
                this.apiUrl + '/' + operationId + '/trips',
                {
                    params: httpParams,
                }
            )
            .pipe(
                map((data) => {
                    return {
                        operation: buildOperationDetailsDto(data.operation),
                        trips: data.trips.map((o) =>
                            buildTripOperationListDetailsDto(o)
                        ),
                    };
                })
            );
    }
}
