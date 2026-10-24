import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { lastValueFrom } from 'rxjs';
import { DashboardCollapsibleCardsComponent } from './components/dashboard-collapsible-cards/dashboard-collapsible-cards.component';
import { DashboardLatestSightingsComponent } from './components/dashboard-latest-sightings/dashboard-latest-sightings.component';
import { DashboardQuickTilesComponent } from './components/dashboard-quick-tiles/dashboard-quick-tiles.component';
import { DashboardStatusCardComponent } from './components/dashboard-status-card/dashboard-status-card.component';
import { DashboardService } from './services/dashboard.service';
import { DashboardStore } from './stores/dashboard.store';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // 枠だけのページ（spec 4 章）。保存した中身・ログイン状態で形が変わるので、
    // サーバーの HTML（読み込み中の骨組み）を引き継がず、ブラウザで描き直す
    host: { ngSkipHydration: 'true' },
    imports: [
        MatProgressBarModule,
        DashboardStatusCardComponent,
        DashboardQuickTilesComponent,
        DashboardLatestSightingsComponent,
        DashboardCollapsibleCardsComponent,
    ],
})
export class DashboardComponent {
    readonly #dashboardService = inject(DashboardService);

    readonly isLoading = toSignal(DashboardStore.isLoading$, {
        initialValue: false,
    });

    constructor() {
        // 枠だけのページ。中身は刻々と変わるのでサーバーでは取らない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
        this.fetchData();
    }

    async fetchData(): Promise<void> {
        DashboardStore.enableLoading();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            // 互いに依存しないものは並行に取る（以前は 6 本を 1 本ずつ待っていた）
            await Promise.all([
                lastValueFrom(this.#dashboardService.fetchTodaysCalendar()),
                lastValueFrom(this.#dashboardService.fetchTodaysDayName()),
                lastValueFrom(this.#dashboardService.fetchTodaysSightings()),
                lastValueFrom(this.#dashboardService.fetchTripClasses()),
            ]);
            // 走行中の本数は今日のダイヤ、位置は目撃情報を読むので後に回す
            await Promise.all([
                lastValueFrom(this.#dashboardService.fetchRunningTripCount()),
                lastValueFrom(
                    this.#dashboardService.fetchLatestSightingPositions(),
                ),
            ]);
        } finally {
            DashboardStore.disableLoading();
        }
    }
}
