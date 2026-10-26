import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    PLATFORM_ID,
    computed,
    inject,
    signal,
} from '@angular/core';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { format } from 'date-fns';
import { lastValueFrom } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { runIntervalInBrowser } from 'src/app/core/utils/run-interval-in-browser';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { buildStationNameById } from 'src/app/shared/station-name-by-id.util';
import {
    estimatePositions,
    findContinuations,
} from 'src/app/shared/train-position.util';
import { TrainLocationStationPanelComponent } from './components/train-location-station-panel/train-location-station-panel.component';
import { TrainLocationControllerComponent } from './components/train-location-controller/train-location-controller.component';
import { TrainLocationLineComponent } from './components/train-location-line/train-location-line.component';
import { TrainLocationService } from './services/train-location.service';
import {
    TrainLocationMode,
    TrainLocationSightingsSnapshot,
    TrainLocationSnapshot,
    TrainLocationStore,
} from './stores/train-location.store';
import { applyContinuationsToCards } from './utils/apply-continuations-to-cards.util';
import { buildInterchangeRoutesByStationId } from './utils/build-interchange-routes-by-station-id.util';
import {
    buildStationArrivals,
    STATION_ARRIVALS_LIMIT,
} from './utils/build-station-arrivals.util';
import { buildTrainLocationCards } from './utils/build-train-location-cards.util';
import { buildTrainLocationRows } from './utils/build-train-location-rows.util';
import { determineMajorStations } from './utils/determine-major-stations.util';
import { orientStationAxis } from './utils/orient-station-axis.util';
import {
    formatTimeParam,
    fromTimeInputValue,
    parseTimeParam,
    toDateWithTime,
    toTimeInputValue,
} from './utils/parse-time-param.util';
import {
    readRememberedStationId,
    writeRememberedStationId,
} from './utils/train-location-storage.util';
import { formatTrainLocationSummary } from './utils/train-location-summary.util';

const CURRENT_TIME_REFRESH_MS = 10_000;

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（train-diagram と同一パターン）
TrainLocationStore.resetLoading();

// 取得の世代番号。ストアと同じくモジュールに置き、ページのインスタンスをまたいで一意にする
// （離れてすぐ戻ったとき、前のインスタンスの取得の終わりが新しい骨組みを消さないように）
let fetchSeq = 0;

/** 圏外のために保存する中身のキー */
const OFFLINE_SNAPSHOT_KEY = 'TrainLocation';

/** 圏外のために保存する目撃のキー（目撃は Service Worker に残らないので別に保存する） */
const OFFLINE_SIGHTINGS_SNAPSHOT_KEY = 'TrainLocationSightings';

