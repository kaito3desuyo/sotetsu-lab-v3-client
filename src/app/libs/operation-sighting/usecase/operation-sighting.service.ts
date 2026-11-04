import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { catchError, expand, last, map } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { InvalidateManyOperationSightingsResultDto } from './dtos/invalidate-many-operation-sightings-result.dto';
import { InvalidateManyOperationSightingsDto } from './dtos/invalidate-many-operation-sightings.dto';
import { InvalidateOperationSightingDto } from './dtos/invalidate-operation-sighting.dto';
import { MyOperationSightingDto } from './dtos/my-operation-sighting.dto';
import { OperationSightingAuthorDto } from './dtos/operation-sighting-author.dto';
import { OperationSightingDetailsDto } from './dtos/operation-sighting-details.dto';
import { OperationSightingListParamsDto } from './dtos/operation-sighting-list-params.dto';
import { OperationSightingRecentDto } from './dtos/operation-sighting-recent.dto';
import { OperationSightingSummaryDto } from './dtos/operation-sighting-summary.dto';
import { OperationSightingTimeCrossSectionDto } from './dtos/operation-sighting-time-cross-section.dto';
import { PostOperationSightingDto } from './dtos/post-operation-sighting.dto';
import { RestoreOperationSightingDto } from './dtos/restore-operation-sighting.dto';

/** まとめての無効化を 1 回で済ませるために送り直す回数の上限（最初の 1 回を含む） */
const MAX_INVALIDATE_MANY_REQUESTS = 10;

@Injectable({ providedIn: 'root' })
export class OperationSightingService {
    readonly #operationSightingCommand = inject(OperationSightingCommand);
    readonly #operationSightingQuery = inject(OperationSightingQuery);

    readonly #queryInvalidator = inject(QueryInvalidator);

    findManyBySpecificPeriod(params: {
        from: string;
        to: string;
        includeInvalidated?: boolean;
        includeCarriedOver?: boolean;
        forceReload?: boolean;
    }): Observable<OperationSightingDetailsDto[]> {
        return this.#operationSightingQuery.findManyBySpecificPeriod(params);
    }

    findManyTimeCrossSectionsByOperationNumbers(params: {
        operationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.#operationSightingQuery.findManyTimeCrossSectionsByOperationNumbers(
            params,
        );
    }

    findManyTimeCrossSectionsByFormationNumbers(params: {
        formationNumbers: string[];
        forceReload?: boolean;
    }): Observable<Record<string, OperationSightingTimeCrossSectionDto>> {
        return this.#operationSightingQuery.findManyTimeCrossSectionsByFormationNumbers(
            params,
        );
    }

    findOneTimeCrossSectionByOperationNumber(params: {
        operationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.#operationSightingQuery.findOneTimeCrossSectionByOperationNumber(
            params,
        );
    }

    findOneTimeCrossSectionByFormationNumber(params: {
        formationNumber: string;
        forceReload?: boolean;
    }): Observable<OperationSightingTimeCrossSectionDto> {
        return this.#operationSightingQuery.findOneTimeCrossSectionByFormationNumber(
            params,
        );
    }

    post(body: PostOperationSightingDto): Observable<void> {
        return this.#operationSightingCommand
            .post(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    invalidate(body: InvalidateOperationSightingDto): Observable<void> {
        return this.#operationSightingCommand
            .invalidate(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    restore(body: RestoreOperationSightingDto): Observable<void> {
        return this.#operationSightingCommand
            .restore(body)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    findManyByUserId(
        userId: string,
        params?: OperationSightingListParamsDto,
    ): Observable<OperationSightingSummaryDto[]> {
        return this.#operationSightingQuery.findManyByUserId(userId, params);
    }

    findManyMine(
        params?: OperationSightingListParamsDto,
    ): Observable<MyOperationSightingDto[]> {
        return this.#operationSightingQuery.findManyMine(params);
    }

    findManyRecent(
        params?: OperationSightingListParamsDto,
    ): Observable<OperationSightingRecentDto[]> {
        return this.#operationSightingQuery.findManyRecent(params);
    }

    findAuthor(
        operationSightingId: string,
    ): Observable<OperationSightingAuthorDto> {
        return this.#operationSightingQuery.findAuthor(operationSightingId);
    }

    /**
     * api は約 1 秒で区切り、手を付けなかった id を pending で返す。
     * failed が無いかぎり pending を同じ理由で送り直し（最大 10 回）、結果を 1 つにまとめて返す。
     * 2 回目以降が通信エラーなら、済んだ分を残して failed（その回の先頭 id）と pending（その回の ids）で返す。1 回目のエラーはそのまま投げる。
     */
    invalidateMany(
        body: InvalidateManyOperationSightingsDto,
    ): Observable<InvalidateManyOperationSightingsResultDto> {
        const { reason } = body;
        type Step = {
            merged: InvalidateManyOperationSightingsResultDto;
            requests: number;
        };

        return this.#operationSightingCommand
            .invalidateMany({ ids: body.ids, reason })
            .pipe(
                map((result): Step => ({ merged: result, requests: 1 })),
                expand(({ merged, requests }) =>
                    merged.pending.length > 0 &&
                    !merged.failed &&
                    requests < MAX_INVALIDATE_MANY_REQUESTS
                        ? this.#operationSightingCommand
                              .invalidateMany({
                                  ids: merged.pending,
                                  reason,
                              })
                              .pipe(
                                  catchError(
                                      (): Observable<InvalidateManyOperationSightingsResultDto> =>
                                          of({
                                              invalidated: [],
                                              skipped: [],
                                              failed: {
                                                  id: merged.pending[0],
                                                  message: '通信に失敗しました',
                                              },
                                              pending: merged.pending,
                                          }),
                                  ),
                                  map((result): Step => ({
                                      merged: {
                                          invalidated:
                                              merged.invalidated.concat(
                                                  result.invalidated,
                                              ),
                                          skipped: merged.skipped.concat(
                                              result.skipped,
                                          ),
                                          failed: result.failed,
                                          pending: result.pending,
                                      },
                                      requests: requests + 1,
                                  })),
                              )
                        : [],
                ),
                last(),
                map(({ merged }) => merged),
                tap((merged) => {
                    if (merged.invalidated.length > 0) {
                        this.#queryInvalidator.invalidate('sighting');
                    }
                }),
            );
    }
}
