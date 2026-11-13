import { BreakpointObserver } from '@angular/cdk/layout';
import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    linkedSignal,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { filter, lastValueFrom, map } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { readSocketSignal } from 'src/app/core/services/socket-signal';
import { SocketService } from 'src/app/core/services/socket.service';
import { runIntervalInBrowser } from 'src/app/core/utils/run-interval-in-browser';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { OperationRealTimeControllerComponent } from './components/operation-real-time-controller/operation-real-time-controller.component';
import { OperationRealTimeFilterComponent } from './components/operation-real-time-filter/operation-real-time-filter.component';
import { OperationRealTimeFormationTableComponent } from './components/operation-real-time-formation-table/operation-real-time-formation-table.component';
import { OperationRealTimeSightingCallComponent } from './components/operation-real-time-sighting-call/operation-real-time-sighting-call.component';
import { OperationRealTimeLegendComponent } from './components/operation-real-time-legend/operation-real-time-legend.component';
import { OperationRealTimeOperationTableComponent } from './components/operation-real-time-operation-table/operation-real-time-operation-table.component';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeStore } from './stores/operation-real-time.store';
import { filterRealTimeOperations } from './utils/operation-real-time-filter.util';
import { selectSightingCallOperations } from './utils/select-sighting-call-operations.util';
import { formatRealTimeSummary } from './utils/operation-real-time-summary.util';

