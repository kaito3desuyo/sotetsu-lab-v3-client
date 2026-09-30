import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import {
    enforceMinimumRowGap,
    StationAxis,
    StationAxisEntry,
} from 'src/app/shared/diagram-scale';
import { findContinuations } from 'src/app/shared/train-position.util';
import { TrainDiagramControllerComponent } from './components/train-diagram-controller/train-diagram-controller.component';
import { TrainDiagramInfoPanelComponent } from './components/train-diagram-info-panel/train-diagram-info-panel.component';
import { TrainDiagramLegendComponent } from './components/train-diagram-legend/train-diagram-legend.component';
import {
    DiagramJumpRequest,
    DiagramStationRow,
    TrainDiagramChartComponent,
} from './components/train-diagram-chart/train-diagram-chart.component';
import { TrainDiagramSelectedTripInfo } from './interfaces/train-diagram-selected-trip-info.interface';
import { TrainDiagramService } from './services/train-diagram.service';
import {
    DiagramDirectionFilter,
    TrainDiagramStore,
} from './stores/train-diagram.store';
import {
    buildChainDiagramLines,
    buildChainStopIndexObservations,
} from './utils/build-chain-diagram-lines.util';
import { buildStandardRunMinutes } from './utils/estimate-passing-times.util';
import { TripDiagramLine } from './utils/build-trip-diagram-line.util';
import { filterTripBlocksByDirection } from './utils/filter-trip-blocks-by-direction.util';
import {
    fitStationAxisToTrips,
    hasObservationByGap,
    StationAxisObservation,
} from './utils/fit-station-axis.util';
import {
    AXIS_PX_PER_MINUTE_MAX,
    AXIS_PX_PER_MINUTE_MIN,
    DEFAULT_AXIS_PX_PER_MINUTE,
    DEFAULT_PX_PER_MINUTE,
    DIAGRAM_START_HOUR,
    defaultStartMinute,
    formatTimeParam,
    nextZoomStep,
    parseLegacyWindowParam,
    parseTimeParam,
    railwayMinuteOfDay,
    resolveAxisPxPerMinute,
} from './utils/diagram-timeline.util';
import { findTurnbacks, Turnback } from './utils/find-turnbacks.util';
import {
    ensureTurnbackClearance,
    TurnbackClearanceResult,
} from './utils/ensure-turnback-clearance.util';
import { TurnbackLink } from './utils/layout-turnback-links.util';
import { mergeSameDirectionContinuations } from './utils/merge-same-direction-continuations.util';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TrainDiagramStore.resetLoading();

const BODY_TOP_PADDING = 12;
const BODY_BOTTOM_PADDING = 24;
/**
 * 駅ラベル行の最小ピクセル高さ（G7: 駅軸ラベルの重なり解消）。
 * 12px の tw-text-xs ラベルが重ならない最小値（Task 13 フィックス: 22→16。
 * ラベルは [style.top.px]="row.y - 6" で行の中心に来るため、16px 間隔でも
 * ラベル同士の間に 4px 残り重ならない）。所要時間比は維持しつつ、
 * 高速通過区間で駅間隔が潰れる場合のみこの値まで底上げする（enforceMinimumRowGap）。
 * また、縦の縮尺が自動（axisPxPerMinute が null）のときは、この値ぴったりに
 * 観測のある駅間の最小所要分を合わせる基準にもなる（#effectiveAxisPxPerMinute）。
 */
const MIN_ROW_HEIGHT_PX = 16;

/** Task 14: 折り返しの⊐字リンクの段の深さの刻み幅（px）。段 k（0始まり）の深さ=(k+1)×この値。 */
const TURNBACK_LANE_STEP_PX = 4;

/**
 * task-17（ユーザー指示: 「折り返し線がある行はある程度高さを確保しておいたほうがいい」）:
 * ⊐字リンクの張り出しの深さに対して、隣の行との隙間に確保する最小の余白（px）。
 */
const TURNBACK_MIN_CLEARANCE_PX = 8;

/** highlightedTripIds の既定値（何も選んでいないとき）。参照を使い回して余計な再計算を避ける。 */
const EMPTY_TRIP_ID_SET: ReadonlySet<string> = new Set();

