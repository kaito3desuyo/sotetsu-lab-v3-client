import { BreakpointObserver } from '@angular/cdk/layout';
import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { filter, lastValueFrom, map } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { NotificationService } from 'src/app/core/services/notification.service';
import { readSocketSignal } from 'src/app/core/services/socket-signal';
import { SocketService } from 'src/app/core/services/socket.service';
import { runIntervalInBrowser } from 'src/app/core/utils/run-interval-in-browser';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { OperationRealTimeControllerComponent } from './components/operation-real-time-controller/operation-real-time-controller.component';
import { OperationRealTimeFilterComponent } from './components/operation-real-time-filter/operation-real-time-filter.component';
import { OperationRealTimeFormationTableComponent } from './components/operation-real-time-formation-table/operation-real-time-formation-table.component';
import { OperationRealTimeLegendComponent } from './components/operation-real-time-legend/operation-real-time-legend.component';
import { OperationRealTimeOperationTableComponent } from './components/operation-real-time-operation-table/operation-real-time-operation-table.component';
import { OperationRealTimeService } from './services/operation-real-time.service';
import {
    OperationRealTimeSnapshot,
    OperationRealTimeStore,
} from './stores/operation-real-time.store';
import { filterRealTimeOperations } from './utils/operation-real-time-filter.util';
import { formatRealTimeSummary } from './utils/operation-real-time-summary.util';

/** Tailwind の md。これ以上は運用順・編成順を横並び、未満はタブ */
const DESKTOP_QUERY = '(min-width: 768px)';

/** 圏外のために保存する中身のキー */
const OFFLINE_SNAPSHOT_KEY = 'OperationRealTime';

const firstLoading = signal(true);
OperationRealTimeStore.resetLoading();

