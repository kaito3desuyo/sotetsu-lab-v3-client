import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    effect,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformServer, Location } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { calendarCacheTag } from 'src/app/core/ssr/cache-control';
import { afterFirstRender } from 'src/app/core/ssr/first-render';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { formatPageTitle } from 'src/app/core/utils/format-page-title.util';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { railwayDateKey } from 'src/app/core/utils/railway-day';
import { runIntervalInBrowser } from 'src/app/core/utils/run-interval-in-browser';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { formatRouteFilterSummary } from 'src/app/shared/control-band/control-band-summary.util';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { PartialFailureNoticeComponent } from 'src/app/shared/partial-failure-notice/partial-failure-notice.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { FilterChipOption } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { NotFoundContentComponent } from 'src/app/shared/not-found-content/not-found-content.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { buildStationNameById } from 'src/app/shared/station-name-by-id.util';
import { TrainDiagramControllerComponent } from './components/train-diagram-controller/train-diagram-controller.component';
import { TrainDiagramInfoPanelComponent } from './components/train-diagram-info-panel/train-diagram-info-panel.component';
import { TrainDiagramLegendComponent } from './components/train-diagram-legend/train-diagram-legend.component';
import {
    DiagramJumpRequest,
    TrainDiagramChartComponent,
} from './components/train-diagram-chart/train-diagram-chart.component';
import { TrainDiagramSelectedTripInfo } from './interfaces/train-diagram-selected-trip-info.interface';
import { TrainDiagramService } from './services/train-diagram.service';
import {
    DiagramDirectionFilter,
    TrainDiagramStore,
} from './stores/train-diagram.store';
import {
    buildDiagramBase,
    buildDiagramLayout,
    buildDiagramPrelude,
    buildSelectedTripInfo,
} from './utils/build-diagram-model.util';
import { filterTripBlocksByDirection } from './utils/filter-trip-blocks-by-direction.util';
import { StationAxisObservation } from './utils/fit-station-axis.util';
import {
    DIAGRAM_START_HOUR,
    formatTimeParam,
    nextZoomStep,
    railwayMinuteOfDay,
} from './utils/diagram-timeline.util';
import {
    formatTrainDiagramParams,
    parseTrainDiagramParams,
} from './utils/train-diagram-url.util';
import { formatTrainDiagramSummary } from './utils/train-diagram-summary.util';
import { buildRouteOptions } from './utils/build-route-options.util';

/** highlightedTripIds の既定値（何も選んでいないとき）。参照を使い回して余計な再計算を避ける。 */
const EMPTY_TRIP_ID_SET: ReadonlySet<string> = new Set();