/** Tailwind の md。これ以上は運用順・編成順を横並び、未満はタブ */
const DESKTOP_QUERY = '(min-width: 768px)';

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
        OperationRealTimeSightingCallComponent,
    ],
})
export class OperationRealTimeComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #socketService = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #store = inject(OperationRealTimeStore);
    readonly #operationRealTimeService = inject(OperationRealTimeService);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #breakpointObserver = inject(BreakpointObserver);
    readonly #postDialog = inject(OperationPostDialogService);
    readonly #userState = inject(UserState);

    /** 最初の描画から正しい側を作るよう、初期値は同期で読む（違う配置が一瞬出ると CLS になる） */
    readonly isDesktop = toSignal(
        this.#breakpointObserver
            .observe(DESKTOP_QUERY)
            .pipe(map((state) => state.matches)),
        { initialValue: this.#breakpointObserver.isMatched(DESKTOP_QUERY) },
    );

    readonly isLoading = this.#store.isLoading;

    readonly #agencies = inject(AgencyListState).agencies;
    readonly #operations = this.#store.sortedOperations;
    readonly #formations = this.#store.sortedFormations;
    readonly #timeCrossSections =
        this.#store.operationSightingTimeCrossSections;
    readonly #selectedAgencyIds = this.#store.selectedAgencyIds;
    readonly #selectedGroupNames = this.#store.normalizedSelectedGroupNames;
    readonly #currentPositions = this.#store.currentPositions;
    readonly #sightingHistories = this.#store.operationSightingHistories;
    readonly #historiesFresh = this.#store.historiesFresh;

    readonly filterActive = computed(
        () =>
            this.#selectedAgencyIds().length > 0 ||
            this.#selectedGroupNames().length > 0,
    );
    readonly bandSummary = computed(() => {
        const operations = this.#operations();
        const shown = filterRealTimeOperations(
            operations,
            this.#selectedAgencyIds(),
            this.#selectedGroupNames(),
            this.#timeCrossSections(),
            this.#formations(),
        ).length;
        return formatRealTimeSummary({
            agencies: this.#agencies(),
            selectedAgencyIds: this.#selectedAgencyIds(),
            selectedGroupNames: this.#selectedGroupNames(),
            shown,
            total: operations.length,
        });
    });

    /** 目撃募集の帯の対象。運用順の一覧と同じ絞り込みを通してから選ぶ（並びも同じ） */
    readonly callOperations = computed(() => {
        // 圏外の保存から戻した古い履歴では選ばない（今日の履歴を取れてから）
        if (!this.#historiesFresh()) return [];
        return selectSightingCallOperations({
            operations: filterRealTimeOperations(
                this.#operations(),
                this.#selectedAgencyIds(),
                this.#selectedGroupNames(),
                this.#timeCrossSections(),
                this.#formations(),
            ),
            currentPositions: this.#currentPositions(),
            histories: this.#sightingHistories(),
        });
    });

    /** 目撃募集の札を出すか。0 件・viewer では出さない（札を描く行ごと消す） */
    readonly showCallChip = computed(
        () => this.callOperations().length > 0 && !this.#userState.isViewer(),
    );
    readonly #noCallOperations = computed(
        () => this.callOperations().length === 0,
    );
    /**
     * 札を押して運用順を募集中だけに絞っているか（2026-11 B3）。保存しない（ページを離れたら消える）。
     * 募集中が 0 件との境を跨いだら false に戻す。絞り中に 0 件になって自動で解けたあと、
     * 1 件以上に戻っても絞りは戻らない
     */
    readonly callOnly = linkedSignal<boolean, boolean>({
        // linkedSignal は source の値を比べず、読んだ signal が変われば computation を走らせる。
        // 毎分の更新で募集中の顔ぶれが変わるたびに解けないよう、0 件かどうかを computed で挟む
        source: this.#noCallOperations,
        computation: () => false,
    });
    /** 実際に効いている絞り（札が出ているときだけ。viewer には効かせない） */
    readonly callFilterActive = computed(
        () => this.callOnly() && this.showCallChip(),
    );
    /** 運用順の一覧へ渡す絞り。null なら絞らない */
    readonly callOperationNumbers = computed<ReadonlySet<string> | null>(() =>
        this.callFilterActive()
            ? new Set(this.callOperations().map((o) => o.operationNumber))
            : null,
    );

    onToggleCallFilter(): void {
        this.callOnly.update((on) => !on);
    }

    /** スマホのタブ（0: 運用順・1: 編成順）。目撃募集の札は運用順を絞るので、運用順のときだけ出す */
    readonly mobileTabIndex = signal(0);

    onMobileTabChange(index: number): void {
        this.mobileTabIndex.set(index);
    }

    onClearFilter(): void {
        this.#store.setSelectedAgencyIds([]);
        this.#store.setSelectedGroupNames([]);
    }

    openPost(): void {
        this.#postDialog.open('realtime_fab');
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
        const hasFetchedBefore = this.#store.hasFetchedOperations();
        this.#store.enableLoading();
        try {
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
                void this.#store.saveOfflineSnapshot('main', {});
            }

            if (this.#store.firstLoading()) {
                this.#store.setFinalUpdateTime();
                this.#store.setFirstLoading(false);
            }
        } catch (error) {
            console.error(error);
            // 保存した中身で戻せたら、そのページの知らせが出る。戻せなければ（取れた中身が手元にあって
            // 戻さなかったときも）今の失敗の文言を出す
            if (hasFetchedBefore || !(await this.#restoreSnapshot())) {
                this.#notification.open('データの取得に失敗しました', 'OK');
            }
        } finally {
            this.#store.disableLoading();
        }
    }

    /**
     * 保存した中身を戻す。戻せたら true。戻す処理が壊れていても、読み込み中を解けるよう握りつぶす
     * （自動更新・ソケット・再読み込みの失敗では呼ばない。最初の取得だけ）
     */
    async #restoreSnapshot(): Promise<boolean> {
        try {
            const restored = await this.#store.restoreOfflineSnapshot(
                'main',
                {},
            );
            return restored !== null;
        } catch {
            return false;
        }
    }

    hookEvent(): void {
        // 1秒ごとに現在位置の更新必要性を判定し、更新対象がある場合は更新する
        // this.#appRef.isStable.pipe(first((bool) => !!bool)).subscribe(() => {
        runIntervalInBrowser(1000, async () => {
            this.#store.enableLoading();
            try {
                await lastValueFrom(
                    this.#operationRealTimeService.fetchCurrentPositionThatShouldUpdate(),
                );
            } catch {
                // 毎秒通知しないよう黙って捨て、次の 1 秒で取り直す
            } finally {
                this.#store.disableLoading();
            }
        });
        // });

        // 自分が運用目撃情報を投稿したとき
        this.#operationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(async () => {
                this.#store.enableLoading();
                try {
                    await this.#reloadSightings();
                    this.#store.setFinalUpdateTime();
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    this.#store.disableLoading();
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
                if (!this.#store.isEnableAutoReload()) return;

                this.#notification.open('更新中...', 'OK');
                this.#store.enableLoading();
                try {
                    await this.#reloadSightings();
                    this.#store.setFinalUpdateTime();
                    this.#notification.open('データが更新されました', 'OK');
                } catch (error) {
                    console.error(error);
                    this.#notification.open('データの取得に失敗しました', 'OK');
                } finally {
                    this.#store.disableLoading();
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
