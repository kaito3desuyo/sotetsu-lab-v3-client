import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { expand, last, map } from 'rxjs/operators';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { ModerationCommand } from '../infrastructure/commands/moderation.command';
import { ModerationQuery } from '../infrastructure/queries/moderation.query';
import { InvalidateSightingsDto } from './dtos/invalidate-sightings.dto';
import { ModerationBulkInvalidateResultDto } from './dtos/moderation-bulk-invalidate-result.dto';
import { ModerationPageParamsDto } from './dtos/moderation-page-params.dto';
import { ModerationRecentSightingDto } from './dtos/moderation-recent-sighting.dto';
import { ModerationSightingAuthorDto } from './dtos/moderation-sighting-author.dto';
import { ModerationSightingDto } from './dtos/moderation-sighting.dto';
import { ModerationTraceDto } from './dtos/moderation-trace.dto';
import { ModerationUserSummaryDto } from './dtos/moderation-user-summary.dto';

/** まとめての無効化を 1 回で済ませるために送り直す回数の上限（最初の 1 回を含む） */
const MAX_INVALIDATE_REQUESTS = 10;

@Injectable({ providedIn: 'root' })
export class ModerationService {
    readonly #moderationQuery = inject(ModerationQuery);
    readonly #moderationCommand = inject(ModerationCommand);

    readonly #queryInvalidator = inject(QueryInvalidator);

    getUser(userId: string): Observable<ModerationUserSummaryDto> {
        return this.#moderationQuery.getUser(userId);
    }

    getUserSightings(
        userId: string,
        params?: ModerationPageParamsDto,
    ): Observable<ModerationSightingDto[]> {
        return this.#moderationQuery.getUserSightings(userId, params);
    }

    getSightingAuthor(
        operationSightingId: string,
    ): Observable<ModerationSightingAuthorDto> {
        return this.#moderationQuery.getSightingAuthor(operationSightingId);
    }

    getRecentSightings(
        params?: ModerationPageParamsDto,
    ): Observable<ModerationRecentSightingDto[]> {
        return this.#moderationQuery.getRecentSightings(params);
    }

    getUserTraces(userId: string): Observable<ModerationTraceDto[]> {
        return this.#moderationQuery.getUserTraces(userId);
    }

    /**
     * api は約 1 秒で区切り、手を付けなかった id を pending で返す。
     * failed が無いかぎり pending を同じ理由で送り直し（最大 10 回）、結果を 1 つにまとめて返す。
     */
    invalidateSightings(
        body: InvalidateSightingsDto,
    ): Observable<ModerationBulkInvalidateResultDto> {
        const { reason } = body;
        type Step = {
            merged: ModerationBulkInvalidateResultDto;
            requests: number;
        };

        return this.#moderationCommand
            .invalidateSightings({ ids: body.ids, reason })
            .pipe(
                map((result): Step => ({ merged: result, requests: 1 })),
                expand(({ merged, requests }) =>
                    merged.pending.length > 0 &&
                    !merged.failed &&
                    requests < MAX_INVALIDATE_REQUESTS
                        ? this.#moderationCommand
                              .invalidateSightings({
                                  ids: merged.pending,
                                  reason,
                              })
                              .pipe(
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

    ban(userId: string, reason: string): Observable<ModerationUserSummaryDto> {
        return this.#moderationCommand
            .ban(userId, reason)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }

    unban(
        userId: string,
        reason?: string,
    ): Observable<ModerationUserSummaryDto> {
        return this.#moderationCommand
            .unban(userId, reason)
            .pipe(tap(() => this.#queryInvalidator.invalidate('sighting')));
    }
}