@Component({
    selector: 'app-operation-real-time',
    templateUrl: './operation-real-time.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // 枠だけのページ（spec 4 章）。保存した中身・ログイン状態で形が変わるので、
    // サーバーの HTML（読み込み中の骨組み）を引き継がず、ブラウザで描き直す
    host: { ngSkipHydration: 'true' },
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        ControlBandComponent,
        MatTabsModule,
        OperationRealTimeControllerComponent,
        OperationRealTimeFilterComponent,
        OperationRealTimeOperationTableComponent,
        OperationRealTimeFormationTableComponent,
        OperationRealTimeLegendComponent,
    ],
})
export class OperationRealTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #socketService = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #offlineSnapshots = inject(OfflineSnapshots);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #breakpointObserver = inject(BreakpointObserver);
    readonly #postDialog = inject(OperationPostDialogService);

    /** 最初の描画から正しい側を作るよう、初期値は同期で読む（違う配置が一瞬出ると CLS になる） */
    readonly isDesktop = toSignal(
        this.#breakpointObserver
            .observe(DESKTOP_QUERY)
            .pipe(map((state) => state.matches)),
        { initialValue: this.#breakpointObserver.isMatched(DESKTOP_QUERY) },
    );

    readonly isLoading = toSignal(OperationRealTimeStore.isLoading$);

    readonly #agencies = inject(AgencyListState).agencies;
    readonly #operations = toSignal(OperationRealTimeStore.operations$, {
        initialValue: [],
    });
    readonly #formations = toSignal(OperationRealTimeStore.formations$, {
        initialValue: [],
    });
    readonly #timeCrossSections = toSignal(
        OperationRealTimeStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );
    readonly #selectedAgencyIds = toSignal(
        OperationRealTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly #selectedGroupNames = toSignal(
        OperationRealTimeStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly filterActive = computed(
        () =>
            this.#selectedAgencyIds().length > 0 ||
            this.#selectedGroupNames().length > 0,
    );
    readonly bandSummary = computed(() => {
        const operations = this.#operations() ?? [];
        const shown = filterRealTimeOperations(
            operations,
            this.#selectedAgencyIds(),
            this.#selectedGroupNames(),
            this.#timeCrossSections() ?? {},
            this.#formations() ?? [],
        ).length;
        return formatRealTimeSummary({
            agencies: this.#agencies(),
            selectedAgencyIds: this.#selectedAgencyIds(),
            selectedGroupNames: this.#selectedGroupNames(),
            shown,
            total: operations.length,
        });
    });

    onClearFilter(): void {
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    }

    openPost(): void {
        this.#postDialog.open();
    }

    constructor() {
        // 枠だけのページ。中身は刻々と変わるのでサーバーでは取らない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        // この取得を始める前に、すでに取れた中身がある（前の訪問・自動更新の分）なら、
        // メモリの方が保存より新しいので、失敗しても保存した中身には戻さない
        const hasFetchedBefore = OperationRealTimeStore.hasFetchedOperations;
        OperationRealTimeStore.enableLoading();
        try {
            // 運用群は他フェッチに依存しないため最初に取得する。
            // 旧実装は目撃・在線の大量リクエストの後（チェーン末尾）だったため、
            // チェーン途中の 1 失敗や離脱で群チップが「休」のみに退化していた（98 §G2 A3）
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperationGroups(),
            );
            await lastValueFrom(this.#operationRealTimeService.fetchRoutes());
            await lastValueFrom(this.#operationRealTimeService.fetchStations());
            await lastValueFrom(
                this.#operationRealTimeService.fetchTripClasses(),
            );
            await lastValueFrom(this.#operationRealTimeService.fetchCalendar());
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperations(),
            );
            // 前後の運用が取れなくても画面は出す。ただし、その中身は圏外用に保存しない
            const itineraryLinks = await lastValueFrom(
                this.#operationRealTimeService.fetchItineraryLinks(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchFormations(),
            );
            // 現在位置は operations にのみ依存するため、
            // 目撃断面の大量リクエストより先に取得する（98 §G2 A4: 現在位置行の復旧）
            await lastValueFrom(
                this.#operationRealTimeService.fetchCurrentPositions(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(),
            );
            await lastValueFrom(
                this.#operationRealTimeService.fetchSightingHistories(),
            );

            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            if (!itineraryLinks?.failed) {
                void this.#offlineSnapshots.save({
                    key: OFFLINE_SNAPSHOT_KEY,
                    conditions: {},
                    data: OperationRealTimeStore.snapshot(),
                });
            }

            if (firstLoading()) {
                OperationRealTimeStore.setFinalUpdateTime();
                firstLoading.set(false);
            }
        } catch (error) {
            console.error(error);
            // 保存した中身で戻せたら、そのページの知らせが出る。戻せなければ（取れた中身が手元にあって
            // 戻さなかったときも）今の失敗の文言を出す
            if (hasFetchedBefore || !(await this.#restoreSnapshot())) {
                this.#notification.open('データの取得に失敗しました', 'OK');
            }
        } finally {
            OperationRealTimeStore.disableLoading();
        }
    }

    /**
     * 保存した中身を戻す。戻せたら true。戻す処理が壊れていても、読み込み中を解けるよう握りつぶす
     * （自動更新・ソケット・再読み込みの失敗では呼ばない。最初の取得だけ）
     */
    async #restoreSnapshot(): Promise<boolean> {
        try {
            const restored = await this.#offlineSnapshots.restore({
                key: OFFLINE_SNAPSHOT_KEY,
                conditions: {},
                apply: (data: OperationRealTimeSnapshot, savedAt: number) =>
                    OperationRealTimeStore.restoreSnapshot(data, savedAt),
            });
            return restored !== null;
        } catch {
            return false;
        }
    }

    hookEvent(): void {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象がある場合は更新する
        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        runIntervalInBrowser(1000, async () => {
            OperationRealTimeStore.enableLoading();
            try {
                await lastValueFrom(
                    this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate(),
                );
            } catch {
                // 毎秒通知しないよう黙って捨て、次の 1 秒で取り直す
            } finally {
                OperationRealTimeStore.disableLoading();
            }
        });
        // });

        // 自分が運用目撃情報を投稿したとき
        this.#operationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });

        // 他人が運用目撃情報を投稿した、または時刻表が変わったとき
        // （合図は {"type": …}。移行中に古い sendSighting の転送が重なっても二重に取り直さない）
        this.#socketService
            .on()
            .pipe(
                filter((ev) => readSocketSignal(ev) !== null),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe(async () => {
                if (!OperationRealTimeStore.isEnableAutoReload) return;

                this.#notification.open('更新中...', 'OK');
                OperationRealTimeStore.enableLoading();
                try {
                    await this.#reloadSightings();
                    OperationRealTimeStore.setFinalUpdateTime();
                    this.#notification.open('データが更新されました', 'OK');
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    OperationRealTimeStore.disableLoading();
                }
            });
    }

    /** 目撃の断面と履歴を、キャッシュを使わず取り直す */
    async #reloadSightings(): Promise<void> {
        await lastValueFrom(
            this.#operationRealTimeService.fetchOperationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchFormationSightingTimeCrossSections(
                {
                    forceReload: true,
                },
            ),
        );
        await lastValueFrom(
            this.#operationRealTimeService.fetchSightingHistories({
                forceReload: true,
            }),
        );
    }
}
