import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { TripOperationListDetailsDto } from '../../trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationDetailsDto } from './dtos/operation-details.dto';

@Injectable({ providedIn: 'root' })
export class OperationService {
    constructor(private readonly operationQuery: OperationQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<OperationDetailsDto> | OperationDetailsDto[]> {
        return this.operationQuery.findMany(qb);
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
        return this.operationQuery.findOneWithCurrentPosition(operationId, qb);
    }
}
