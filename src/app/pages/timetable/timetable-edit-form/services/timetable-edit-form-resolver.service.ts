import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, first, map, mergeMap } from 'rxjs/operators';
import { TitleService } from 'src/app/core/services/title.service';
import { InitializeStateQuery } from 'src/app/global-states/initialize.state';
import { TimetableEditFormDraftStore } from '../stores/timetable-edit-form-draft.store';

/**
 * 30-architecture.md §1.1 準拠: resolver はデータ本体を取得しない。
 * 「グローバル初期化待ち + タイトル設定 + 下書きストアの永続化復元待ち」のみを担う。
 * calendarId/tripDirection/tripBlockId/mode の読み取りとデータフェッチは
 * ルートコンポーネントの constructor（paramMap 購読）に委ねる。
 */
@Injectable()
export class TimetableEditFormResolverService {
    readonly #titleService = inject(TitleService);
    readonly #initializeStateQuery = inject(InitializeStateQuery);

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const title = route.data.title;

        this.#titleService.setTitle(title);

        return of(undefined).pipe(
            mergeMap(() =>
                this.#initializeStateQuery.isInitialized$.pipe(
                    filter((bool) => !!bool),
                    first(),
                ),
            ),
            mergeMap(() => TimetableEditFormDraftStore.persistInitialized$),
            map(() => undefined),
        );
    }
}
