import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationTripsDto } from './dtos/operation-trips.dto';

@Injectable({ providedIn: 'root' })
export class OperationService {
    constructor(private readonly operationQuery: OperationQuery) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<Pagination<OperationDetailsDto> | OperationDetailsDto[]> {
        return this.operationQuery.findMany(qb);
    }

    findAllOperationNumbers(calendarId: string): Observable<string[]> {
        return this.operationQuery.findAllOperationNumbers(calendarId);
    }

    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<OperationCurrentPositionDto> {
        return this.operationQuery.findOneWithCurrentPosition(operationId, qb);
    }

    findOneWithTrips(
        operationId: string,
        qb: RequestQueryBuilder
    ): Observable<OperationTripsDto> {
        return this.operationQuery.findOneWithTrips(operationId, qb);
    }
}
