import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OperationQuery } from '../infrastructure/queries/operation.query';
import { OperationCurrentPositionDto } from './dtos/operation-current-position.dto';
import { OperationDetailsDto } from './dtos/operation-details.dto';
import { OperationGroupDto } from './dtos/operation-group.dto';
import { OperationTripsDto } from './dtos/operation-trips.dto';

@Injectable({ providedIn: 'root' })
export class OperationService {
    private readonly operationQuery = inject(OperationQuery);

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

    findOneWithCurrentPosition(params: {
        operationId: string;
        searchTime?: string;
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto> {
        return this.operationQuery.findOneWithCurrentPosition(params);
    }

    findManyWithCurrentPosition(params: {
        operationIds: string[];
        forceReload?: boolean;
    }): Observable<OperationCurrentPositionDto[]> {
        return this.operationQuery.findManyWithCurrentPosition(params);
    }

    findManyWithTrips(params: {
        calendarId: string;
        forceReload?: boolean;
    }): Observable<OperationTripsDto[]> {
        return this.operationQuery.findManyWithTrips(params);
    }

    findOneWithTrips(params: {
        operationId: string;
        forceReload?: boolean;
    }): Observable<OperationTripsDto> {
        return this.operationQuery.findOneWithTrips(params);
    }

    findManyGroups(params?: {
        forceReload?: boolean;
    }): Observable<OperationGroupDto[]> {
        return this.operationQuery.findManyGroups(params);
    }
}
