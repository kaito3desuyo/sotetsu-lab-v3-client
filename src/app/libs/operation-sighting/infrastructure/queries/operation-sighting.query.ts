import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pagination } from 'src/app/core/utils/pagination';
import { environment } from 'src/environments/environment';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { buildOperationSightingDetailsDto } from '../builders/operation-sighting-dto.builder';
import { OperationSightingModel } from '../models/operation-sighting.model';

@Injectable({ providedIn: 'root' })
export class OperationSightingQuery {
    private readonly apiUrl = environment.apiUrl + '/v2/operation-sightings';

    constructor(private readonly http: HttpClient) {}

    findManyLatestGroupByOperation(
        qb: RequestQueryBuilder
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
                                  buildOperationSightingDetailsDto(o)
                              ),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) =>
                              buildOperationSightingDetailsDto(o)
                          );
                })
            );
    }

    findManyLatestGroupByFormation(
        qb: RequestQueryBuilder
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
                                  buildOperationSightingDetailsDto(o)
                              ),
                              Pagination.getApiPageSettings(res)
                          )
                        : res.body.map((o) =>
                              buildOperationSightingDetailsDto(o)
                          );
                })
            );
    }
}
