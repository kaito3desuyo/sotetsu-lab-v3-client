import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ModerationBulkInvalidateResultDto } from 'src/app/libs/moderation/usecase/dtos/moderation-bulk-invalidate-result.dto';
import { ModerationUserSummaryDto } from 'src/app/libs/moderation/usecase/dtos/moderation-user-summary.dto';
import { ModerationService } from 'src/app/libs/moderation/usecase/moderation.service';
import { ModerationUserStore } from '../stores/moderation-user.store';

/** 1 回の取得で頼む件数。これに満たなければ、もう古い目撃は無い */
export const MODERATION_USER_PAGE_SIZE = 100;

@Injectable()
export class ModerationUserService {
    readonly #store = inject(ModerationUserStore);
    readonly #moderationService = inject(ModerationService);

    /** 要約と目撃の先頭 1 ページを取り直す（初回と、無効化のあとの取り直し） */
    fetchUser(userId: string): Observable<void> {
        const seq = this.#store.nextSightingsSeq();
        return forkJoin({
            summary: this.#moderationService.getUser(userId),
            rows: this.#moderationService.getUserSightings(userId, {
                limit: MODERATION_USER_PAGE_SIZE,
            }),
        }).pipe(
            tap(({ summary, rows }) => {
                if (this.#store.isLatestSightings(seq)) {
                    this.#store.setSummary(summary);
                    this.#store.replaceSightings(
                        rows,
                        rows.length >= MODERATION_USER_PAGE_SIZE,
                    );
                }
            }),
            map(() => undefined),
        );
    }

    /** いま出ている最後の行より古い 1 ページを取り足す */
    fetchNextSightings(userId: string): Observable<void> {
        const last = this.#store.sightings().at(-1);
        if (!last) {
            return of(undefined);
        }
        const seq = this.#store.nextSightingsSeq();
        return this.#moderationService
            .getUserSightings(userId, {
                limit: MODERATION_USER_PAGE_SIZE,
                before: last.createdAt,
            })
            .pipe(
                tap((rows) => {
                    if (this.#store.isLatestSightings(seq)) {
                        this.#store.appendSightings(
                            rows,
                            rows.length >= MODERATION_USER_PAGE_SIZE,
                        );
                    }
                }),
                map(() => undefined),
            );
    }

    /** 手がかり。manager だけが呼ぶ（api も manager だけ） */
    fetchTraces(userId: string): Observable<void> {
        const seq = this.#store.nextTracesSeq();
        return this.#moderationService.getUserTraces(userId).pipe(
            tap((traces) => {
                if (this.#store.isLatestTraces(seq)) {
                    this.#store.setTraces(traces);
                }
            }),
            map(() => undefined),
        );
    }

    invalidateSightings(
        ids: string[],
        reason: string,
    ): Observable<ModerationBulkInvalidateResultDto> {
        return this.#moderationService.invalidateSightings({ ids, reason });
    }

    ban(userId: string, reason: string): Observable<ModerationUserSummaryDto> {
        return this.#moderationService
            .ban(userId, reason)
            .pipe(tap((summary) => this.#replaceSummary(summary)));
    }

    unban(
        userId: string,
        reason?: string,
    ): Observable<ModerationUserSummaryDto> {
        return this.#moderationService
            .unban(userId, reason)
            .pipe(tap((summary) => this.#replaceSummary(summary)));
    }

    /** 返ってきた要約を出す。そのあいだに別の人のページへ移っていたら捨てる */
    #replaceSummary(summary: ModerationUserSummaryDto): void {
        if (this.#store.userId() === summary.userId) {
            this.#store.setSummary(summary);
        }
    }
}