@Component({
    selector: 'app-train-diagram',
    templateUrl: './train-diagram.component.html',
    styleUrl: './train-diagram.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        EmptyStateComponent,
        TrainDiagramControllerComponent,
        TrainDiagramLegendComponent,
        TrainDiagramChartComponent,
        TrainDiagramInfoPanelComponent,
    ],
})
export class TrainDiagramComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #location = inject(Location);
    readonly #timetableDiagramService = inject(TrainDiagramService);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);

    readonly isLoading = toSignal(TrainDiagramStore.isLoading$);
    readonly calendarId = toSignal(TrainDiagramStore.calendarId$, {
        initialValue: null,
    });
    readonly selectedRouteIds = toSignal(TrainDiagramStore.selectedRouteIds$, {
        initialValue: [],
    });
    readonly pxPerMinute = toSignal(TrainDiagramStore.pxPerMinute$, {
        initialValue: DEFAULT_PX_PER_MINUTE,
    });
    /**
     * Task 13 フィックス: 縦の縮尺の手動値（Ctrl+ホイール・ピンチで明示的に入れた値）。
     * null = 自動。実際に使う縮尺は #effectiveAxisPxPerMinute（自動時は観測のある
     * 駅間の最小所要分から決める）。
     */
    readonly axisPxPerMinute = toSignal(TrainDiagramStore.axisPxPerMinute$, {
        initialValue: null,
    });
    readonly jumpRequest = signal<DiagramJumpRequest | null>(null);
    #jumpSeq = 0;

    /**
     * Task 13: 情報カード（train-diagram-info-panel）の自身の高さ（ResizeObserver 由来）。
     * カードを閉じたら 0 に戻す。chart の bottomInset（図の下の余白）の元になる。
     */
    readonly infoPanelHeight = signal(0);
    /** 選択中はカードの高さ + 16、それ以外は 0（カードで図の下が隠れないための余白）。 */
    readonly bottomInset = computed(() =>
        this.selectedTripId() ? this.infoPanelHeight() + 16 : 0,
    );

    /** 1 秒ごとの時計（今日のダイヤのときの現在時刻の線と「今」ボタン用） */
    readonly #now = toSignal(interval(1000).pipe(map(() => new Date())), {
        initialValue: new Date(),
    });

    readonly directionFilter = toSignal(TrainDiagramStore.directionFilter$, {
        initialValue: 'both' as DiagramDirectionFilter,
    });
    readonly stationAxis = toSignal(TrainDiagramStore.stationAxis$, {
        initialValue: null,
    });
    readonly tripBlocksByDirection = toSignal(
        TrainDiagramStore.tripBlocksByDirection$,
        { initialValue: {} },
    );
    /**
     * 方向フィルタ（上り/下り/両方）で絞り込んだ tripBlocksByDirection。chart には
     * この絞り込み済み Record を渡すことで chart 側を変更せずに描画列車を絞る。
     */
    readonly filteredTripBlocksByDirection = computed(() =>
        filterTripBlocksByDirection(
            this.tripBlocksByDirection(),
            this.directionFilter(),
        ),
    );
    readonly selectedTripId = toSignal(TrainDiagramStore.selectedTripId$, {
        initialValue: null,
    });
    /**
     * 選んだ列車が属するつながり（種別変更・列番変更で継走する列車）の全 tripId。
     * chart はこの集合の線をまとめて強調する。情報カードは selectedTripId（押した列車）のまま。
     */
    readonly highlightedTripIds = computed<ReadonlySet<string>>(() => {
        const tripId = this.selectedTripId();
        if (!tripId) {
            return EMPTY_TRIP_ID_SET;
        }
        return this.tripIdsByChainOf().get(tripId) ?? new Set([tripId]);
    });
    /**
     * G12: 表示条件（路線/方向/ダイヤ）に一致する列車が1本も無いか（ロード完了後のみ判定）。
     * mockup-07 の空状態を chart の代わりに表示する。
     */
    readonly isEmpty = computed(() => {
        if (this.isLoading()) return false;
        return !Object.values(this.filteredTripBlocksByDirection())
            .flat()
            .some((block) => (block.trips?.length ?? 0) > 0);
    });
    readonly operationSightingTimeCrossSections = toSignal(
        TrainDiagramStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );

    readonly todaysCalendarIds = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarIds$,
        { initialValue: [] },
    );
    readonly #routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly isTodaySelected = computed(() =>
        this.todaysCalendarIds().includes(this.calendarId() ?? ''),
    );

    readonly nowMinute = computed(() =>
        this.isTodaySelected() ? railwayMinuteOfDay(this.#now()) : null,
    );

    /**
     * 全ルートの駅から stationId → 駅名 のマップを作る。行き先（trip 最終駅）は
     * 表示中の路線軸外（直通先の他社線駅）になりうるため、軸ではなく全駅から引く。
     */
    readonly #stationNameById = computed(() => {
        const map = new Map<string, string>();
        for (const route of this.#routeStations()) {
            for (const rsl of route.routeStationLists ?? []) {
                const station = rsl.station;
                if (station?.stationId && station.stationName) {
                    map.set(station.stationId, station.stationName);
                }
            }
        }
        return map;
    });

    /**
     * Task 13: 表示中の列車（#chains。方向フィルタ後）の走行区間から観測を作る
     * （分断されていない隣り合う2停車ごとに1件。同じ駅の2行間の跳びは含まない）。
     * データ・路線・方向が変わったときだけ作り直す。
     */
    readonly #chainObservations = computed<StationAxisObservation[]>(() => {
        const axis = this.stationAxis();
        if (!axis) return [];
        const axisStationOrder = axis.map((entry) => entry.stationId);
        const byChain = this.#observationCacheFor(
            this.tripBlocksByDirection(),
            axisStationOrder.join(','),
        );
        return this.#chains().flatMap((chain) => {
            const key = chain.map((trip) => trip.tripId).join('>');
            let observations = byChain.get(key);
            if (observations === undefined) {
                observations = buildChainStopIndexObservations(
                    chain,
                    axisStationOrder,
                );
                byChain.set(key, observations);
            }
            return observations;
        });
    });

    /**
     * つながりごとの観測の覚え書き。観測は列車の times と駅の並びだけで決まり、方向フィルタに
     * よらない（「両方」のつながりは「上り」「下り」のつながりの和）ため、方向を切り替えても
     * 作り直さずに済む（task-23）。列車データか駅の並びが変わったら捨てる。
     */
    #observationCache: {
        source: unknown;
        axisKey: string;
        byChain: Map<string, StationAxisObservation[]>;
    } | null = null;

    #observationCacheFor(
        source: unknown,
        axisKey: string,
    ): Map<string, StationAxisObservation[]> {
        const cache = this.#observationCache;
        if (cache && cache.source === source && cache.axisKey === axisKey) {
            return cache.byChain;
        }
        const byChain = new Map<string, StationAxisObservation[]>();
        this.#observationCache = { source, axisKey, byChain };
        return byChain;
    }

    /**
     * Task 13: 表示中の列車の走行区間から、
     * 「列車ごとに速さが一定なら線はまっすぐ」という条件に最もよく合う駅間へ
     * stationAxis（各停基準の初期値）を最小二乗で合わせ直した軸。
     * データ・路線・方向が変わったとき（stationAxis・#chains の依存）だけ計算し直す
     * （横の縮尺・スクロール・選択では計算し直さない）。
     */
    readonly #fittedStationAxis = computed<StationAxis | null>(() => {
        const axis = this.stationAxis();
        if (!axis) return null;
        return fitStationAxisToTrips({
            axis,
            observations: this.#chainObservations(),
        });
    });

    /**
     * Task 13 フィックス: 駅間（index j→j+1）ごとに、直接それを覆う観測が
     * 1件でもあるか。観測の無い駅間（接続駅の継ぎ目など）を最小行高まで
     * 圧縮する判断（#pixelAxis）と、縦の縮尺の自動決定（#effectiveAxisPxPerMinute）
     * の両方で使う。
     */
    readonly #gapHasObservation = computed<boolean[]>(() => {
        const axis = this.stationAxis();
        if (!axis) return [];
        return hasObservationByGap(this.#chainObservations(), axis.length);
    });

    /**
     * Task 13 フィックス: 縦の縮尺（px/分）。手動値（axisPxPerMinute が非 null）が
     * あればそれを使い、無ければ「合わせた駅間のうち観測のある駅間の中で最小の
     * 所要分」が最小行高（MIN_ROW_HEIGHT_PX）ちょうどになるよう自動で決める。
     * これにより、最小二乗で合わせた駅間の差が enforceMinimumRowGap で一律に
     * 底上げされて見えなくなる（=斜め線がまっすぐにならない）問題を防ぐ。
     */
    readonly effectiveAxisPxPerMinute = computed<number>(() => {
        const axis = this.#fittedStationAxis();
        const gapHasObservation = this.#gapHasObservation();
        let smallest: number | undefined;
        if (axis) {
            for (let j = 0; j < gapHasObservation.length; j++) {
                if (!gapHasObservation[j]) {
                    continue;
                }
                const gap = axis[j + 1].y - axis[j].y;
                if (smallest === undefined || gap < smallest) {
                    smallest = gap;
                }
            }
        }
        return resolveAxisPxPerMinute({
            manual: this.axisPxPerMinute(),
            smallestObservedGapMinutes: smallest,
            targetPx: MIN_ROW_HEIGHT_PX,
            defaultValue: DEFAULT_AXIS_PX_PER_MINUTE,
            min: AXIS_PX_PER_MINUTE_MIN,
            max: AXIS_PX_PER_MINUTE_MAX,
        });
    });

    /**
     * 縦の縮尺・最小行高・上の余白を適用した駅軸（y はそのまま SVG の y）。
     * Task 13 フィックス: 観測の無い駅間（#gapHasObservation が false）は、
     * λ の正則化で初期値へ引き寄せられた（駅ごとの継ぎ目等で不自然に大きくなりうる）
     * 分の値をそのまま使わず、最小行高ぴったりに圧縮する。
     * Task 14 フィックス（コントローラ判断）: 圧縮の対象は「観測ゼロ **かつ**
     * その駅間の片方の端が複製した駅の行（軸に 2 回以上出る stationId）」だけにする。
     * 複製の前後でない観測ゼロの駅間（例: 単に列車が疎な区間）は、最小二乗の結果
     * （λ の正則化で初期値に寄った値）をそのまま使う。
     */
    readonly #pixelAxis = computed<StationAxis | null>(() => {
        const axis = this.#fittedStationAxis();
        if (!axis) return null;
        const px = this.effectiveAxisPxPerMinute();
        const gapHasObservation = this.#gapHasObservation();
        const occurrenceCountByStationId = new Map<string, number>();
        for (const entry of axis) {
            occurrenceCountByStationId.set(
                entry.stationId,
                (occurrenceCountByStationId.get(entry.stationId) ?? 0) + 1,
            );
        }
        const isDuplicatedRow = (index: number): boolean =>
            (occurrenceCountByStationId.get(axis[index].stationId) ?? 0) > 1;
        const entries: StationAxisEntry[] = [];
        let y = 0;
        axis.forEach((entry, index) => {
            if (index > 0) {
                const hasObservation = gapHasObservation[index - 1] ?? false;
                const gapMinutes = axis[index].y - axis[index - 1].y;
                const isSeamGap =
                    !hasObservation &&
                    (isDuplicatedRow(index - 1) || isDuplicatedRow(index));
                y += isSeamGap ? MIN_ROW_HEIGHT_PX : gapMinutes * px;
            }
            entries.push({
                stationId: entry.stationId,
                y,
                isDuplicate: entry.isDuplicate,
            });
        });
        return enforceMinimumRowGap(entries, MIN_ROW_HEIGHT_PX).map(
            (entry) => ({ ...entry, y: entry.y + BODY_TOP_PADDING }),
        );
    });

    readonly stationRows = computed<DiagramStationRow[]>(() => {
        const names = this.#stationNameById();
        return this.#turnbackClearance().axis.map((entry) => ({
            stationId: entry.stationId,
            stationName: names.get(entry.stationId) ?? '',
            y: entry.y,
        }));
    });

    readonly bodyHeight = computed(() => {
        const clearance = this.#turnbackClearance();
        const axis = clearance.axis;
        const maxY = axis.length ? Math.max(...axis.map((e) => e.y)) : 0;
        return maxY + BODY_BOTTOM_PADDING + clearance.extraBottomPx;
    });

    readonly #allTrips = computed<TripDetailsDto[]>(() =>
        Object.values(this.tripBlocksByDirection())
            .flat()
            .flatMap((block) => block.trips ?? []),
    );

    /**
     * 方向フィルタ後の trip block を、findContinuations（種別変更・列番変更で同じ編成が
     * 続けて発つ関係）で「つながり」ごとにまとめた列車の並び（続きの順）。続きの無い列車は
     * 1 本だけのつながりになる。方向フィルタ後の block が変わるたびに 1 回だけ計算し直す
     * （横の縮尺・スクロールでは計算し直さない diagramLines と同じ方針）。
     */
    readonly #chains = computed<TripDetailsDto[][]>(() => {
        const blocks = Object.values(
            this.filteredTripBlocksByDirection(),
        ).flat();
        return this.#buildChains(blocks);
    });

    /**
     * Task 14: 方向フィルタ**前**の全 trip block から作った「つながり」。
     * findTurnbacks は上り・下り両方の列車が要る（折り返しは通常その2つの間で起きるため）
     * ため、方向フィルタ後の #chains とは別に持つ。
     */
    readonly #allChains = computed<TripDetailsDto[][]>(() => {
        const blocks = Object.values(this.tripBlocksByDirection()).flat();
        return this.#buildChains(blocks);
    });

    /**
     * trip block の配列から、findContinuations（種別変更・列番変更で同じ編成が
     * 続けて発つ関係。同じ trip block の中だけを見る）で「つながり」ごとにまとめた
     * 列車の並び（続きの順）を作る。続きの無い列車は 1 本だけのつながりになる。
     * #chains・#allChains の共通処理。
     *
     * fix round 1（コントローラ判断）: findContinuations は trip block をまたがない。
     * 実データでは、同じ運用・同じ方向の列車が別の trip block に分かれて記録されている
     * ことがあり、そのままだと図の線が途中で切れ、findTurnbacks がその継ぎ目を
     * 折り返しと誤検出する（実測: 西谷の複製行をまたぐ・大和で幅 0〜20px の偽の折り返し）。
     * `mergeSameDirectionContinuations` で、同じ運用・同じ方向・駅と時刻が続く
     * （かつ曖昧でない）chain 同士を trip block をまたいで 1 本へつなぎ直す。
     */
    #buildChains(blocks: readonly TripBlockDetailsDto[]): TripDetailsDto[][] {
        const nextByTripId = findContinuations(blocks);
        const prevTripIdByTripId = new Map<string, string>();
        for (const [currentTripId, nextTrip] of nextByTripId) {
            if (nextTrip.tripId !== undefined) {
                prevTripIdByTripId.set(nextTrip.tripId, currentTripId);
            }
        }

        const visited = new Set<string>();
        const chains: TripDetailsDto[][] = [];
        for (const block of blocks) {
            for (const trip of block.trips ?? []) {
                if (
                    trip.tripId === undefined ||
                    visited.has(trip.tripId) ||
                    prevTripIdByTripId.has(trip.tripId)
                ) {
                    continue;
                }
                const chain: TripDetailsDto[] = [];
                let current: TripDetailsDto | undefined = trip;
                while (
                    current &&
                    current.tripId !== undefined &&
                    !visited.has(current.tripId)
                ) {
                    visited.add(current.tripId);
                    chain.push(current);
                    current = nextByTripId.get(current.tripId);
                }
                chains.push(chain);
            }
        }
        // 循環等で上のループに乗らなかった trip（理論上起きないが、型安全のためのフォールバック）
        for (const block of blocks) {
            for (const trip of block.trips ?? []) {
                if (trip.tripId !== undefined && !visited.has(trip.tripId)) {
                    visited.add(trip.tripId);
                    chains.push([trip]);
                }
            }
        }
        return mergeSameDirectionContinuations(chains);
    }

    /** Task 14: tripId → そのつながり（方向フィルタ前）の先頭 tripId。findTurnbacks 用。 */
    readonly #chainHeadOf = computed<ReadonlyMap<string, string>>(() => {
        const map = new Map<string, string>();
        for (const chain of this.#allChains()) {
            const headTripId = chain[0]?.tripId;
            if (headTripId === undefined) {
                continue;
            }
            for (const trip of chain) {
                if (trip.tripId !== undefined) {
                    map.set(trip.tripId, headTripId);
                }
            }
        }
        return map;
    });

    /** Task 14: tripId → そのつながり（方向フィルタ前）の末尾 tripId。findTurnbacks 用。 */
    readonly #chainTailOf = computed<ReadonlyMap<string, string>>(() => {
        const map = new Map<string, string>();
        for (const chain of this.#allChains()) {
            const tailTripId = chain[chain.length - 1]?.tripId;
            if (tailTripId === undefined) {
                continue;
            }
            for (const trip of chain) {
                if (trip.tripId !== undefined) {
                    map.set(trip.tripId, tailTripId);
                }
            }
        }
        return map;
    });

    /**
     * 今表示している駅軸の stationId 集合。diagramLines（線の分岐・分断判定）と
     * #turnbacks（折り返しの駅が軸の外なら作らない）の両方で使う。
     */
    readonly #axisStationIds = computed<ReadonlySet<string>>(() => {
        const axis = this.#pixelAxis();
        return axis ? new Set(axis.map((e) => e.stationId)) : new Set();
    });

    /**
     * Task 14: 折り返し（種別変更・列番変更のつながりをまたいで、同じ編成が
     * 同じ駅で向きを変えて発つ関係）。方向フィルタ前の全列車から求める（上り・下り
     * 両方が要るため）。実際に描くかどうかは #turnbackLinks（両端の線の有無）で決まる。
     * 追加指示: 折り返す駅が今の軸の外（他社線内）なら、その駅では線が描かれない
     * （または軸の切れ目の別の駅で線が終わる）ため、findTurnbacks 側で除外する
     * （axisStationIds）。
     */
    readonly #turnbacks = computed<Turnback[]>(() =>
        findTurnbacks({
            trips: this.#allTrips(),
            chainHeadOf: this.#chainHeadOf(),
            chainTailOf: this.#chainTailOf(),
            axisStationIds: this.#axisStationIds(),
        }),
    );

    /**
     * Task 14: tripId → そのつながり（種別変更・列番変更）の**最後の列車**の
     * 最後の停車駅の stationId。情報カードの行先（selectedTripInfo.destinationName）を
     * 種別変更・列番変更を跨いだ最終の行先にするために使う。#chains は続きの無い列車も
     * 1 本だけの chain として持つため、このマップは表示中の全 tripId をカバーする。
     */
    readonly #finalDestinationStationIdByTripId = computed<
        ReadonlyMap<string, string>
    >(() => {
        const map = new Map<string, string>();
        for (const chain of this.#chains()) {
            const lastTrip = chain[chain.length - 1];
            const times = [...(lastTrip.times ?? [])].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            const lastStationId = times[times.length - 1]?.stationId;
            if (!lastStationId) {
                continue;
            }
            for (const trip of chain) {
                if (trip.tripId !== undefined) {
                    map.set(trip.tripId, lastStationId);
                }
            }
        }
        return map;
    });

    /** tripId → そのつながりの全 tripId の集合。同じ chain 内の列車をまとめて強調するために使う。 */
    readonly tripIdsByChainOf = computed<
        ReadonlyMap<string, ReadonlySet<string>>
    >(() => {
        const map = new Map<string, ReadonlySet<string>>();
        for (const chain of this.#chains()) {
            const ids = new Set(
                chain
                    .map((trip) => trip.tripId)
                    .filter((id): id is string => id !== undefined),
            );
            for (const id of ids) {
                map.set(id, ids);
            }
        }
        return map;
    });

    /**
     * 隣り合う 2 駅の標準の運転時間（方向フィルタ前の全列車の実時刻の中央値）。
     * 線が切れる区間の途中にある時刻の空の通過駅を推測で埋める比率に使う。
     */
    readonly #standardRunMinutes = computed(() =>
        buildStandardRunMinutes(
            Object.values(this.tripBlocksByDirection())
                .flat()
                .flatMap((block) => block.trips ?? []),
        ),
    );

    /**
     * 列車の線（DP で組み立てた元の座標。#pixelAxis 基準）。横の縮尺・スクロールでは
     * 計算し直さない。task-17: 折り返しの⊐字リンクの衝突回避で行間を広げた後は、
     * この線の y を新しい行の y へ移し替えるだけで DP は再計算しない
     * （#turnbackClearance 参照）。外部へは公開せず、必ず #turnbackClearance 経由で使う。
     */
    readonly #rawDiagramLines = computed<TripDiagramLine[]>(() => {
        const axis = this.#pixelAxis();
        if (!axis) return [];
        const axisStationIds = this.#axisStationIds();
        const stationNameById = this.#stationNameById();
        const standardRunMinutes = this.#standardRunMinutes();
        const base = getRailwayDate(new Date());
        return this.#chains().flatMap((chain) =>
            buildChainDiagramLines({
                trips: chain,
                axis,
                axisStationIds,
                base,
                stationNameById,
                standardRunMinutes,
            }),
        );
    });

    /**
     * task-17（ユーザー指示: 「折り返し線がある行はある程度高さを確保しておいたほうがいい」）:
     * 折り返しの⊐字リンクが隣の行・その行の線と衝突しないよう、必要な行だけ隙間を広げる
     * （縮めない）。張り出しの深さは時間区間の重なりと側だけで決まり y には依存しないため、
     * まず #pixelAxis（時間から求めた元の軸）で線・リンクを作ってから必要な広げ幅を求め、
     * DP はやり直さず y だけ新しい行へ移し替える（ensure-turnback-clearance.util.ts）。
     * 先頭行の上張り出し・末尾行の下張り出しは隣の行が無いため、本体の上下余白
     * （BODY_TOP_PADDING・BODY_BOTTOM_PADDING）側で不足分を確保する
     * （stationRows・bodyHeight は必ずこの調整後の軸を使う）。
     */
    readonly #turnbackClearance = computed<TurnbackClearanceResult>(() => {
        const axis = this.#pixelAxis();
        if (!axis) {
            return {
                axis: [],
                lines: [],
                links: [],
                widenedGaps: [],
                extraTopPx: 0,
                extraBottomPx: 0,
            };
        }
        return ensureTurnbackClearance({
            axis,
            lines: this.#rawDiagramLines(),
            turnbacks: this.#turnbacks(),
            laneStepPx: TURNBACK_LANE_STEP_PX,
            minClearancePx: TURNBACK_MIN_CLEARANCE_PX,
            topPaddingPx: BODY_TOP_PADDING,
            bottomPaddingPx: BODY_BOTTOM_PADDING,
        });
    });

    /** 列車の線（隣の行・折り返しリンクとの衝突を避けるため y を移し替え済み）。 */
    readonly diagramLines = computed<TripDiagramLine[]>(
        () => this.#turnbackClearance().lines,
    );

    /**
     * Task 14 / task-17: 折り返しの⊐字リンク（重ならないよう段組み・隙間確保済み）。
     * chart が線より前に描く。
     */
    readonly turnbackLinks = computed<TurnbackLink[]>(
        () => this.#turnbackClearance().links,
    );

    /**
     * 凡例の回送見本の表示条件。種別ごとの色分けの凡例は出さない
     * （クリックすれば出るため。task-15）。
     */
    readonly hasDeadhead = computed(() => {
        const drawn = new Set(this.diagramLines().map((l) => l.tripId));
        return this.#allTrips().some(
            (t) =>
                t.tripId !== undefined &&
                drawn.has(t.tripId) &&
                t.tripClassId === undefined,
        );
    });

    /** Task 14: 描いている線に出庫（◯）の印を持つものが1本でもあるか。凡例の見本の表示条件。 */
    readonly hasDepotOut = computed(() =>
        this.diagramLines().some((line) =>
            line.depotMarks.some((mark) => mark.kind === 'out'),
        ),
    );

    /** Task 14: 描いている線に入庫（△）の印を持つものが1本でもあるか。凡例の見本の表示条件。 */
    readonly hasDepotIn = computed(() =>
        this.diagramLines().some((line) =>
            line.depotMarks.some((mark) => mark.kind === 'in'),
        ),
    );

    readonly selectedTripInfo = computed<TrainDiagramSelectedTripInfo | null>(
        () => {
            const tripId = this.selectedTripId();
            if (!tripId) {
                return null;
            }
            const trip = this.#allTrips().find((t) => t.tripId === tripId);
            if (!trip) {
                return null;
            }

            const times = [...(trip.times ?? [])].sort(
                (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
            );
            const lastStationId = times[times.length - 1]?.stationId;
            // Task 14: 種別変更・列番変更で続く列車があれば、その最後の列車の最後の
            // 停車駅を行先にする（無ければ今どおりこの列車自身の終着）。
            const destinationStationId =
                this.#finalDestinationStationIdByTripId().get(tripId) ??
                lastStationId;
            const destinationName = destinationStationId
                ? (this.#stationNameById().get(destinationStationId) ?? '')
                : '';

            const tripOperationList = trip.tripOperationLists?.[0];
            const operationId = tripOperationList?.operationId;
            const operationNumber =
                tripOperationList?.operation?.operationNumber;
            const expectedSighting = operationNumber
                ? this.operationSightingTimeCrossSections()[operationNumber]
                      ?.expectedSighting
                : undefined;
            const formationNumber =
                expectedSighting?.formation?.formationNumber;

            return {
                tripId,
                tripNumber: trip.tripNumber ?? '',
                tripClassName: trip.tripClass?.tripClassName ?? '',
                tripClassColor: trip.tripClass?.tripClassColor ?? '#8a8a8a',
                destinationName,
                operationId,
                operationNumber,
                formationNumber: this.isTodaySelected()
                    ? formationNumber
                    : undefined,
                sightingTime: this.isTodaySelected()
                    ? expectedSighting?.sightingTime
                    : undefined,
                detailLink: [
                    '/timetable',
                    'all-line',
                    {
                        calendar_id: this.calendarId() ?? '',
                        trip_direction: String(trip.tripDirection ?? ''),
                        trip_block_id: trip.tripBlockId ?? '',
                    },
                ],
            };
        },
    );

    readonly #firstLoadDone = signal(false);
    /** 表示に効く値の鍵（calendar_id|route_ids|direction）。time だけが変わったときは何もしない */
    #lastParamsKey: string | null = null;
    /**
     * 最新の「左端の分」（I1: スクロール由来の onLeftMinuteChange・初回ジャンプで更新）。
     * scroll のたびに Router.navigate すると resolver 再実行・GA page_view・
     * ローディング表示が起きるため、scroll 時は Location.replaceState のみで URL を
     * 書き換える（#navigate を通らない）。その結果 route.snapshot.params.time は
     * scroll 後は古いままになるため、#navigate はこの値で time を上書きして使う。
     */
    #leftMinute: number | null = null;
    /**
     * Router を通さずに書き換えた路線・方向（#replaceViewParams）。route.snapshot.params
     * には反映されないため、URL を組み立てるたびに重ねる。Router を通す遷移（#navigate）で
     * URL に載ったら空に戻す。
     */
    #viewParamOverrides: Record<string, string> = {};
    /** I3: isEmpty の直前値（true→false の遷移だけを検出するため） */
    #wasEmpty = false;

    constructor() {
        this.#routeStationListStateQuery.routeStations$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((routeStations) => {
                TrainDiagramStore.setRouteStations(routeStations);
            });

        // I3: 表示条件に合う列車が無い（isEmpty）状態から復帰したら、chart は
        // 再生成されて jumpRequest を読み直す（最後の要求が初期表示時刻のことが多い）ため、
        // 最新の左端の分へ跳び直して表示位置の喪失を防ぐ。
        effect(() => {
            const empty = this.isEmpty();
            const wasEmpty = this.#wasEmpty;
            this.#wasEmpty = empty;
            if (wasEmpty && !empty) {
                this.#requestJump(this.#leftMinute ?? 0, 'start');
            }
        });

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                // Router を通った遷移では URL が正。書き換え分（#replaceViewParams）は捨てる。
                this.#viewParamOverrides = {};
                const calendarId =
                    paramMap.get('calendar_id') ??
                    this.#todaysCalendarListStateQuery.todaysCalendarId;

                const routeIdsParam = paramMap.get('route_ids');
                const resolvedRouteIds = routeIdsParam
                    ? routeIdsParam.split(',').filter(Boolean)
                    : this.#defaultRouteIds();
                const directionFilter = this.#parseDirectionFilter(
                    paramMap.get('direction'),
                );

                const timeParam = paramMap.get('time');
                const windowParam = paramMap.get('window');
                // M2: parseTimeParam が undefined を返す不正な time（例: `time=9999`）も
                // 正規化の対象に含める（`!timeParam` だけでは truthy な不正値をすり抜ける）。
                const missingParams =
                    !paramMap.get('calendar_id') ||
                    !routeIdsParam ||
                    parseTimeParam(timeParam) === undefined ||
                    !!windowParam;

                if (missingParams && calendarId && resolvedRouteIds.length) {
                    const minute =
                        parseTimeParam(timeParam) ??
                        parseLegacyWindowParam(windowParam) ??
                        defaultStartMinute(new Date());
                    // I2: window= の古いリンクを time= へ正規化する際、direction 等
                    // 既存の他パラメータを落とさない（window だけを time に差し替える）。
                    // snapshot.params ではなく今まさに来た paramMap から作る
                    // （snapshot の更新タイミングをテスト等の Router モックに依存させない）。
                    const restParams: Record<string, string> = {};
                    for (const key of paramMap.keys) {
                        if (key === 'window') {
                            continue;
                        }
                        restParams[key] = paramMap.get(key) ?? '';
                    }
                    this.#router.navigate(
                        [
                            '/train-diagram',
                            {
                                ...restParams,
                                calendar_id: calendarId,
                                route_ids: resolvedRouteIds.join(','),
                                time: formatTimeParam(minute),
                            },
                        ],
                        { replaceUrl: true },
                    );
                    return;
                }

                const paramsKey = `${calendarId}|${resolvedRouteIds.join(',')}|${directionFilter}`;
                if (this.#lastParamsKey === paramsKey) {
                    return;
                }
                this.#lastParamsKey = paramsKey;

                const calendarChanged =
                    TrainDiagramStore.calendarId !== calendarId;

                TrainDiagramStore.setCalendarId(calendarId ?? null);
                TrainDiagramStore.setSelectedRouteIds(resolvedRouteIds);
                TrainDiagramStore.setDirectionFilter(directionFilter);
                TrainDiagramStore.setSelectedTripId(null);

                if (!this.#firstLoadDone()) {
                    // M2: 正規化を素通りした（=parseTimeParam が有効値を返す）はずの経路だが、
                    // 上の window 正規化と同じ優先順位（time → legacy window → 既定）で
                    // フォールバックし、`?? 0`（4:00 固定）による意図しないジャンプを防ぐ。
                    const minute =
                        parseTimeParam(timeParam) ??
                        parseLegacyWindowParam(windowParam) ??
                        defaultStartMinute(new Date());
                    this.#leftMinute = minute;
                    this.#requestJump(minute, 'start');
                }

                this.fetchData({
                    refetchTripBlocks:
                        calendarChanged || !this.#firstLoadDone(),
                });
            });
    }

    /**
     * 既定表示路線（route_ids 未指定時）。全 20 路線を出すと駅ラベルが判読不能になるため
     * （mockup-08）、相鉄自社線（本線・いずみ野線・厚木線・新横浜線）のみを既定にする。
     * これらは直通で連続するため 1 枚のダイヤグラムとして自然に繋がる。該当路線が
     * 見つからない場合（データ未取得等）は全路線にフォールバックする。
     */
    #defaultRouteIds(): string[] {
        const sotetsuRouteNames = ['本線', 'いずみ野線', '厚木線', '新横浜線'];
        const sotetsuRouteIds = this.#routeStations()
            .filter((route) => sotetsuRouteNames.includes(route.routeName))
            .map((route) => route.routeId);
        return sotetsuRouteIds.length
            ? sotetsuRouteIds
            : this.#routeStations().map((route) => route.routeId);
    }

    /** matrix param `direction` を検証して方向フィルタに復元する（不正/未指定は既定 'both'）。 */
    #parseDirectionFilter(value: string | null): DiagramDirectionFilter {
        return value === 'up' || value === 'down' ? value : 'both';
    }

    #requestJump(minute: number, align: DiagramJumpRequest['align']): void {
        this.jumpRequest.set({ minute, align, seq: ++this.#jumpSeq });
    }

    async fetchData(flags: { refetchTripBlocks: boolean }): Promise<void> {
        TrainDiagramStore.enableLoading();

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            if (!this.#firstLoadDone()) {
                await lastValueFrom(
                    this.#timetableDiagramService.fetchTripClasses(),
                );
                await lastValueFrom(
                    this.#timetableDiagramService.fetchNetworkStations(),
                );
            }
            if (flags.refetchTripBlocks) {
                await lastValueFrom(
                    this.#timetableDiagramService.fetchTripBlocks(),
                );
            }
            this.#firstLoadDone.set(true);
        } finally {
            TrainDiagramStore.disableLoading();
        }
    }

    onCalendarIdChange(calendarId: string): void {
        this.#navigate({ calendar_id: calendarId });
    }

    onRouteIdsChange(routeIds: string[]): void {
        this.#replaceViewParams({ route_ids: routeIds.join(',') });
    }

    onDirectionFilterChange(directionFilter: DiagramDirectionFilter): void {
        this.#replaceViewParams({ direction: directionFilter });
    }

    /**
     * I1: スクロールが止まるたびに呼ばれる。Router.navigate（フルナビゲーション）を
     * 通すと `runGuardsAndResolvers: 'always'` の resolver 再実行・
     * NavigationStart/End によるローディング表示や GA page_view が毎回起きてしまうため、
     * time だけの更新は Location.replaceState で URL のみを書き換える。
     */
    onLeftMinuteChange(minute: number): void {
        this.#leftMinute = minute;
        this.#replaceUrl(this.#currentParams());
    }

    onPxPerMinuteChange(value: number): void {
        TrainDiagramStore.setPxPerMinute(value);
    }

    onAxisPxPerMinuteChange(value: number): void {
        TrainDiagramStore.setAxisPxPerMinute(value);
    }

    onJumpToHour(hour: number): void {
        this.#requestJump((hour - DIAGRAM_START_HOUR) * 60, 'start');
    }

    onJumpToNow(): void {
        this.#requestJump(railwayMinuteOfDay(new Date()), 'quarter');
    }

    onZoomStep(direction: 1 | -1): void {
        TrainDiagramStore.setPxPerMinute(
            nextZoomStep(this.pxPerMinute(), direction),
        );
    }

    /** G12: 空状態の次アクション。方向フィルタ「両方」+ 既定路線に戻して再表示する。 */
    onResetDiagramFilters(): void {
        this.#replaceViewParams({
            direction: 'both',
            route_ids: this.#defaultRouteIds().join(','),
        });
    }

    async onTripSelected(tripId: string | null): Promise<void> {
        TrainDiagramStore.setSelectedTripId(tripId);

        if (!tripId) {
            // 背景クリック等でカードが閉じるときも高さを 0 に戻す（onInfoPanelClosed と同様）。
            this.infoPanelHeight.set(0);
        }

        if (!tripId || !this.isTodaySelected()) {
            return;
        }

        const trip = this.#allTrips().find((t) => t.tripId === tripId);
        const operationNumber =
            trip?.tripOperationLists?.[0]?.operation?.operationNumber;

        if (
            operationNumber &&
            !this.operationSightingTimeCrossSections()[operationNumber]
        ) {
            await lastValueFrom(
                this.#timetableDiagramService.fetchOperationSightingTimeCrossSection(
                    operationNumber,
                ),
            );
        }
    }

    onTripActivated(tripId: string): void {
        const trip = this.#allTrips().find((t) => t.tripId === tripId);
        if (!trip) {
            return;
        }
        this.#router.navigate([
            '/timetable',
            'all-line',
            {
                calendar_id: this.calendarId() ?? '',
                trip_direction: String(trip.tripDirection ?? ''),
                trip_block_id: trip.tripBlockId ?? '',
            },
        ]);
    }

    onInfoPanelClosed(): void {
        TrainDiagramStore.setSelectedTripId(null);
        this.infoPanelHeight.set(0);
    }

    onInfoPanelHeightChange(height: number): void {
        this.infoPanelHeight.set(height);
    }

    /**
     * I1: scroll 由来の time 更新は Router を通らない（onLeftMinuteChange 参照）ため
     * route.snapshot.params.time は古いままになりうる。ここを通るナビゲーション
     * （カレンダーの変更）では #leftMinute があればそれで time を上書きし、最新の
     * スクロール位置を保つ。Router を通さず書き換えた路線・方向も載せる。
     */
    #navigate(overrides: Record<string, string>): void {
        const params = { ...this.#currentParams(), ...overrides };
        this.#viewParamOverrides = {};
        this.#router.navigate(['/train-diagram', params]);
    }

    /**
     * 今の URL の matrix params。route.snapshot.params に、Router を通さず書き換えた
     * 路線・方向（#viewParamOverrides）と最新の左端の分（#leftMinute）を重ねる。
     */
    #currentParams(): Record<string, string> {
        const params: Record<string, string> = {
            ...this.#route.snapshot.params,
            ...this.#viewParamOverrides,
        };
        if (this.#leftMinute !== null) {
            params['time'] = formatTimeParam(this.#leftMinute);
        }
        return params;
    }

    #replaceUrl(params: Record<string, string>): void {
        const urlTree = this.#router.createUrlTree(['/train-diagram', params]);
        this.#location.replaceState(this.#router.serializeUrl(urlTree));
    }

    /**
     * 路線・方向の切り替え（データの取り直しが要らない）は Router を通さない。
     * Router.navigate だと画面全体のローディング表示（NavigationStart）が出て、
     * 何も読み込まないのに待たされて見えるため、ストアへ直接反映し、URL は
     * Location.replaceState で書き換えるだけにする（time のスクロールと同じ扱い）。
     */
    #replaceViewParams(overrides: {
        route_ids?: string;
        direction?: DiagramDirectionFilter;
    }): void {
        this.#viewParamOverrides = {
            ...this.#viewParamOverrides,
            ...overrides,
        };
        const params = this.#currentParams();
        const routeIds = (params['route_ids'] ?? '').split(',').filter(Boolean);
        const directionFilter = this.#parseDirectionFilter(
            params['direction'] ?? null,
        );
        // 同じ路線でも新しい配列を入れると駅軸から下を全部作り直すため、変わったときだけ入れる。
        if (
            TrainDiagramStore.selectedRouteIds.join(',') !== routeIds.join(',')
        ) {
            TrainDiagramStore.setSelectedRouteIds(routeIds);
        }
        TrainDiagramStore.setDirectionFilter(directionFilter);
        TrainDiagramStore.setSelectedTripId(null);
        this.#lastParamsKey = `${TrainDiagramStore.calendarId}|${routeIds.join(',')}|${directionFilter}`;
        this.#replaceUrl(params);
    }
}
