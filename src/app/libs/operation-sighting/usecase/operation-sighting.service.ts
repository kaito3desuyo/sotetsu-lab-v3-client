import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';

@Injectable({ providedIn: 'root' })
export class OperationSightingService {
    private readonly operationSightingCommand = inject(
        OperationSightingCommand,
    );
    private readonly operationSightingQuery = inject(OperationSightingQuery);

    readonly #queryInvalidator = inject(QueryInvalidator);

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        return this.operationSightingQuery.findManyBySpecificPeriod(params);
    }

    findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.operationSightingQuery.findManyTimeCrossSectionsByOperationNumbers(
            params,
        );
    }

    findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.operationSightingQuery.findManyTimeCrossSectionsByFormationNumbers(
            params,
        );
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
        return this.operationSightingCommand
            .post(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        return this.operationSightingCommand
            .invalidate(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        return this.operationSightingCommand
            .restore(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }
}
