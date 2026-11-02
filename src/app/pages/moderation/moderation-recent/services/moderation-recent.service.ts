import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ModerationService } from 'src/app/libs/moderation/usecase/moderation.service';
import { ModerationRecentStore } from '../stores/moderation-recent.store';

/** 1 回の取得で頼む件数。これに満たなければ、もう古い投稿は無い */
export const MODERATION_RECENT_PAGE_SIZE = 100;

@Injectable()
export class ModerationRecentService {
    readonly #store = inject(ModerationRecentStore);
    readonly #moderationService = inject(ModerationService);

    /** 新しい順の先頭 1 ページを取り直し、一覧を入れ替える */
    fetchFirstPage(): Observable<void> {
        const seq = this.#store.nextFetchSeq();
        return this.#moderationService
            .getRecentSightings({ limit: MODERATION_RECENT_PAGE_SIZE })
            .pipe(
                tap((rows) => {
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.replaceSightings(
                            rows,
                            rows.length >= MODERATION_RECENT_PAGE_SIZE,
                        );
                    }
                }),
                map(() => undefined),
            );
    }

    /** いま出ている最後の行より古い 1 ページを取り足す */
    fetchNextPage(): Observable<void> {
        const last = this.#store.sightings().at(-1);
        if (!last) {
            return of(undefined);
        }
        const seq = this.#store.nextFetchSeq();
        return this.#moderationService
            .getRecentSightings({
                limit: MODERATION_RECENT_PAGE_SIZE,
                before: last.createdAt,
            })
            .pipe(
                tap((rows) => {
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.appendSightings(
                            rows,
                            rows.length >= MODERATION_RECENT_PAGE_SIZE,
                        );
                    }
                }),
                map(() => undefined),
            );
    }
}