@Component({
    selector: 'app-train-diagram',
    templateUrl: './train-diagram.component.html',
    styleUrl: './train-diagram.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        NotFoundContentComponent,
        PartialFailureNoticeComponent,
        SkeletonBarComponent,
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
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #ssrResponse = inject(SsrResponse);
    readonly #pageMeta = inject(PageMeta);
    readonly #pageNotFound = inject(PageNotFound);

    /** URL に値があるのに不正、または存在しないダイヤのとき true（本体の代わりに見つからない表示を出す） */
    readonly notFound = signal(false);
    readonly #store = inject(TrainDiagramStore);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #notificationService = inject(NotificationService);
    readonly #timetableDiagramService = inject(TrainDiagramService);
    readonly #todaysCalendarListState = inject(TodaysCalendarListState);
    readonly #routeStationListState = inject(RouteStationListState);
    readonly #agencyListState = inject(AgencyListState);
    readonly #calendarListState = inject(CalendarListState);

    readonly isLoading = this.#store.isLoading;
    readonly hasFetchedTrainDiagram = this.#store.hasFetchedTrainDiagram;
    readonly partialFailure = this.#store.partialFailure;
    /** 骨組みの駅の行の数（画面 1 枚分を埋める数。あふれた分はカードが隠す） */
    readonly skeletonStationRows = Array.from({ length: 16 }, (_, i) => i);
    readonly calendarId = this.#store.calendarId;
    readonly selectedRouteIds = this.#store.selectedRouteIds;
    readonly pxPerMinute = this.#store.pxPerMinute;
    /**
     * Task 13 フィックス: 縦の縮尺の手動値（Ctrl+ホイール・ピンチで明示的に入れた値）。
     * null = 自動。実際に使う縮尺は #effectiveAxisPxPerMinute（自動時は観測のある
     * 駅間の最小所要分から決める）。
     */
    readonly axisPxPerMinute = this.#store.axisPxPerMinute;
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
    readonly #now = signal(new Date());

    readonly directionFilter = this.#store.directionFilter;
    readonly stationAxis = this.#store.stationAxis;
    readonly tripBlocksByDirection = this.#store.tripBlocksByDirection;
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
    readonly selectedTripId = this.#store.selectedTripId;
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
        if (!this.hasFetchedTrainDiagram()) return false;
        return !Object.values(this.filteredTripBlocksByDirection())
            .flat()
            .some((block) => (block.trips?.length ?? 0) > 0);
    });
    readonly operationSightingTimeCrossSections =
        this.#store.operationSightingTimeCrossSections;

    readonly todaysCalendarIds =
        this.#todaysCalendarListState.todaysCalendarIds;
    readonly #routeStations = this.#routeStationListState.routeStations;
    readonly #agencies = this.#agencyListState.agencies;
    readonly #calendars = this.#calendarListState.calendars;
    /** 題名。ダイヤは取ったデータから作る */
    readonly pageTitle = computed(() => {
        const calendar = this.#calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        return formatPageTitle('ダイヤグラム', [
            calendar ? formatCalendarSummaryLabel(calendar) : null,
        ]);
    });
    readonly isTodaySelected = computed(() =>
        this.todaysCalendarIds().includes(this.calendarId() ?? ''),
    );
    /**
     * 「今」の表示（今へボタン・現在時刻の線と凡例）を出すか。@if で要素が増える表示だけがこれを使う。
     * サーバーは今日のダイヤを取らず false で描くので、ブラウザも最初の描画までは false にそろえる（spec 5.3）
     */
    readonly showTodayParts = afterFirstRender(this.isTodaySelected, false);

    /** 細帯の要約に出す路線チップの選択肢（チップと同じ組み立て。ずれると要約の「○○の N 路線」がチップと合わない） */
    readonly #routeOptions = computed<FilterChipOption[]>(() =>
        buildRouteOptions(this.#routeStations(), this.#agencies()),
    );

    /** 畳んだ 1 行の要約。例「本線 平日 下り」。 */
    readonly bandSummary = computed(() =>
        formatTrainDiagramSummary({
            routes: formatRouteFilterSummary(
                this.#routeOptions(),
                this.selectedRouteIds(),
            ),
            calendarName: this.#calendars().find(
                (c) => c.calendarId === this.calendarId(),
            )?.calendarName,
            direction: this.directionFilter(),
        }),
    );

    readonly nowMinute = computed(() =>
        this.showTodayParts() ? railwayMinuteOfDay(this.#now()) : null,
    );

    readonly #stationNameById = computed(() =>
        buildStationNameById(this.#routeStations()),
    );

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

    readonly #itineraryLinks = this.#store.itineraryLinks;

    /** 土台（全列車・方向前のつながりの端・標準の運転時間）。列車データと運用のつながりだけで決まる。 */
    readonly #diagramBase = computed(() =>
        buildDiagramBase({
            tripBlocksByDirection: this.tripBlocksByDirection(),
            itineraryLinks: this.#itineraryLinks(),
        }),
    );

    /**
     * 縦の縮尺に依らない前段（つながり・観測・最小二乗で合わせた軸）。
     * 本体は utils/build-diagram-model.util.ts の純関数。縦の縮尺・横の縮尺・選択では作り直さない。
     */
    readonly #diagramPrelude = computed(() => {
        const tripBlocksByDirection = this.tripBlocksByDirection();
        return buildDiagramPrelude({
            tripBlocksByDirection,
            stationAxis: this.stationAxis(),
            directionFilter: this.directionFilter(),
            itineraryLinks: this.#itineraryLinks(),
            observationCacheFor: (axisKey) =>
                this.#observationCacheFor(tripBlocksByDirection, axisKey),
        });
    });

    /** 縦の縮尺を受けて座標（駅の行・線・折り返し）を出す後段。横の縮尺・スクロール・選択では作り直さない。 */
    readonly #layout = computed(() =>
        buildDiagramLayout({
            base: this.#diagramBase(),
            prelude: this.#diagramPrelude(),
            axisPxPerMinute: this.axisPxPerMinute(),
            stationNameById: this.#stationNameById(),
            itineraryLinks: this.#itineraryLinks(),
            now: new Date(),
        }),
    );

    /**
     * 縦の縮尺（px/分）。手動値（axisPxPerMinute が非 null）があればそれを使い、無ければ
     * 観測のある駅間の最小所要分が最小行高ちょうどになるよう自動で決める（Task 13 フィックス）。
     */
    readonly effectiveAxisPxPerMinute = computed(
        () => this.#layout().effectiveAxisPxPerMinute,
    );
    readonly stationRows = computed(() => this.#layout().stationRows);
    readonly bodyHeight = computed(() => this.#layout().bodyHeight);
    /** 列車の線（隣の行・折り返しリンクとの衝突を避けるため y を移し替え済み）。 */
    readonly diagramLines = computed(() => this.#layout().diagramLines);
    /** 折り返しの⊐字リンク（重ならないよう段組み・隙間確保済み）。chart が線より前に描く。 */
    readonly turnbackLinks = computed(() => this.#layout().turnbackLinks);
    /** 凡例の回送見本の表示条件。 */
    readonly hasDeadhead = computed(() => this.#layout().hasDeadhead);
    /** 描いている線に出庫（◯）の印を持つものが 1 本でもあるか。凡例の見本の表示条件。 */
    readonly hasDepotOut = computed(() => this.#layout().hasDepotOut);
    /** 描いている線に入庫（△）の印を持つものが 1 本でもあるか。凡例の見本の表示条件。 */
    readonly hasDepotIn = computed(() => this.#layout().hasDepotIn);
    /** 描いている線に乗り移り（□）の印を持つものが 1 本でもあるか。凡例の見本の表示条件。 */
    readonly hasTransfer = computed(() => this.#layout().hasTransfer);
    /** tripId → そのつながりの全 tripId の集合。同じ chain 内の列車をまとめて強調するために使う。 */
    readonly tripIdsByChainOf = computed(
        () => this.#diagramPrelude().tripIdsByChainOf,
    );
    readonly #allTrips = computed(() => this.#diagramBase().allTrips);

    readonly selectedTripInfo = computed<TrainDiagramSelectedTripInfo | null>(
        () =>
            buildSelectedTripInfo(
                {
                    allTrips: this.#allTrips(),
                    finalDestinationStationIdByTripId:
                        this.#diagramPrelude()
                            .finalDestinationStationIdByTripId,
                },
                {
                    selectedTripId: this.selectedTripId(),
                    stationNameById: this.#stationNameById(),
                    operationSightingTimeCrossSections:
                        this.operationSightingTimeCrossSections(),
                    isTodaySelected: this.isTodaySelected(),
                    calendarId: this.calendarId(),
                },
            ),
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
    /** I3: chart が隠れていたかの直前値（隠れた→見えるの立ち上がりだけを検出するため） */
    #wasChartHidden = false;

    constructor() {
        // 取ったデータで題名を詳しくする（spec 5.1。題名のためだけに API を叩かない）
        // 見つからない間は動かさない（PageNotFound.mark() の題名を上書きしない）
        effect(() => {
            if (this.notFound()) return;
            this.#pageMeta.setTitle(this.pageTitle());
        });

        runIntervalInBrowser(1000, () => this.#now.set(new Date()));

        // 自分が運用目撃情報を投稿したとき、この画面に出ている充当編成を取り直す
        this.#operationPostCardService.submitEvent$
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => void this.#refetchSightingsAfterPost());

        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の図が一瞬出ないようにする
        this.#store.setHasFetchedTrainDiagram(false);

        // I3: chart が隠れていた（列車を取る前の骨組み、または表示条件に合う列車が
        // 無い isEmpty）状態から見える状態に戻ったら、chart は再生成されて jumpRequest を
        // 読み直す（最後の要求が初期表示時刻のことが多い）ため、最新の左端の分へ
        // 跳び直して表示位置の喪失を防ぐ。ダイヤを替える取得も骨組みを経由する。
        effect(() => {
            const chartHidden =
                this.notFound() ||
                !this.hasFetchedTrainDiagram() ||
                this.isEmpty();
            const wasChartHidden = this.#wasChartHidden;
            this.#wasChartHidden = chartHidden;
            if (wasChartHidden && !chartHidden) {
                this.#requestJump(this.#leftMinute ?? 0, 'start');
            }
        });

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                // Router を通った遷移では URL が正。書き換え分（#replaceViewParams）は捨てる。
                this.#viewParamOverrides = {};
                const { params, needsReplace } = parseTrainDiagramParams(
                    paramMap,
                    {
                        calendarId:
                            this.#todaysCalendarListState.todaysCalendarId() ??
                            null,
                        routeIds: this.#defaultRouteIds(),
                        knownRouteIds: new Set(
                            this.#routeStations().map((route) => route.routeId),
                        ),
                        now: new Date(),
                    },
                );

                // 値があるのに不正、または路線の一覧に無い路線なら、見つからない表示にして取得しない
                if (params.notFound) {
                    this.#markNotFound();
                    return;
                }
                if (this.notFound()) {
                    this.notFound.set(false);
                    this.#pageNotFound.clear();
                }

                const {
                    calendarId,
                    routeIds: resolvedRouteIds,
                    direction: directionFilter,
                    startMinute,
                } = params;

                if (params.hasMissing) {
                    // 取得を始めない遷移でも世代を進め、前の URL の遅れた取得の結果を捨てる
                    this.#store.nextFetchSeq();
                    this.#lastParamsKey = null;
                }

                // サーバーでは今日のダイヤ・今の時刻で補わない。骨組みのまま返し、ブラウザで補う（spec 13.2）
                if (this.#isServer && params.hasMissing) return;

                if (needsReplace) {
                    // window= の古いリンクを time= へ正規化する際、direction 等の他パラメータを落とさない
                    this.#router.navigate(
                        ['/train-diagram', formatTrainDiagramParams(params)],
                        { replaceUrl: true },
                    );
                    return;
                }

                const paramsKey = `${calendarId}|${resolvedRouteIds.join(',')}|${directionFilter}`;
                if (this.#lastParamsKey === paramsKey) {
                    return;
                }
                this.#lastParamsKey = paramsKey;

                const calendarChanged = this.#store.calendarId() !== calendarId;

                if (calendarId) {
                    this.#ssrResponse.addCacheTags([
                        calendarCacheTag(calendarId),
                    ]);
                }
                this.#store.setCalendarId(calendarId ?? null);
                this.#store.setSelectedRouteIds(resolvedRouteIds);
                this.#store.setDirectionFilter(directionFilter);
                this.#store.setSelectedTripId(null);

                if (!this.#firstLoadDone()) {
                    // M2: 正規化を素通りした（=parseTimeParam が有効値を返す）はずの経路だが、
                    // 上の window 正規化と同じ優先順位（time → legacy window → 既定）で
                    // フォールバックし、`?? 0`（4:00 固定）による意図しないジャンプを防ぐ。
                    this.#leftMinute = startMinute;
                    this.#requestJump(startMinute, 'start');
                }

                const refetchTripBlocks =
                    calendarChanged ||
                    !this.#firstLoadDone() ||
                    !this.#store.hasFetchedTrainDiagram();
                this.fetchData({ refetchTripBlocks });
            });
    }

    #markNotFound(): void {
        // 取得を始めない遷移でも世代を進め、前の URL の遅れた取得の結果を捨てる
        this.#store.nextFetchSeq();
        // 同じ条件の URL へ戻ったとき、取り直す
        this.#lastParamsKey = null;
        this.notFound.set(true);
        this.#pageNotFound.mark();
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

    fetchData(flags: { refetchTripBlocks: boolean }): Promise<void> {
        return this.#timetableDiagramService.fetchData({
            ...flags,
            firstLoad: !this.#firstLoadDone(),
            onLoaded: () => this.#firstLoadDone.set(true),
            onCalendarMissing: () => this.#markNotFound(),
        });
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
        this.#store.setPxPerMinute(value);
    }

    onAxisPxPerMinuteChange(value: number): void {
        this.#store.setAxisPxPerMinute(value);
    }

    onJumpToHour(hour: number): void {
        this.#requestJump((hour - DIAGRAM_START_HOUR) * 60, 'start');
    }

    onJumpToNow(): void {
        this.#requestJump(railwayMinuteOfDay(new Date()), 'quarter');
    }

    onZoomStep(direction: 1 | -1): void {
        this.#store.setPxPerMinute(nextZoomStep(this.pxPerMinute(), direction));
    }

    /** G12: 空状態の次アクション。方向フィルタ「両方」+ 既定路線に戻して再表示する。 */
    onResetDiagramFilters(): void {
        this.#replaceViewParams({
            direction: 'both',
            route_ids: this.#defaultRouteIds().join(','),
        });
    }

    async onTripSelected(tripId: string | null): Promise<void> {
        this.#store.setSelectedTripId(tripId);

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
            // 目撃は Service Worker に残らないので、列車の保存とは別に、日付つきで保存する
            const conditions = {
                calendarId: this.#store.calendarId(),
                routeIds: [...this.#store.selectedRouteIds()].sort().join(','),
                date: railwayDateKey(),
            };
            try {
                await lastValueFrom(
                    this.#timetableDiagramService.fetchOperationSightingTimeCrossSection(
                        operationNumber,
                    ),
                );
            } catch (error) {
                // 通信できないときは、同じ日に保存した目撃を出す（すでに取れている目撃は残す）。
                // 戻す処理が壊れていても、取得の失敗をそのまま投げる
                try {
                    await this.#store.restoreOfflineSnapshot(
                        'sightings',
                        conditions,
                    );
                } catch {
                    // 保存した中身が壊れていても、取得の失敗を優先する
                }
                throw error;
            }
            void this.#store.saveOfflineSnapshot('sightings', conditions);
        }
    }

    /**
     * 投稿のあと、この画面がすでに取っている充当編成（運用ごとの目撃の断面）だけを取り直す。
     * 列車・ダイヤは取り直さない。今日のダイヤを出していないときは何もしない。
     * 投稿は 'sighting' のキャッシュを捨てるので、ここで最新が取れる。
     */
    async #refetchSightingsAfterPost(): Promise<void> {
        if (!this.showTodayParts()) return;
        const operationNumbers = Object.keys(
            this.operationSightingTimeCrossSections(),
        );
        if (!operationNumbers.length) return;

        const seq = this.#store.currentFetchSeq();
        const conditions = {
            calendarId: this.#store.calendarId(),
            routeIds: [...this.#store.selectedRouteIds()].sort().join(','),
            date: railwayDateKey(),
        };
        this.#store.enableLoading();
        try {
            const results = await Promise.allSettled(
                operationNumbers.map((operationNumber) =>
                    lastValueFrom(
                        this.#timetableDiagramService.fetchOperationSightingTimeCrossSection(
                            operationNumber,
                        ),
                    ),
                ),
            );
            const failure = results.find(
                (result): result is PromiseRejectedResult =>
                    result.status === 'rejected',
            );
            if (failure) {
                console.error(failure.reason);
                this.#notificationService.open(
                    'データの取得に失敗しました',
                    'OK',
                );
            } else if (this.#store.isLatestFetch(seq)) {
                void this.#store.saveOfflineSnapshot('sightings', conditions);
            }
        } finally {
            this.#store.disableLoading();
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
        this.#store.setSelectedTripId(null);
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
        // 見つからない表示のときは Router を通し、URL の値を確かめ直す（replaceState では paramMap が動かない）
        if (this.notFound()) {
            this.#navigate(overrides);
            return;
        }
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
        if (this.#store.selectedRouteIds().join(',') !== routeIds.join(',')) {
            this.#store.setSelectedRouteIds(routeIds);
        }
        this.#store.setDirectionFilter(directionFilter);
        this.#store.setSelectedTripId(null);
        this.#lastParamsKey = `${this.#store.calendarId()}|${routeIds.join(',')}|${directionFilter}`;
        this.#replaceUrl(params);
    }
}
