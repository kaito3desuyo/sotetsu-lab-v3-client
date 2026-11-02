import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ModerationRecentSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-recent-sighting.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { formatTokyoDateTime } from '../utils/format-tokyo-date-time.util';
import { ModerationRecentService } from './services/moderation-recent.service';
import { ModerationRecentStore } from './stores/moderation-recent.store';

@Component({
    selector: 'app-moderation-recent',
    templateUrl: './moderation-recent.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatTableModule,
        AppButtonComponent,
        EmptyStateComponent,
        SkeletonBarComponent,
    ],
})
export class ModerationRecentComponent implements OnInit {
    readonly #store = inject(ModerationRecentStore);
    readonly #service = inject(ModerationRecentService);
    readonly #notification = inject(NotificationService);

    readonly sightings = this.#store.sightings;
    readonly hasMore = this.#store.hasMore;
    readonly hasFetched = this.#store.hasFetched;
    readonly firstFetchFailed = this.#store.firstFetchFailed;
    readonly isLoading = this.#store.isLoading;

    readonly columns = [
        'createdAt',
        'operationNumber',
        'formationNumber',
        'author',
        'status',
    ];
    readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

    readonly formatTime = formatTokyoDateTime;
    readonly trackBySighting = (
        _: number,
        row: ModerationRecentSightingDto,
    ): string => row.operationSightingId;

    ngOnInit(): void {
        this.reload();
    }

    /** 最初の 1 ページを取り直す（初回と、失敗したあとの再読み込み） */
    reload(): void {
        this.#store.setFirstFetchFailed(false);
        void this.#run(this.#service.fetchFirstPage(), true);
    }

    loadMore(): void {
        void this.#run(this.#service.fetchNextPage());
    }

    async #run(
        fetch$: ReturnType<ModerationRecentService['fetchFirstPage']>,
        isFirst = false,
    ) {
        this.#store.enableLoading();
        try {
            await lastValueFrom(fetch$);
        } catch {
            if (isFirst && !this.#store.hasFetched()) {
                this.#store.setFirstFetchFailed(true);
            }
            this.#notification.open('投稿の一覧を取得できませんでした', 'OK');
        } finally {
            this.#store.disableLoading();
        }
    }
}
