import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { buildTripOperationListDetailsDto } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list-dto.builder';
import { TripOperationListModel } from 'src/app/libs/trip/infrastructure/models/trip-operation-list.model';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { environment } from 'src/environments/environment';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { buildOperationDetailsDto } from '../builders/operation-dto.builder';
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

    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<{
        operation: OperationDetailsDto;
        position: {
            prev: TripOperationListDetailsDto;
            current: TripOperationListDetailsDto;
            next: TripOperationListDetailsDto;
        };
    }> {
        const httpParams = new HttpParams({ fromString: qb.query() });

        return this.http
            .get<{
                operation: OperationModel;
                position: {
                    prev: TripOperationListModel;
                    current: TripOperationListModel;
                    next: TripOperationListModel;
                };
            }>(this.apiUrl + '/' + operationId + '/current-position', {
                params: httpParams,
            })
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
}
