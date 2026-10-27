import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    linkedSignal,
} from '@angular/core';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs/operators';
import { lastValueFrom, of } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { calendarCacheTag } from 'src/app/core/ssr/cache-control';
import { afterFirstRender } from 'src/app/core/ssr/first-render';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { formatPageTitle } from 'src/app/core/utils/format-page-title.util';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { joinSummaryParts } from 'src/app/shared/control-band/control-band-summary.util';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import {
    findNeighborOperations,
    toOperationSelectOptions,
} from 'src/app/shared/operation-select-options.util';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { StepNavComponent } from 'src/app/shared/step-nav/step-nav.component';
import { StepTarget } from 'src/app/shared/step-nav/step-target.type';
import { TodayCalendarButtonComponent } from 'src/app/shared/today-calendar-button/today-calendar-button.component';
import { OperationRouteDiagramDrawingComponent } from './components/operation-route-diagram-drawing/operation-route-diagram-drawing.component';
import { OperationRouteDiagramRouteFilterComponent } from './components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component';
import { OperationRouteDiagramNavigateTimetable } from './interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import {
    OperationRouteDiagramSnapshot,
    OperationRouteDiagramStore,
} from './stores/operation-route-diagram.store';
import { buildItineraryLinkLabels } from 'src/app/libs/operation/usecase/build-itinerary-link-labels.util';
import {
    reconnectTripOperationLists,
    withOutsideStationColumns,
} from './utils/operation-route-diagram-reconnect-trip-operation-lists.util';

OperationRouteDiagramStore.resetLoading();

// 取得の世代番号。ストアと同じくモジュールに置き、ページのインスタンスをまたいで一意にする
// （離れてすぐ戻ったとき、前のインスタンスの取得の終わりが新しい骨組みを消さないように）
let fetchSeq = 0;
// ダイヤの替えの世代番号（同じ理由でモジュールに置く）
let calendarChangeSeq = 0;

