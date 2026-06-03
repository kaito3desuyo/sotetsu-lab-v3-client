import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto';
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

    findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByOperationNumber(
            params,
        );
    }

    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionByFormationNumber(
            params,
        );
    }

    post(body: PostOperationSightingDto): Observable<void> {
        return this.operationSightingCommand.post(body);
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        return this.operationSightingCommand.invalidate(body);
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        return this.operationSightingCommand.restore(body);
    }
}
