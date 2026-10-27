import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
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
    readonly #store = inject(DashboardStore);
    readonly #notification = inject(NotificationService);

    readonly isLoading = this.#store.isLoading;

    constructor() {
        // 枠だけのページ。中身は刻々と変わるのでサーバーでは取らない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
        this.fetchData();
    }

    async fetchData(): Promise<void> {
        // この取得を始める前に、すでに取れた中身がある（前の訪問の分。今日のダイヤは取れたら入る）なら、
        // メモリの方が保存より新しいので、失敗しても保存した中身には戻さない
        const hasFetchedBefore = this.#store.todaysCalendar() !== null;
        this.#store.enableLoading();

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
                // （遅れて届いた成功が戻した中身を上書きしないように）。
                // 戻せたら戻した旨の知らせが出る。戻せなければ（手元に中身があって戻さなかったときも）失敗を知らせる
                if (hasFetchedBefore || !(await this.#restoreSnapshot())) {
                    this.#notification.open('データの取得に失敗しました', 'OK');
                }
                throw failure.reason;
            }

            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            void this.#store.saveOfflineSnapshot('main', {});
        } finally {
            this.#store.disableLoading();
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

    /** 保存した中身を戻す。戻せたら true。戻す処理が壊れていても、取得の失敗をそのまま投げられるよう握りつぶす */
    async #restoreSnapshot(): Promise<boolean> {
        try {
            const restored = await this.#store.restoreOfflineSnapshot(
                'main',
                {},
            );
            return restored !== null;
        } catch {
            // 保存した中身が壊れていても、取得の失敗をそのまま投げる
            return false;
        }
    }
}