@Component({
    selector: 'app-train-location',
    templateUrl: './train-location.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // 枠だけのページ（spec 4 章）。保存した中身・ログイン状態で形が変わるので、
    // サーバーの HTML（読み込み中の骨組み）を引き継がず、ブラウザで描き直す
    host: { ngSkipHydration: 'true' },
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        SkeletonBarComponent,
        TrainLocationControllerComponent,
        TrainLocationLineComponent,
        TrainLocationStationPanelComponent,
        RouterLink,
    ],
})
export class TrainLocationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #trainLocationService = inject(TrainLocationService);
    readonly #offlineSnapshots = inject(OfflineSnapshots);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);

    readonly isLoading = toSignal(TrainLocationStore.isLoading$);
    readonly hasFetchedTrainLocation = toSignal(
        TrainLocationStore.hasFetchedTrainLocation$,
        { initialValue: false },
    );
    /** 骨組みの駅の行の数（画面 1 枚分を埋める数。あふれた分はカードが隠す） */
    readonly skeletonStationRows = Array.from({ length: 16 }, (_, i) => i);
    readonly calendarId = toSignal(TrainLocationStore.calendarId$, {
        initialValue: null,
    });
    readonly selectedRouteId = toSignal(TrainLocationStore.selectedRouteId$, {
        initialValue: null,
    });
    readonly mode = toSignal(TrainLocationStore.mode$, {
        initialValue: 'now' as TrainLocationMode,
    });
    readonly specifiedTime = toSignal(TrainLocationStore.specifiedTime$, {
        initialValue: null,
    });
    readonly stationAxisStations = toSignal(
        TrainLocationStore.stationAxisStations$,
        { initialValue: [] },
    );
    readonly tripBlocksByDirection = toSignal(
        TrainLocationStore.tripBlocksByDirection$,
        { initialValue: {} },
    );
    readonly #itineraryLinks = toSignal(TrainLocationStore.itineraryLinks$, {
        initialValue: [],
    });
    readonly operationSightingTimeCrossSections = toSignal(
        TrainLocationStore.operationSightingTimeCrossSections$,
        { initialValue: {} },
    );

    readonly todaysCalendarIds = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarIds$,
        { initialValue: [] },
    );
    readonly #operatingSystemEndsByRouteId = toSignal(
        this.#routeStationListStateQuery.operatingSystemEndsByRouteId$,
        { initialValue: {} },
    );
    readonly #routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    readonly #calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly isTodaySelected = computed(() =>
        this.todaysCalendarIds().includes(this.calendarId() ?? ''),
    );

    /** 現在時刻モードの 10 秒周期追従用。時刻指定モードでは参照しない。 */
    readonly #now = signal(new Date());

    readonly at = computed<Date>(() => {
        if (this.mode() === 'specified') {
            const parsed = parseTimeParam(this.specifiedTime());
            return parsed ? toDateWithTime(new Date(), parsed) : new Date();
        }
        return this.#now();
    });

    readonly #allTripBlocks = computed(() =>
        Object.values(this.tripBlocksByDirection()).flat(),
    );

    readonly #majorStationIds = computed(() => {
        const axisStationIds = new Set(
            this.stationAxisStations().map((s) => s.stationId),
        );
        return determineMajorStations(this.#allTripBlocks(), axisStationIds);
    });

    readonly #stationNameById = computed(() =>
        buildStationNameById(this.#routeStations()),
    );

    /** stationId → その駅を含む路線名（図の外を走る列車の「いま ○○線内」に使う） */
    readonly #routeNamesByStationId = computed(() => {
        const map = new Map<string, string[]>();
        for (const route of this.#routeStations()) {
            if (!route.routeName) {
                continue;
            }
            for (const rsl of route.routeStationLists ?? []) {
                const stationId = rsl.station?.stationId;
                if (!stationId) {
                    continue;
                }
                const names = map.get(stationId) ?? [];
                if (!names.includes(route.routeName)) {
                    names.push(route.routeName);
                }
                map.set(stationId, names);
            }
        }
        return map;
    });

    /** 編成の所属会社名解決用（agencyId → agencyName）。グローバル AgencyList 由来。 */
    readonly #agencyNameById = computed(() => {
        const map = new Map<string, string>();
        for (const agency of this.#agencies()) {
            if (agency.agencyId && agency.agencyName) {
                map.set(agency.agencyId, agency.agencyName);
            }
        }
        return map;
    });

    readonly #cardsById = computed(() =>
        buildTrainLocationCards(
            this.#allTripBlocks(),
            this.operationSightingTimeCrossSections(),
            this.isTodaySelected(),
            this.calendarId() ?? '',
            this.#stationNameById(),
            this.#agencyNameById(),
        ),
    );

    readonly positions = computed(() =>
        estimatePositions(
            this.#allTripBlocks(),
            this.stationAxisStations(),
            this.at(),
            this.#itineraryLinks(),
        ),
    );

    /** 選択中路線を除く、他ルートに属する乗換路線を stationId 別に引くためのマップ */
    readonly #interchangeRoutesByStationId = computed(() =>
        buildInterchangeRoutesByStationId(
            this.#routeStations(),
            this.selectedRouteId(),
        ),
    );

    /** 図の駅の並び。上りの列車がいつも図の上へ進む向き（新横浜線などは起点→終点を裏返す。向きは運行系統から） */
    readonly #orientedStationAxis = computed(() =>
        orientStationAxis(
            this.stationAxisStations(),
            this.#operatingSystemEndsByRouteId()[this.selectedRouteId() ?? ''],
        ),
    );

    /** 図のカード。種別が変わる駅に着いて停車中の列車は変更後の種別・列番 */
    readonly #mapCardsById = computed(() =>
        applyContinuationsToCards(
            this.#cardsById(),
            findContinuations(this.#allTripBlocks()),
            this.positions(),
        ),
    );

    readonly rows = computed(() =>
        buildTrainLocationRows(
            this.#orientedStationAxis(),
            this.positions(),
            this.#mapCardsById(),
            this.#majorStationIds(),
            this.#interchangeRoutesByStationId(),
        ),
    );

    /**
     * G12: ロード完了後に、その時刻に在線している列車（カード）が1本も無いか。
     * 駅軸（駅ライン）は残したまま、この状態のとき空文脈メッセージを重ねて表示する。
     * 単一路線選択で駅軸は常に非空のため「駅軸0件」ではなく「在線0本」で判定する。
     */
    readonly hasNoTrainsInService = computed(() => {
        if (!this.hasFetchedTrainLocation()) return false;
        return this.positions().length === 0;
    });
    /** 時刻指定モードのみ「現在時刻に戻す」を次アクションとして提示する。 */
    readonly emptyStateActionLabel = computed(() =>
        this.mode() === 'specified' ? '現在時刻を表示する' : undefined,
    );
    /** 時刻指定モードでは時刻変更を促す補足文を出す（現在時刻モードでは省略）。 */
    readonly emptyStateSubtitle = computed(() =>
        this.mode() === 'specified'
            ? '時刻を変えてお試しください。'
            : undefined,
    );

    readonly clockText = computed(() => format(this.at(), 'HH:mm:ss'));
    readonly timeInputValue = computed(() => {
        const parsed = parseTimeParam(this.specifiedTime());
        return parsed ? toTimeInputValue(parsed) : format(new Date(), 'HH:mm');
    });

    /** 細帯の要約に出す路線名（選択中路線を #routeStations から引く） */
    readonly #routeName = computed(
        () =>
            this.#routeStations().find(
                (route) => route.routeId === this.selectedRouteId(),
            )?.routeName,
    );
    /** 細帯の要約に出すダイヤ名（calendarId() から calendars() を引く） */
    readonly #calendarName = computed(
        () =>
            this.#calendars().find(
                (calendar) => calendar.calendarId === this.calendarId(),
            )?.calendarName,
    );
    readonly bandSummary = computed(() =>
        formatTrainLocationSummary({
            routeName: this.#routeName(),
            mode: this.mode(),
            timeText: this.timeInputValue(),
            calendarName: this.#calendarName(),
        }),
    );

    readonly #selectedStationIdParam = toSignal(
        TrainLocationStore.selectedStationId$,
        { initialValue: null },
    );

    /** 駅軸に無い駅（路線を変えた直後など）は未選択として扱う */
    readonly selectedStationId = computed(() => {
        const id = this.#selectedStationIdParam();
        return id && this.stationAxisStations().some((s) => s.stationId === id)
            ? id
            : null;
    });

    readonly selectedStationName = computed(() => {
        const id = this.selectedStationId();
        return id ? (this.#stationNameById().get(id) ?? '') : '';
    });

    readonly selectedStationInterchangeRoutes = computed(() => {
        const id = this.selectedStationId();
        return id ? (this.#interchangeRoutesByStationId().get(id) ?? []) : [];
    });

    readonly arrivals = computed(() => {
        const stationId = this.selectedStationId();
        if (!stationId) {
            return { inbound: [], outbound: [] };
        }
        return buildStationArrivals({
            tripBlocks: this.#allTripBlocks(),
            stationId,
            at: this.at(),
            positions: this.positions(),
            cardsById: this.#cardsById(),
            stationNameById: this.#stationNameById(),
            routeNamesByStationId: this.#routeNamesByStationId(),
            limit: STATION_ARRIVALS_LIMIT,
        });
    });

    /** 現在アクティブ（停車中/走行中）な trip の operationNumber 一覧（充当編成番号の背景取得対象）。 */
    readonly #activeOperationNumbers = computed<string[]>(() => {
        const activeTripIds = new Set(this.positions().map((p) => p.tripId));
        const numbers = new Set<string>();
        for (const block of this.#allTripBlocks()) {
            for (const trip of block.trips ?? []) {
                if (!trip.tripId || !activeTripIds.has(trip.tripId)) {
                    continue;
                }
                const operationNumber =
                    trip.tripOperationLists?.[0]?.operation?.operationNumber;
                if (operationNumber) {
                    numbers.add(operationNumber);
                }
            }
        }
        return Array.from(numbers);
    });

    readonly #firstLoadDone = signal(false);
    /**
     * ストアのダイヤと路線の組が、今の条件と合っているか。路線だけ・ダイヤだけの取り直しは、
     * この組が合っているときだけ圏外用に保存する（前の取得が失敗していると、新旧が混ざった中身になるため）
     */
    #storeInSync = false;
    /** ストアの前後の運用（つながり）が、取得の失敗で空のまま劣化しているか。取れたら消す */
    #isLinksDegraded = false;
    /**
     * 目撃を圏外用の保存から戻して知らせた条件（date を含む）。
     * 圏外の間は 10 秒ごとに取得に失敗するので、同じ条件では 1 回しか戻さず知らせない。
     * 目撃が取れたら消す（次に圏外になったらまた 1 回だけ知らせる）
     */
    #sightingsRestoredFor: string | null = null;

    constructor() {
        // ストアは訪問をまたいで残る。前の訪問の「取り終えた」で前の路線図が一瞬出ないようにする
        TrainLocationStore.setHasFetchedTrainLocation(false);

        runIntervalInBrowser(CURRENT_TIME_REFRESH_MS, () =>
            this.#now.set(new Date()),
        );

        // 枠だけのページ。中身は刻々と変わるので、サーバーでは URL を補わず取りもしない（spec 4 章）
        if (isPlatformServer(inject(PLATFORM_ID))) return;

        toObservable(this.#activeOperationNumbers)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((operationNumbers) => {
                if (!this.isTodaySelected() || !operationNumbers.length) {
                    return;
                }
                void this.fetchOperationSightings(operationNumbers);
            });

        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const routeIdParam = paramMap.get('route_id');
                const routeId = routeIdParam ?? this.#defaultRouteId();
                const stationIdParam = paramMap.get('station_id');
                const rememberedStationId =
                    routeId && !stationIdParam
                        ? readRememberedStationId(routeId)
                        : null;

                if (routeId && (!routeIdParam || rememberedStationId)) {
                    this.#router.navigate(
                        [
                            '/train-location',
                            {
                                ...this.#route.snapshot.params,
                                route_id: routeId,
                                ...(rememberedStationId
                                    ? { station_id: rememberedStationId }
                                    : {}),
                            },
                        ],
                        { replaceUrl: true },
                    );
                    return;
                }

                const timeParam = paramMap.get('time');
                const mode: TrainLocationMode = timeParam ? 'specified' : 'now';
                const todaysCalendarId =
                    this.#todaysCalendarListStateQuery.todaysCalendarId;
                const calendarId =
                    mode === 'specified'
                        ? (paramMap.get('calendar_id') ?? todaysCalendarId)
                        : todaysCalendarId;

                const routeChanged =
                    TrainLocationStore.selectedRouteId !== (routeId ?? null);
                const calendarChanged =
                    TrainLocationStore.calendarId !== (calendarId ?? null);

                TrainLocationStore.setSelectedRouteId(routeId ?? null);
                TrainLocationStore.setSelectedStationId(stationIdParam);
                TrainLocationStore.setCalendarId(calendarId ?? null);
                TrainLocationStore.setMode(mode);
                TrainLocationStore.setSpecifiedTime(
                    mode === 'specified' ? (timeParam ?? null) : null,
                );

                const refetchTripBlocks =
                    calendarChanged || !this.#firstLoadDone();
                const refetchStationAxis =
                    routeChanged || !this.#firstLoadDone();
                if (refetchTripBlocks || refetchStationAxis) {
                    this.fetchData({ refetchTripBlocks, refetchStationAxis });
                }
            });
    }

    #defaultRouteId(): string | undefined {
        return this.#routeStations()[0]?.routeId;
    }

    async fetchData(flags: {
        refetchTripBlocks: boolean;
        refetchStationAxis: boolean;
    }): Promise<void> {
        const seq = ++fetchSeq;
        const conditions = {
            calendarId: TrainLocationStore.calendarId,
            routeId: TrainLocationStore.selectedRouteId,
        };
        TrainLocationStore.enableLoading();
        TrainLocationStore.setHasFetchedTrainLocation(false);

        // フェッチ失敗（reject）時にも loadingQueue を必ず戻す
        // （finally が無いと isLoading が true のまま回復不能になる）
        try {
            // 運行は種別を貼り付けるので種別の後。駅軸はどちらにも依存しないので並行に取る
            const fetchTripBlocks = async (): Promise<void> => {
                if (!this.#firstLoadDone()) {
                    await lastValueFrom(
                        this.#trainLocationService.fetchTripClasses(),
                    );
                }
                if (flags.refetchTripBlocks) {
                    // 失敗を決める前に両方の終わりを待つ（遅れて届いた成功が、戻した中身を上書きしないように）
                    const results = await Promise.allSettled([
                        lastValueFrom(
                            this.#trainLocationService.fetchTripBlocks(),
                        ),
                        // 折返しの判定用。取れなくても空として扱うので路線図は止めない
                        lastValueFrom(
                            this.#trainLocationService.fetchItineraryLinks(),
                        ),
                    ]);
                    const rejected = results.find(
                        (result): result is PromiseRejectedResult =>
                            result.status === 'rejected',
                    );
                    if (rejected) {
                        throw rejected.reason;
                    }
                    // 前後の運用が取れなかった中身は、圏外用に保存しない（良い保存を空のつながりで上書きしない）
                    const linksResult = results[1];
                    const hasLinksFailed =
                        linksResult.status === 'fulfilled' &&
                        !!linksResult.value?.failed;
                    // 取れなかったら、ストアのつながりは劣化したまま（路線だけの取り直しでも保存しない）。
                    // 古い取得が成功しても、新しい取得の印は消さない
                    if (hasLinksFailed) {
                        this.#isLinksDegraded = true;
                    } else if (seq === fetchSeq) {
                        this.#isLinksDegraded = false;
                    }
                }
            };
            const results = await Promise.allSettled([
                fetchTripBlocks(),
                flags.refetchStationAxis
                    ? lastValueFrom(
                          this.#trainLocationService.fetchStationAxis(),
                      )
                    : undefined,
            ]);
            const failure = results.find(
                (result): result is PromiseRejectedResult =>
                    result.status === 'rejected',
            );
            if (failure) {
                // 前の取得が失敗したら、ストアのダイヤと路線の組はずれているかもしれない
                this.#storeInSync = false;
                // 通信できないときは、同じ条件で保存した中身を出す（古い取得の失敗では戻さない）。
                // 戻す処理が壊れていても、取得の失敗をそのまま投げる（読み込み中は finally で解く）。
                // 戻したときは初回扱いのまま（次に通信できたら取り直す）
                if (seq === fetchSeq) {
                    try {
                        await this.#offlineSnapshots.restore({
                            key: OFFLINE_SNAPSHOT_KEY,
                            conditions,
                            apply: (data: TrainLocationSnapshot) =>
                                TrainLocationStore.restoreSnapshot(data),
                        });
                    } catch {
                        // 保存した中身が壊れていても、取得の失敗を優先する
                    }
                }
                throw failure.reason;
            }
            // ダイヤと路線の両方を取り直したか、前の取得が成功していたときだけ、ストアの中身が条件と組になっている
            // 古い取得で終わったときは、新しい取得とのあいだで組がずれているかもしれない
            if (seq !== fetchSeq) {
                this.#storeInSync = false;
            } else if (flags.refetchTripBlocks && flags.refetchStationAxis) {
                this.#storeInSync = true;
            }
            // 取得がすべて成功した中身を、次に圏外のときのために保存する
            if (
                !this.#isLinksDegraded &&
                this.#storeInSync &&
                seq === fetchSeq
            ) {
                void this.#offlineSnapshots.save({
                    key: OFFLINE_SNAPSHOT_KEY,
                    conditions,
                    data: TrainLocationStore.snapshot(),
                });
            }
            this.#firstLoadDone.set(true);
        } finally {
            TrainLocationStore.disableLoading();
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === fetchSeq) {
                TrainLocationStore.setHasFetchedTrainLocation(true);
            }
        }
    }

    /**
     * 動いている列車の運用の目撃を、まだ取っていない分だけ取る。
     * 目撃は Service Worker に残らないので、列車の保存とは別に、日付つきで圏外用に保存する。
     * 取れなかったら同じ日の保存を戻し、失敗は今までどおり投げる（戻す処理が壊れていても同じ）。
     */
    async fetchOperationSightings(
        operationNumbers: readonly string[],
    ): Promise<void> {
        const conditions = {
            calendarId: TrainLocationStore.calendarId,
            routeId: TrainLocationStore.selectedRouteId,
            date: format(getRailwayDate(new Date()), 'yyyy-MM-dd'),
        };
        let fetched: boolean;
        try {
            fetched = await lastValueFrom(
                this.#trainLocationService.fetchMissingOperationSightingTimeCrossSections(
                    operationNumbers,
                ),
            );
        } catch (error) {
            // すでに取れている目撃は残す。同じ条件ですでに戻して知らせていたら、失敗だけ投げる
            const restoredKey = JSON.stringify(conditions);
            if (this.#sightingsRestoredFor === restoredKey) {
                throw error;
            }
            this.#sightingsRestoredFor = restoredKey;
            try {
                await this.#offlineSnapshots.restore({
                    key: OFFLINE_SIGHTINGS_SNAPSHOT_KEY,
                    conditions,
                    apply: (data: TrainLocationSightingsSnapshot) =>
                        TrainLocationStore.restoreOperationSightingTimeCrossSections(
                            {
                                ...data,
                                ...TrainLocationStore.operationSightingTimeCrossSections,
                            },
                        ),
                });
            } catch {
                // 保存した中身が壊れていても、取得の失敗を優先する
            }
            throw error;
        }
        if (fetched) {
            this.#sightingsRestoredFor = null;
            void this.#offlineSnapshots.save({
                key: OFFLINE_SIGHTINGS_SNAPSHOT_KEY,
                conditions,
                data: TrainLocationStore.snapshotOperationSightingTimeCrossSections(),
            });
        }
    }

    onCalendarIdChange(calendarId: string): void {
        if (this.mode() !== 'specified') {
            return;
        }
        this.#navigate({ calendar_id: calendarId });
    }

    onRouteIdChange(routeId: string): void {
        const { station_id, ...rest } = this.#route.snapshot.params;
        void station_id;
        this.#router.navigate([
            '/train-location',
            { ...rest, route_id: routeId },
        ]);
    }

    onStationSelect(stationId: string): void {
        const routeId = this.selectedRouteId();
        if (routeId) {
            writeRememberedStationId(routeId, stationId);
        }
        this.#navigate({ station_id: stationId });
    }

    /** G12: 空状態の次アクション（時刻指定モード時のみ）。現在時刻モードへ戻す。 */
    onEmptyStateAction(): void {
        if (this.mode() !== 'specified') return;
        this.onModeChange('now');
    }

    onModeChange(mode: TrainLocationMode): void {
        if (mode === 'specified') {
            const timeValue = formatTimeParam({
                hours: this.at().getHours(),
                minutes: this.at().getMinutes(),
            });
            this.#navigate({
                time: timeValue,
                calendar_id:
                    this.calendarId() ??
                    this.#todaysCalendarListStateQuery.todaysCalendarId ??
                    '',
            });
            return;
        }
        this.#navigateWithoutTimeParams();
    }

    onTimeInputValueChange(value: string): void {
        const parsed = fromTimeInputValue(value);
        if (!parsed) {
            return;
        }
        this.#navigate({
            time: formatTimeParam(parsed),
            calendar_id:
                this.calendarId() ??
                this.#todaysCalendarListStateQuery.todaysCalendarId ??
                '',
        });
    }

    #navigate(overrides: Record<string, string>): void {
        const params = { ...this.#route.snapshot.params, ...overrides };
        this.#router.navigate(['/train-location', params]);
    }

    #navigateWithoutTimeParams(): void {
        const { time, calendar_id, ...rest } = this.#route.snapshot.params;
        void time;
        void calendar_id;
        this.#router.navigate(['/train-location', rest]);
    }
}
