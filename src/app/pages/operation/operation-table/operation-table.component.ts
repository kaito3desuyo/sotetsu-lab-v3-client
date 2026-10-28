import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { calendarCacheTag } from 'src/app/core/ssr/cache-control';
import { afterFirstRender } from 'src/app/core/ssr/first-render';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { formatPageTitle } from 'src/app/core/utils/format-page-title.util';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { OperationTableCardComponent } from './components/operation-table-card/operation-table-card.component';
import { OperationTableFilterComponent } from './components/operation-table-filter/operation-table-filter.component';
import { OperationTableService } from './services/operation-table.service';
import { OperationTableStore } from './stores/operation-table.store';
import {
    deriveGroupName,
    matchesGroupFilter,
} from 'src/app/shared/operation-group.util';
import { buildItineraryLinkLabels } from 'src/app/libs/operation/usecase/build-itinerary-link-labels.util';
import { isTransferEnd } from 'src/app/libs/operation/usecase/transfer-marker.util';
import { formatOperationTableSummary } from './utils/operation-table-summary.util';

/** 絞り込み無し。fallback を毎回作らないよう 1 つに */
const NO_GROUP_NAMES: string[] = [];

@Component({
    selector: 'app-operation-table',
    templateUrl: './operation-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        OperationTableFilterComponent,
        OperationTableCardComponent,
        SkeletonBarComponent,
    ],
})
export class OperationTableComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);
    readonly #store = inject(OperationTableStore);
    readonly #operationTableService = inject(OperationTableService);
    readonly #calendarListState = inject(CalendarListState);
    readonly #todaysCalendarListState = inject(TodaysCalendarListState);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #ssrResponse = inject(SsrResponse);
    readonly #pageMeta = inject(PageMeta);

    readonly isLoading = this.#store.isLoading;
    readonly calendarId = this.#store.calendarId;
    readonly calendar = this.#store.calendar;
    readonly calendars = this.#calendarListState.calendars;
    readonly operationTrips = this.#store.sortedOperationTrips;
    readonly itineraryLinks = this.#store.itineraryLinks;
    readonly stations = this.#store.stations;
    readonly tripClasses = this.#store.tripClasses;
    /** 端末に保存した運用群の絞り込み。サーバーは保存を読めないので、最初の描画は絞らない形（spec 13.2） */
    readonly selectedGroupNames = afterFirstRender(
        this.#store.normalizedSelectedGroupNames,
        NO_GROUP_NAMES,
    );

    readonly hasFetchedOperationTrips = this.#store.hasFetchedOperationTrips;
    /** 骨組みのカードの数。1440px で 4 面 × 2 段あれば画面 1 枚分を埋める */
    readonly skeletonCards = Array.from({ length: 8 }, (_, i) => i);
    /** サーバーで中身まで描くカードの数。1440px で 1 段目の 4 面。カードは縦に長く 1 段で画面が埋まる（2026-10-28 実測） */
    readonly SERVER_RENDERED_CARDS = 4;
    /** 骨組みのカード 1 枚の列車の行の数 */
    readonly skeletonRows = Array.from({ length: 12 }, (_, i) => i);

    readonly isEmpty = computed(
        () =>
            this.hasFetchedOperationTrips() &&
            !!this.calendar() &&
            this.operationTrips().length === 0,
    );

    readonly filterActive = computed(
        () => this.selectedGroupNames().length > 0,
    );
    /** 端末に保存した畳み状態。サーバーは保存を読めないので、最初の描画は開いた形（spec 13.2） */
    readonly controlCollapsed = afterFirstRender(
        this.#store.controlCollapsed,
        false,
    );

    readonly bandSummary = computed(() => {
        const trips = this.operationTrips();
        const shown = trips.filter((t) =>
            matchesGroupFilter(
                t.operation.operationNumber,
                this.selectedGroupNames(),
            ),
        ).length;
        return formatOperationTableSummary({
            calendar: this.calendar(),
            selectedGroupNames: this.selectedGroupNames(),
            shown,
            total: trips.length,
        });
    });

    onControlCollapsedChange(collapsed: boolean): void {
        this.#store.setControlCollapsed(collapsed);
    }

    onClearFilter(): void {
        this.#store.setSelectedGroupNames([]);
    }

    /** 題名。ダイヤは取ったデータから作る */
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('運用表', [
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });

    constructor() {
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        effect(() => this.#pageMeta.setTitle(this.pageTitle()));

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                // サーバーでは今日のダイヤで補わない。今日を取っていないので、取りにも行かず骨組みのまま返す
                if (this.#isServer && !paramMap.get('calendar_id')) return;

                const calendarId =
                    paramMap.get('calendar_id') ??
                    this.#todaysCalendarListState.todaysCalendarId();

                // モック 03: 無パラメータ時は今日の calendar_id へフォールバックし、
                // 初回からカードを表示する（train-diagram と同一の replaceUrl 方式）
                if (!paramMap.get('calendar_id') && calendarId) {
                    this.#handleNavigationResult(
                        this.#router.navigate(
                            ['/operation/table', { calendar_id: calendarId }],
                            { replaceUrl: true },
                        ),
                    );
                    return;
                }

                if (calendarId) {
                    this.#ssrResponse.addCacheTags([
                        calendarCacheTag(calendarId),
                    ]);
                }
                this.#store.setCalendarId(calendarId ?? null);

                this.fetchData();
            });
    }

    async fetchData(): Promise<void> {
        const seq = this.#store.nextFetchSeq();
        const conditions = { calendarId: this.#store.calendarId() };
        this.#store.enableLoading();
        this.#store.setHasFetchedOperationTrips(false);

        // 5 つは互いに依存しないので並行に取る。カードは全部そろってから 1 回だけ描く
        // （順に取ると、届くたびに 104 枚・2,500 行余りを描き直していた）
        const results = await Promise.allSettled([
            lastValueFrom(this.#operationTableService.fetchCalendar()),
            lastValueFrom(this.#operationTableService.fetchOperationTrips()),
            lastValueFrom(this.#operationTableService.fetchStations()),
            lastValueFrom(this.#operationTableService.fetchTripClasses()),
        ]);
        // 前後の運用が取れなくても運用表は出す（つながりを出さないだけ）。
        // 上の 4 つとは別に取り、失敗しても throw の対象にしない
        let hasFetchedItineraryLinks = true;
        const linksPromise = lastValueFrom(
            this.#operationTableService.fetchItineraryLinks(),
        ).catch(() => {
            hasFetchedItineraryLinks = false;
        });

        const failure = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );

        // 取得に失敗しても読み込み中を解く。取れなかったときは、同じダイヤで保存した中身で
        // カードを出す（取得がすべて終わってから戻す。遅れて届いた成功が戻した中身を上書きしないように）
        await linksPromise;
        if (failure) {
            // 古い取得の失敗では戻さない。戻す処理が壊れていても、読み込み中は必ず解く
            if (this.#store.isLatestFetch(seq)) {
                try {
                    await this.#store.restoreOfflineSnapshot(
                        'main',
                        conditions,
                    );
                } catch {
                    // 保存した中身が壊れていても、取得の失敗をそのまま投げる
                }
            }
        } else if (hasFetchedItineraryLinks && this.#store.isLatestFetch(seq)) {
            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            void this.#store.saveOfflineSnapshot('main', conditions);
        }
        this.#store.disableLoading();
        // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
        if (this.#store.isLatestFetch(seq)) {
            this.#store.setHasFetchedOperationTrips(true);
        }

        if (failure) {
            throw failure.reason;
        }
    }

    /**
     * 運用群はリアルタイム運用情報と同じく運用番号から導く（shared/operation-group.util）。
     * API `/v3/operations/groups` は 15 群のうち 5 群しか返さないので使わない。
     */
    isCardVisible(operationNumber: string): boolean {
        return matchesGroupFilter(operationNumber, this.selectedGroupNames());
    }

    /**
     * @defer の場所取りの高さ。カードと同じく、見出しと上下の余白（計 63px）+ 列車 1 本 32px
     * + 同じ向きへ続けて走る所のつなぎの行 8px（operation-table-card と同じ判定）。
     * 前後の運用の文言（text-xs = 行の高さ 16px。カードと同じ buildItineraryLinkLabels で数える）:
     * 頭 = 上余白 8px（pt-2）+ 16px = 24px、末尾 = 下余白 8px（pb-2）+ 16px = 24px、
     * 列車の途中の切り替え = 下余白 4px（pb-1）+ 16px = 20px を 1 件ごと。
     */
    placeholderHeight(operationTrip: OperationTripsDto): number {
        const trips = operationTrip.trips.map(({ trip }) => trip);
        const itineraryLinks = this.itineraryLinks();
        const transferAt = (index: number, side: 'in' | 'out'): boolean =>
            isTransferEnd({
                side,
                tripOperationListId:
                    operationTrip.trips[index].tripOperationListId,
                tripId: trips[index].tripId,
                links: itineraryLinks,
            });
        const links = trips.filter((trip, index) => {
            const next = trips[index + 1];
            return (
                !!next &&
                !trip.depotIn &&
                !next.depotOut &&
                !transferAt(index, 'in') &&
                !transferAt(index + 1, 'out') &&
                next.tripDirection === trip.tripDirection
            );
        }).length;
        const labels = buildItineraryLinkLabels({
            operationId: operationTrip.operation.operationId,
            tripIds: trips.map((trip) => trip.tripId),
            links: itineraryLinks,
            stationNameById: () => '',
        });
        const labelHeight =
            (labels.from ? 24 : 0) +
            (labels.to ? 24 : 0) +
            Object.values(labels.midTrip).reduce(
                (sum, mid) => sum + (mid.from ? 20 : 0) + (mid.to ? 20 : 0),
                0,
            );
        return 63 + trips.length * 32 + links * 8 + labelHeight;
    }

    /** カードヘッダの群バッジ。導けない運用番号なら undefined（バッジ非表示）。 */
    groupNameFor(operationNumber: string): string | undefined {
        return deriveGroupName(operationNumber) ?? undefined;
    }

    /** ダイヤ select 変更で calendar_id を差し替えて再取得する（モック 03） */
    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.calendarId()) return;

        this.#handleNavigationResult(
            this.#router.navigate([
                '/operation/table',
                { calendar_id: calendarId },
            ]),
        );
    }

    #handleNavigationResult(navigation: Promise<boolean>): void {
        navigation
            .then((succeeded) => {
                if (!succeeded) {
                    console.error(
                        'operation table navigation did not complete',
                    );
                    this.#notificationService.open(
                        'ページの遷移に失敗しました',
                        'OK',
                    );
                }
            })
            .catch((error) => {
                console.error('operation table navigation failed', error);
                this.#notificationService.open(
                    'ページの遷移に失敗しました',
                    'OK',
                );
            });
    }
}
