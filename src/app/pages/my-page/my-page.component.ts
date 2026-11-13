import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SightingCorroboration } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { formatTokyoDateTime } from '../moderation/utils/format-tokyo-date-time.util';
import { MyPageService } from './services/my-page.service';
import { MyPageStore } from './stores/my-page.store';

/** 裏付けの言葉と字の色。conflicting は間違いと断じないので色を付けない */
export const CORROBORATION_LABELS: Record<
    SightingCorroboration,
    { label: string; colorClass: string }
> = {
    corroborated: { label: '裏付けあり', colorClass: 'tw-text-corroborated' },
    conflicting: { label: '別の運用の目撃あり', colorClass: '' },
    uncorroborated: { label: '他の目撃なし', colorClass: 'tw-text-muted' },
    invalidated: { label: '無効', colorClass: 'tw-text-muted' },
};

/** ページ名の大見出しは置かない（ツールバーが名前を出す） */
@Component({
    selector: 'app-my-page',
    templateUrl: './my-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        AppButtonComponent,
        EmptyStateComponent,
        OperationNumberTagComponent,
        SkeletonBarComponent,
    ],
})
export class MyPageComponent {
    readonly #store = inject(MyPageStore);
    readonly #service = inject(MyPageService);
    readonly #notification = inject(NotificationService);

    readonly summary = this.#store.summary;
    readonly sightings = this.#store.sightings;
    readonly hasMore = this.#store.hasMore;
    readonly hasFetched = this.#store.hasFetched;
    readonly firstFetchFailed = this.#store.firstFetchFailed;
    readonly isLoading = this.#store.isLoading;

    readonly corroborationLabels = CORROBORATION_LABELS;
    readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);
    readonly formatTime = formatTokyoDateTime;

    constructor() {
        this.#store.begin();
        this.reload();
    }

    /** 要約と目撃の先頭を取り直す。初回と、失敗したあとの再読み込み */
    reload(): void {
        this.#store.setFirstFetchFailed(false);
        void this.#run(this.#service.fetchMine(), true);
    }

    loadMore(): void {
        void this.#run(this.#service.fetchNext(), false);
    }

    async #run(
        fetch$: ReturnType<MyPageService['fetchMine']>,
        first: boolean,
    ): Promise<void> {
        this.#store.enableLoading();
        try {
            await lastValueFrom(fetch$);
        } catch {
            if (first && !this.#store.hasFetched()) {
                this.#store.setFirstFetchFailed(true);
            }
            this.#notification.open(
                first
                    ? 'マイページを取得できませんでした'
                    : '目撃の一覧を取得できませんでした',
                'OK',
            );
        } finally {
            this.#store.disableLoading();
        }
    }
}
