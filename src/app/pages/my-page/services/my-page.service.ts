import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { MyPageStore } from '../stores/my-page.store';

/** 1 回の取得で頼む件数。これに満たなければ、もう古い目撃は無い */
export const MY_PAGE_SIZE = 50;

@Injectable()
export class MyPageService {
    readonly #store = inject(MyPageStore);
    readonly #userService = inject(UserService);
    readonly #operationSightingService = inject(OperationSightingService);

    /** 要約と目撃の先頭 1 ページを取り直す（初回と、失敗したあとの再読み込み） */
    fetchMine(): Observable<void> {
        const seq = this.#store.nextFetchSeq();
        return forkJoin({
            summary: this.#userService.findMySummary(),
            rows: this.#operationSightingService.findManyMine({
                limit: MY_PAGE_SIZE,
            }),
        }).pipe(
            tap(({ summary, rows }) => {
                if (this.#store.isLatestFetch(seq)) {
                    this.#store.setSummary(summary);
                    this.#store.replaceSightings(
                        rows,
                        rows.length >= MY_PAGE_SIZE,
                    );
                }
            }),
            map(() => undefined),
        );
    }

    /** いま出ている最後の行より古い 1 ページを取り足す */
    fetchNext(): Observable<void> {
        const last = this.#store.sightings().at(-1);
        if (!last) {
            return of(undefined);
        }
        const seq = this.#store.nextFetchSeq();
        return this.#operationSightingService
            .findManyMine({ limit: MY_PAGE_SIZE, before: last.createdAt })
            .pipe(
                tap((rows) => {
                    if (this.#store.isLatestFetch(seq)) {
                        this.#store.appendSightings(
                            rows,
                            rows.length >= MY_PAGE_SIZE,
                        );
                    }
                }),
                map(() => undefined),
            );
    }
}
