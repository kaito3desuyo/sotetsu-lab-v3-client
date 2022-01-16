import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingService {
    constructor(
        private readonly operationSightingQuery: OperationSightingQuery
    ) {}

    findManyLatestGroupByFormation(
        qb: RequestQueryBuilder
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findManyLatestGroupByFormation(qb);
    }

    findManyLatestGroupByOperation(
        qb: RequestQueryBuilder
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findManyLatestGroupByOperation(qb);
    }
}
