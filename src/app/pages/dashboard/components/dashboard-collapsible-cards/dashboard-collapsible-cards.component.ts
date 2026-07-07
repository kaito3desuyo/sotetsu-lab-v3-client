import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { AdsenseModule } from 'ng2-adsense';
import { LibraryListCardCComponent } from 'src/app/shared/library-list-card/components/library-list-card-c/library-list-card-c.component';
import { NewOperationPostCardComponent } from 'src/app/shared/new-operation-post-card/new-operation-post-card.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { TimetablePostCardCComponent } from 'src/app/shared/timetable-post-card/components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { DashboardStore } from '../../stores/dashboard.store';

/**
 * 既存 6 カードを mat-expansion-panel で折りたたんで全て残す（N3・情報削減禁止）。
 * 順序（07-03 指定）: 運用情報を検索する → 運用情報を投稿する → 時刻表を検索する →
 * 時刻表を投稿する → ライブラリ → サイト説明（最下部・初回訪問時のみ展開）。
 * 広告枠も維持する。
 */
@Component({
    selector: 'app-dashboard-collapsible-cards',
    templateUrl: './dashboard-collapsible-cards.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionModule,
        AdsenseModule,
        OperationSearchCardCComponent,
        NewOperationPostCardComponent,
        TimetableSearchCardCComponent,
        TimetablePostCardCComponent,
        LibraryListCardCComponent,
    ],
})
export class DashboardCollapsibleCardsComponent {
    readonly isSiteDescriptionExpanded = signal(
        !DashboardStore.hasVisitedBefore,
    );

    constructor() {
        if (!DashboardStore.hasVisitedBefore) {
            DashboardStore.markVisited();
        }
    }
}
