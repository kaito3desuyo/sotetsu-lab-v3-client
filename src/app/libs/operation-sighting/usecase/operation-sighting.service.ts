import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { Pagination } from 'src/app/core/utils/pagination';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { CreateOperationSightingDto } from './dtos/create-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingService {
    constructor(
        private readonly operationSightingCommand: OperationSightingCommand,
        private readonly operationSightingQuery: OperationSightingQuery
    ) {}

    findMany(
        qb: RequestQueryBuilder
    ): Observable<
        Pagination<OperationSightingDetailsDto> | OperationSightingDetailsDto[]
    > {
        return this.operationSightingQuery.findMany(qb);
    }

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

    findOneTimeCrossSectionFromOperationNumber(params: {
        operationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionFromOperationNumber(
            params
        );
    }

    findOneTimeCrossSectionFromFormationNumber(params: {
        formationNumber: string;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.operationSightingQuery.findOneTimeCrossSectionFromFormationNumber(
            params
        );
    }

    createOne(
        qb: RequestQueryBuilder,
        body: CreateOperationSightingDto
    ): Observable<OperationSightingDetailsDto> {
        return this.operationSightingCommand.createOne(qb, body);
    }
}
