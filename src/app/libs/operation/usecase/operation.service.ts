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
        qb: RequestQueryBuilder,
    ): Observable<Pagination<OperationDetailsDto> | OperationDetailsDto[]> {
        return this.operationQuery.findMany(qb);
    }

    findManyByCalendarId(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        return this.operationQuery.findManyByCalendarId(params);
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        forceReload?: boolean;
    }): Observable<OperationDetailsDto[]> {
        return this.operationQuery.findManyBySpecificPeriod(params);
    }

    findOne(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationDetailsDto> {
        return this.operationQuery.findOne(operationId, qb);
    }

    findOneWithCurrentPosition(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationCurrentPositionDto> {
        return this.operationQuery.findOneWithCurrentPosition(operationId, qb);
    }

    findOneWithCurrentPosition_V3(params: {
        operationId: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto> {
        return this.operationQuery.findOneWithCurrentPosition_V3(params);
    }

    findOneWithTrips(
        operationId: string,
        qb: RequestQueryBuilder,
    ): Observable<OperationTripsDto> {
        return this.operationQuery.findOneWithTrips(operationId, qb);
    }
}
