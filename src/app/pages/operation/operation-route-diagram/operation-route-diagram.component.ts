import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationSearchCardComponent } from 'src/app/shared/operation-search-card/operation-search-card.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { OperationRouteDiagramDrawingComponent } from './components/operation-route-diagram-drawing/operation-route-diagram-drawing.component';
import { OperationRouteDiagramRouteFilterComponent } from './components/operation-route-diagram-route-filter/operation-route-diagram-route-filter.component';
import { OperationRouteDiagramNavigateTimetable } from './interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from './services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from './stores/operation-route-diagram.store';
import { buildItineraryLinkLabels } from 'src/app/libs/operation/usecase/build-itinerary-link-labels.util';
import {
    reconnectTripOperationLists,
    withOutsideStationColumns,
} from './utils/operation-route-diagram-reconnect-trip-operation-lists.util';

OperationRouteDiagramStore.resetLoading();

@Component({
    selector: 'app-operation-route-diagram',
    templateUrl: './operation-route-diagram.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        EmptyStateComponent,
        OperationRouteDiagramRouteFilterComponent,
        OperationRouteDiagramDrawingComponent,
        OperationSearchCardComponent,
        SkeletonBarComponent,
    ],
})
export class OperationRouteDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    #fetchSeq = 0;
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
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
    /** 検索カードに出すダイヤと運用。取得し直す間も前の値を出し続ける。 */
    readonly searchCalendarId = toSignal(
        OperationRouteDiagramStore.calendar$.pipe(
            filter((calendar) => !!calendar),
            map((calendar) => calendar.calendarId),
        ),
        { initialValue: null },
    );
    readonly searchOperationId = toSignal(
        OperationRouteDiagramStore.operation$.pipe(
            filter((operation) => !!operation),
            map((operation) => operation.operationId),
        ),
        { initialValue: null },
    );

    readonly calendar = toSignal(OperationRouteDiagramStore.calendar$);
    readonly operation = toSignal(OperationRouteDiagramStore.operation$);
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

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const operationId = paramMap.get('operation_id');

                OperationRouteDiagramStore.setOperationId(operationId);
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

        const seq = ++this.#fetchSeq;
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
        try {
            await lastValueFrom(
                this.#operationRouteDiagramService.fetchItineraryLinks(),
            );
        } catch {
            OperationRouteDiagramStore.setItineraryLinks([]);
        }

        // 取得に失敗しても読み込み中を解く（進捗バーが出たまま止まらないように）
        OperationRouteDiagramStore.initializeSelectedRouteIds();
        OperationRouteDiagramStore.disableLoading();
        // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
        if (seq === this.#fetchSeq) {
            OperationRouteDiagramStore.setHasFetchedOperationTrips(true);
        }

        const failure = results.find(
            (result): result is PromiseRejectedResult =>
                result.status === 'rejected',
        );
        if (failure) {
            throw failure.reason;
        }
    }
}
