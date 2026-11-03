import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { InvalidateManyOperationSightingsResultDto } from 'src/app/libs/operation-sighting/usecase/dtos/invalidate-many-operation-sightings-result.dto';
import { UserSummaryDto } from 'src/app/libs/user/usecase/dtos/user-summary.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { ModerationUserStore } from '../stores/moderation-user.store';

/** 1 回の取得で頼む件数。これに満たなければ、もう古い目撃は無い */
export const MODERATION_USER_PAGE_SIZE = 100;

@Injectable()
export class ModerationUserService {
    readonly #store = inject(ModerationUserStore);
    readonly #userService = inject(UserService);
    readonly #operationSightingService = inject(OperationSightingService);

    /** 要約と目撃の先頭 1 ページを取り直す（初回と、無効化のあとの取り直し） */
    fetchUser(userId: string): Observable<void> {
        if (!this.#isCurrent(userId)) {
            return of(undefined);
        }
        const seq = this.#store.nextSightingsSeq();
        return forkJoin({
            summary: this.#userService.findSummary(userId),
            rows: this.#operationSightingService.findManyByUserId(userId, {
                limit: MODERATION_USER_PAGE_SIZE,
            }),
        }).pipe(
            tap(({ summary, rows }) => {
                if (
                    this.#isCurrent(userId) &&
                    this.#store.isLatestSightings(seq)
                ) {
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
        if (!last || !this.#isCurrent(userId)) {
            return of(undefined);
        }
        const seq = this.#store.nextSightingsSeq();
        return this.#operationSightingService
            .findManyByUserId(userId, {
                limit: MODERATION_USER_PAGE_SIZE,
                before: last.createdAt,
            })
            .pipe(
                tap((rows) => {
                    if (
                        this.#isCurrent(userId) &&
                        this.#store.isLatestSightings(seq)
                    ) {
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
        if (!this.#isCurrent(userId)) {
            return of(undefined);
        }
        const seq = this.#store.nextTracesSeq();
        return this.#userService.findAccessTraces(userId).pipe(
            tap((traces) => {
                if (
                    this.#isCurrent(userId) &&
                    this.#store.isLatestTraces(seq)
                ) {
                    this.#store.setTraces(traces);
                }
            }),
            map(() => undefined),
        );
    }

    invalidateSightings(
        ids: string[],
        reason: string,
    ): Observable<InvalidateManyOperationSightingsResultDto> {
        return this.#operationSightingService.invalidateMany({ ids, reason });
    }

    ban(userId: string, reason: string): Observable<UserSummaryDto> {
        return this.#userService
            .ban(userId, reason)
            .pipe(tap((summary) => this.#replaceSummary(summary)));
    }

    unban(userId: string, reason?: string): Observable<UserSummaryDto> {
        return this.#userService
            .unban(userId, reason)
            .pipe(tap((summary) => this.#replaceSummary(summary)));
    }

    /** 返ってきた要約を出す。そのあいだに別の人のページへ移っていたら捨てる */
    #replaceSummary(summary: UserSummaryDto): void {
        if (this.#isCurrent(summary.userId)) {
            this.#store.setSummary(summary);
        }
    }

    /** いま見ている投稿者か。別の人のページへ移ったあとに返った応答で、画面を書かないための確認 */
    #isCurrent(userId: string): boolean {
        return this.#store.userId() === userId;
    }
}
