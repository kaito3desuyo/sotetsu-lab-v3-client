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
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { DashboardCollapsibleCardsComponent } from './components/dashboard-collapsible-cards/dashboard-collapsible-cards.component';
import { DashboardLatestSightingsComponent } from './components/dashboard-latest-sightings/dashboard-latest-sightings.component';
import { DashboardQuickTilesComponent } from './components/dashboard-quick-tiles/dashboard-quick-tiles.component';
import { DashboardStatusCardComponent } from './components/dashboard-status-card/dashboard-status-card.component';
import { DashboardService } from './services/dashboard.service';
import { DashboardSnapshot, DashboardStore } from './stores/dashboard.store';

/** 圏外のために保存する中身のキー */
const OFFLINE_SNAPSHOT_KEY = 'Dashboard';

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
    readonly #offlineSnapshots = inject(OfflineSnapshots);

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
            // 互いに依存しないものは並行に取る（以前は 6 本を 1 本ずつ待っていた）。
            // 失敗しても、ほかの取得が終わるまで待つ
            let failure = await this.#firstFailure([
                lastValueFrom(this.#dashboardService.fetchTodaysCalendar()),
                lastValueFrom(this.#dashboardService.fetchTodaysDayName()),
                lastValueFrom(this.#dashboardService.fetchTodaysSightings()),
                lastValueFrom(this.#dashboardService.fetchTripClasses()),
            ]);
            // 走行中の本数は今日のダイヤ、位置は目撃情報を読むので後に回す
            if (!failure) {
                failure = await this.#firstFailure([
                    lastValueFrom(
                        this.#dashboardService.fetchRunningTripCount(),
                    ),
                    lastValueFrom(
                        this.#dashboardService.fetchLatestSightingPositions(),
                    ),
                ]);
            }

            if (failure) {
                // 取得がすべて終わってから、保存した中身で戻す
                // （遅れて届いた成功が戻した中身を上書きしないように）
                await this.#restoreSnapshot();
                throw failure.reason;
            }

            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            void this.#offlineSnapshots.save({
                key: OFFLINE_SNAPSHOT_KEY,
                conditions: {},
                data: DashboardStore.snapshot(),
            });
        } finally {
            DashboardStore.disableLoading();
        }
    }

    /** 全部の取得が終わるまで待ち、最初に失敗したものを返す（全部成功なら null） */
    async #firstFailure(
        promises: Promise<unknown>[],
    ): Promise<{ reason: unknown } | null> {
        const results = await Promise.allSettled(promises);
        const rejected = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );
        return rejected ? { reason: rejected.reason } : null;
    }

    /** 保存した中身を戻す。戻す処理が壊れていても、取得の失敗をそのまま投げられるよう握りつぶす */
    async #restoreSnapshot(): Promise<void> {
        try {
            await this.#offlineSnapshots.restore({
                key: OFFLINE_SNAPSHOT_KEY,
                conditions: {},
                apply: (data: DashboardSnapshot) =>
                    DashboardStore.restoreSnapshot(data),
            });
        } catch {
            // 保存した中身が壊れていても、取得の失敗をそのまま投げる
        }
    }
}
