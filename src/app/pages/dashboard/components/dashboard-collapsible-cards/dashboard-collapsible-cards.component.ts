import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { LibraryListCardCComponent } from 'src/app/shared/library-list-card/components/library-list-card-c/library-list-card-c.component';
import { NewOperationPostCardComponent } from 'src/app/shared/new-operation-post-card/new-operation-post-card.component';
import { OperationSearchCardCComponent } from 'src/app/shared/operation-search-card/components/operation-search-card-c/operation-search-card-c.component';
import { providePanelCardEmbedded } from 'src/app/shared/panel-card/panel-card.component';
import { TimetablePostCardCComponent } from 'src/app/shared/timetable-post-card/components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetableSearchCardCComponent } from 'src/app/shared/timetable-search-card/components/timetable-search-card-c/timetable-search-card-c.component';
import { DashboardStore } from '../../stores/dashboard.store';

/**
 * 既存 6 カードを mat-expansion-panel で折りたたんで全て残す（N3・情報削減禁止）。
 * 順序（07-03 指定）: 運用情報を検索する → 運用情報を投稿する → 時刻表を検索する →
 * 時刻表を投稿する → ライブラリ → サイト説明（最下部・初回訪問時のみ展開）。
 * 広告枠は当面置かない（ユーザー判断 2026-09-23。他ページの広告は残す）。
 *
 * パネルの見出しと面がカードの外枠を兼ねるので、中のカードは埋め込み表示
 * （外枠・見出し・余白なし）にする。単独で置く他ページのカードは外枠ありのまま。
 */
@Component({
    selector: 'app-dashboard-collapsible-cards',
    templateUrl: './dashboard-collapsible-cards.component.html',
    styleUrl: './dashboard-collapsible-cards.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionModule,
        OperationSearchCardCComponent,
        NewOperationPostCardComponent,
        TimetableSearchCardCComponent,
        TimetablePostCardCComponent,
        LibraryListCardCComponent,
    ],
    providers: [providePanelCardEmbedded()],
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