/** 圏外のために保存する中身のキー */
const OFFLINE_SNAPSHOT_KEY = 'OperationRouteDiagram';

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        MatFormFieldModule,
        MatSelectModule,
        DateFnsPipe,
        EmptyStateComponent,
        OperationRouteDiagramRouteFilterComponent,
        OperationRouteDiagramDrawingComponent,
        SkeletonBarComponent,
        StepNavComponent,
        TodayCalendarButtonComponent,
    ],
})
export class OperationRouteDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );
    readonly #operationService = inject(OperationService);
    readonly #notification = inject(NotificationService);
    readonly #offlineSnapshots = inject(OfflineSnapshots);
    readonly #ssrResponse = inject(SsrResponse);
    readonly #pageMeta = inject(PageMeta);
    readonly calendars = inject(CalendarListState).calendars;
    /** 今日のダイヤ。サーバーは今日を取らないので、最初の描画は無い形（spec 5.2） */
    readonly #todaysCalendarId = afterFirstRender(
        inject(TodaysCalendarListState).todaysCalendarId,
        undefined,
    );

    readonly isLoading = toSignal(OperationRouteDiagramStore.isLoading$);
    readonly isAwaitingOperationTrips = toSignal(
        OperationRouteDiagramStore.isAwaitingOperationTrips$,
        { initialValue: false },
    );
    /** 骨組みの縦書きの駅名の列の数（スマホ幅で横にあふれない数） */
    readonly skeletonStationColumns = Array.from({ length: 8 }, (_, i) => i);
    /** 骨組みの列車の線の数 */
    readonly skeletonTripRows = Array.from({ length: 10 }, (_, i) => i);
    readonly calendar = toSignal(OperationRouteDiagramStore.calendar$);
    readonly operation = toSignal(OperationRouteDiagramStore.operation$);
    /** URL の運用。運用番号を外したら選択欄も空にする */
    readonly searchOperationId = toSignal(
        OperationRouteDiagramStore.operationId$,
        { initialValue: null },
    );

    /**
     * 帯で選んでいるダイヤ（2026-10-22。検索カードから帯へ寄せた）。
     * - 届いた運用のダイヤが替わったら、そのダイヤにする（「戻る」で前の運用に戻ったときも）
     * - 運用を開いて取り終える前は、今日のダイヤに補わない（今日の一覧を余分に取らない）
     * - 運用が無いときは今日のダイヤ。ダイヤだけ替えて同じ運用番号が無かったときは、選んだダイヤを残す
     */
    readonly selectedCalendarId = linkedSignal<
        {
            calendarId: string | undefined;
            operationId: string | null;
            todaysCalendarId: string | undefined;
        },
        string | null
    >({
        source: () => ({
            calendarId: this.calendar()?.calendarId,
            operationId: this.searchOperationId(),
            todaysCalendarId: this.#todaysCalendarId(),
        }),
        computation: (source, previous) => {
            if (
                source.calendarId &&
                source.calendarId !== previous?.source.calendarId
            ) {
                return source.calendarId;
            }
            if (previous?.value) return previous.value;
            if (source.operationId) return source.calendarId ?? null;
            return source.todaysCalendarId ?? null;
        },
    });

    /** 帯の運用番号の選択肢（検索カードと同じ並び）。 */
    readonly operationOptions = toSignal(
        toObservable(this.selectedCalendarId).pipe(
            switchMap((calendarId) =>
                calendarId
                    ? this.#operationService
                          .findManyByCalendarId({ calendarId })
                          .pipe(catchError(() => of([])))
                    : of([]),
            ),
            map(toOperationSelectOptions),
        ),
        { initialValue: [] },
    );

    readonly neighborOperations = computed(() =>
        findNeighborOperations(
            this.operationOptions(),
            this.searchOperationId(),
        ),
    );

    readonly #rawTripOperationLists = toSignal(
        OperationRouteDiagramStore.tripOperationLists$,
    );
    // B5: 路線チップ絞り込み前の全駅順（再接続の基準になる）。
    readonly #allStations = toSignal(OperationRouteDiagramStore.stations$);
    // B5: 路線チップの選択状態で絞り込んだ表示駅リスト（縦軸）。
    readonly #visibleStations = toSignal(
        OperationRouteDiagramStore.visibleStations$,
    );

    // B5: 路線チップ OFF で縦軸から消えた駅を始発/終着に持つ行路を、表示中の列へ
    // 付け替える。表示中の駅より外の駅は端の「図外」の列、間の駅はその位置の「図外」の列。
    // SVG 描画（drawing）の座標系・findById による index 計算は
    // 一切変更せず、その入力となる駅 ID をここで付け替えるだけに留める。
    readonly tripOperationLists = computed(() => {
        const raw = this.#rawTripOperationLists();
        if (!raw) return raw;

        return reconnectTripOperationLists(
            raw,
            this.#allStations() ?? [],
            this.#visibleStations() ?? [],
        );
    });

    // 縦軸。図外の列を使う行路があるときだけ、その位置に「図外」の列を足す。
    readonly stations = computed(() => {
        const visibleStations = this.#visibleStations();
        if (!visibleStations) return visibleStations;

        return withOutsideStationColumns(
            visibleStations,
            this.tripOperationLists() ?? [],
        );
    });

    readonly itineraryLinks = toSignal(
        OperationRouteDiagramStore.itineraryLinks$,
        { initialValue: [] },
    );

    /** 前後の運用の文言（運用表と同じ）。図の中の点の横に描く */
    readonly linkLabels = computed(() => {
        const operation = this.operation();
        const trips = this.#rawTripOperationLists() ?? [];
        if (!operation) return null;

        const stationNames = new Map(
            (this.#allStations() ?? []).map((s) => [
                s.stationId,
                s.stationName,
            ]),
        );
        return buildItineraryLinkLabels({
            operationId: operation.operationId,
            tripIds: trips.map(({ trip }) => trip.tripId),
            links: this.itineraryLinks(),
            stationNameById: (id) => stationNames.get(id) ?? '',
        });
    });

    readonly drawingDisplayed = computed(
        () =>
            !!this.calendar() &&
            !!this.operation() &&
            !!this.stations()?.length &&
            !!this.tripOperationLists(),
    );

    /** 要約の頭「43G運 2026/3/14改正 平日ダイヤ」。運用が無いときは選んでいるダイヤだけ */
    readonly summaryLead = computed(() => {
        const operationNumber = this.operation()?.operationNumber;
        const calendar =
            this.calendar() ??
            this.calendars().find(
                (c) => c.calendarId === this.selectedCalendarId(),
            );
        return joinSummaryParts([
            operationNumber ? `${operationNumber}運` : null,
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });

    onOperationChange(operationId: string): void {
        notifyNavigationFailure(
            this.#router.navigate([
                '/operation/route-diagram',
                { operation_id: operationId },
            ]),
            this.#notification,
        );
    }

    onStep(target: StepTarget): void {
        this.onOperationChange(target.id);
    }

    /**
     * 同じ運用番号が新しいダイヤにあればその運用へ、無ければ運用番号を外す。
     * 運用を開いていないときは選択肢を替えるだけ（同じ URL へは移れない）
     */
    async onCalendarChange(calendarId: string): Promise<void> {
        const previousCalendarId = this.selectedCalendarId();
        if (!calendarId || calendarId === previousCalendarId) return;
        // URL の運用の番号（読み込み中でも前の運用の番号で探さない）
        const operationId = this.searchOperationId();
        const operationNumber =
            this.operationOptions().find((o) => o.operationId === operationId)
                ?.operationNumber ??
            (this.operation()?.operationId === operationId
                ? this.operation()?.operationNumber
                : undefined);
        this.selectedCalendarId.set(calendarId);
        if (!operationNumber) return;

        // 続けて替えたとき、先に選んだダイヤの結果で移らない
        const seq = ++calendarChangeSeq;
        let operations: OperationDetailsDto[];
        try {
            operations = await lastValueFrom(
                this.#operationService.findManyByCalendarId({ calendarId }),
            );
        } catch {
            if (seq !== calendarChangeSeq) return;
            // 「その番号が無い」と取り違えないよう、移らずに知らせて選択を戻す
            this.selectedCalendarId.set(previousCalendarId);
            this.#notification.open('運用の一覧を取得できませんでした', 'OK');
            return;
        }
        if (seq !== calendarChangeSeq) return;
        const same = operations.find(
            (o) => o.operationNumber === operationNumber,
        );
        notifyNavigationFailure(
            this.#router.navigate(
                same
                    ? [
                          '/operation/route-diagram',
                          { operation_id: same.operationId },
                      ]
                    : ['/operation/route-diagram'],
            ),
            this.#notification,
        );
    }

    /** 題名。運用番号とダイヤは取ったデータから作る */
    readonly pageTitle = computed(() => {
        const calendar = this.calendar();
        return formatPageTitle('運用行路図', [
            this.operation()?.operationNumber,
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });

    constructor() {
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        effect(() => this.#pageMeta.setTitle(this.pageTitle()));

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const operationId = paramMap.get('operation_id');

                OperationRouteDiagramStore.setOperationId(operationId);
                // 運用番号を外したとき（ダイヤを替えて同じ番号が無かった）、前の運用の図を残さない（2026-10-22）
                if (!operationId)
                    OperationRouteDiagramStore.setOperationTrips(null);
                this.fetchData();
            });
    }

    onClickNavigateTimetable(ev: OperationRouteDiagramNavigateTimetable): void {
        this.#router.navigate([
            '/timetable',
            'all-line',
            {
                calendar_id: OperationRouteDiagramStore.calendarId,
                trip_block_id: ev.tripBlockId,
                trip_direction: ev.tripDirection,
            },
        ]);
    }

    /** G12: 空状態（運用番号未設定）の次アクション。運用表へ誘導する。 */
    onEmptyStateActionClick(): void {
        this.#router.navigate(['/operation/table']);
    }

    async fetchData(): Promise<void> {
        if (!OperationRouteDiagramStore.operationId) return;

        const seq = ++fetchSeq;
        const conditions = {
            operationId: OperationRouteDiagramStore.operationId,
        };
        OperationRouteDiagramStore.enableLoading();
        OperationRouteDiagramStore.setHasFetchedOperationTrips(false);

        // 列車と駅は互いに依存しないので並行に取る
        const results = await Promise.allSettled([
            lastValueFrom(
                this.#operationRouteDiagramService.fetchOperationTrips(),
            ),
            lastValueFrom(this.#operationRouteDiagramService.fetchStations()),
        ]);

        // 前後の運用はダイヤが分かってから取る。取れなくても行路図は出す
        let hasFetchedItineraryLinks = true;
        try {
            await lastValueFrom(
                this.#operationRouteDiagramService.fetchItineraryLinks(),
            );
        } catch {
            hasFetchedItineraryLinks = false;
            OperationRouteDiagramStore.setItineraryLinks([]);
        }

        const failure = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );
        if (failure) {
            // 通信できないときは、同じ運用で保存した中身を出す（古い取得の失敗では戻さない）。
            // 取得がすべて終わってから戻す（遅れて届いた成功が、戻した中身を上書きしないように）
            // 戻す処理が壊れていても、読み込み中は必ず解く
            if (seq === fetchSeq) {
                try {
                    await this.#offlineSnapshots.restore({
                        key: OFFLINE_SNAPSHOT_KEY,
                        conditions,
                        apply: (data: OperationRouteDiagramSnapshot) =>
                            OperationRouteDiagramStore.restoreSnapshot(data),
                    });
                } catch {
                    // 保存した中身が壊れていても、取得の失敗をそのまま投げる
                }
            }
        } else if (hasFetchedItineraryLinks && seq === fetchSeq) {
            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            void this.#offlineSnapshots.save({
                key: OFFLINE_SNAPSHOT_KEY,
                conditions,
                data: OperationRouteDiagramStore.snapshot(),
            });
        }

        // 運用の URL にダイヤは無い。取った運用のダイヤでタグを付ける（その時刻表が書き換わったら失効）
        const calendarId = OperationRouteDiagramStore.calendarId;
        if (calendarId) {
            this.#ssrResponse.addCacheTags([calendarCacheTag(calendarId)]);
        }

        // 取得に失敗しても読み込み中を解く（進捗バーが出たまま止まらないように）
        OperationRouteDiagramStore.initializeSelectedRouteIds();
        OperationRouteDiagramStore.disableLoading();
        // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
        if (seq === fetchSeq) {
            OperationRouteDiagramStore.setHasFetchedOperationTrips(true);
        }

        if (failure) {
            throw failure.reason;
        }
    }
}
