import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { CreateOperationSightingDto } from './dtos/create-operation-sighting.dto';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingService {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingQuery: OperationSightingQuery,
    ) {}

    findMany(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findMany(qb);
    }

    findManyLatestGroupByFormation(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findManyLatestGroupByFormation(qb);
    }

    findManyLatestGroupByOperation(
        qb: RequestQueryBuilder,
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findManyLatestGroupByOperation(qb);
    }

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        return this.operationSightingQuery.findManyBySpecificPeriod(params);
    }

    findOneTimeCrossSectionFromOperationNumber(params: {
        operationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionFromOperationNumber(
            params,
        );
    }

    findOneTimeCrossSectionByOperationNumber_V3(params: {
        operationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByOperationNumber_V3(
            params,
        );
    }

    findOneTimeCrossSectionFromFormationNumber(params: {
        formationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionFromFormationNumber(
            params,
        );
    }

    findOneTimeCrossSectionByFormationNumber_V3(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByFormationNumber_V3(
            params,
        );
    }

    createOne(
        qb: RequestQueryBuilder,
        body: CreateOperationSightingDto,
    ): Observable<OperationSightingDetailsDto> {
        return this.operationSightingCommand.createOne(qb, body);
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        return this.operationSightingCommand.invalidate(body);
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        return this.operationSightingCommand.restore(body);
    }
}
