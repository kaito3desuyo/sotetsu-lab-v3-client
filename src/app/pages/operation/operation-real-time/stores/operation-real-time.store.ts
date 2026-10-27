import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withFeature,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { addDays, getHours, parse } from 'date-fns';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { normalizeGroupNames } from 'src/app/shared/operation-group.util';

type StoreProps = {
    routes: RouteDetailsDto[];
    /** 編成順カードの会社の並び（agencyId）。相鉄と直通を始めた順（agenciesInThroughServiceOrder） */
    agencyOrder: string[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    calendar: CalendarDetailsDto;
    operations: OperationDetailsDto[];
    /** 運用のつながり（乗り移りの端の判定用）。永続化しない */
    itineraryLinks: OperationItineraryLinkDto[];
    formations: FormationDetailsDto[];
    /**
     * 運用・編成を 1 回でも取ったか。空の配列だけでは「まだ取っていない」と「0 件」を区別できない。
     * 取る前の表は画面 1 枚分の高さを取っておく（下の投稿カードが押し出されて CLS になるため）
     */
    hasFetchedOperations: boolean;
    hasFetchedFormations: boolean;
    operationGroups: OperationGroupDto[];
    selectedAgencyIds: string[];
    selectedGroupNames: string[];
    operationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    formationSightingTimeCrossSections: Record<
        string,
        OperationSightingTimeCrossSectionDto
    >;
    operationSightingHistories: Record<string, OperationSightingDetailsDto[]>;
    formationSightingHistories: Record<string, OperationSightingDetailsDto[]>;
    currentPositions: Record<string, OperationCurrentPositionDto>;
    finalUpdateTime: number;
    loadingQueue: boolean[];
    isEnableAutoReload: boolean;
    isVisibleSightingHistories: boolean;
    isVisibleCurrentPosition: boolean;
    /** このページを開いて最初の取得がまだ終わっていないか（最初の 1 回だけ最終更新を今にする） */
    firstLoading: boolean;
};

/**
 * 圏外のために端末に保存する中身。画面の設定（絞り込み・トグル）と最終更新・読み込み中は入れない。
 */
export type OperationRealTimeSnapshot = Pick<
    StoreProps,
    | 'routes'
    | 'agencyOrder'
    | 'stations'
    | 'tripClasses'
    | 'calendar'
    | 'operations'
    | 'itineraryLinks'
    | 'formations'
    | 'operationGroups'
    | 'operationSightingTimeCrossSections'
    | 'formationSightingTimeCrossSections'
    | 'operationSightingHistories'
    | 'formationSightingHistories'
    | 'currentPositions'
>;

export const OperationRealTimeStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(() => ({
        routes: [],
        agencyOrder: [],
        stations: [],
        tripClasses: [],
        calendar: null,
        operations: [],
        itineraryLinks: [],
        formations: [],
        hasFetchedOperations: false,
        hasFetchedFormations: false,
        operationGroups: [],
        selectedAgencyIds: [],
        selectedGroupNames: [],
        operationSightingTimeCrossSections: {},
        formationSightingTimeCrossSections: {},
        operationSightingHistories: {},
        formationSightingHistories: {},
        currentPositions: {},
        finalUpdateTime: Math.floor(Date.now() / 1000),
        loadingQueue: [],
        isEnableAutoReload: true,
        isVisibleSightingHistories: true,
        isVisibleCurrentPosition: true,
        firstLoading: true,
    })),
    withComputed(
        ({
            operations,
            formations,
            agencyOrder,
            selectedGroupNames,
            loadingQueue,
        }) => ({
            /** 運用番号の順に並べた運用（休車の 100 は含まない。state の operations は取得した順のまま） */
            sortedOperations: computed(() =>
                operations()
                    .filter((o) => o.operationNumber !== '100')
                    .sort(
                        (a, b) =>
                            Number(
                                generateOperationSortNumber(a.operationNumber),
                            ) -
                            Number(
                                generateOperationSortNumber(b.operationNumber),
                            ),
                    ),
            ),
            /**
             * 編成順カードの並び。会社は相鉄と直通を始めた順（会社チップと同じ。2026-09-24）、会社内は編成番号の順。
             * 以前の「相鉄・JR東日本・東急」の決め打ちはこの歴史による。ほかの会社に順位が無かったので、
             * 一覧（THROUGH_SERVICE_AGENCY_ORDER）で持つようにした。
             * state の formations は取得した順のまま。
             */
            sortedFormations: computed(() => {
                const order = agencyOrder();
                const rank = (agencyId: string): number => {
                    const index = order.indexOf(agencyId);
                    return index < 0 ? Infinity : index;
                };
                return [...formations()]
                    .sort(
                        (a, b) =>
                            Number(a.formationNumber) -
                            Number(b.formationNumber),
                    )
                    .sort((a, b) => rank(a.agencyId) - rank(b.agencyId));
            }),
            // 2026-10-06 より前に保存した群名（「3G群」など）は今の名前に置き換える
            normalizedSelectedGroupNames: computed(() =>
                normalizeGroupNames(selectedGroupNames()),
            ),
            isLoading: computed(() => loadingQueue().length > 0),
        }),
    ),
    withMethods((store) => ({
        setAgencyOrder(agencyIds: string[]): void {
            patchState(store, { agencyOrder: agencyIds });
        },
        setRoutes(routes: RouteDetailsDto[]): void {
            patchState(store, { routes });
        },
        setStations(stations: StationDetailsDto[]): void {
            patchState(store, { stations });
        },
        setItineraryLinks(links: OperationItineraryLinkDto[]): void {
            patchState(store, { itineraryLinks: links });
        },
        setTripClasses(tripClasses: TripClassDetailsDto[]): void {
            patchState(store, { tripClasses });
        },
        setCalendar(calendar: CalendarDetailsDto): void {
            patchState(store, { calendar });
        },
        setOperations(operations: OperationDetailsDto[]): void {
            patchState(store, { operations, hasFetchedOperations: true });
        },
        setFormations(formations: FormationDetailsDto[]): void {
            patchState(store, { formations, hasFetchedFormations: true });
        },
        setOperationGroups(operationGroups: OperationGroupDto[]): void {
            patchState(store, { operationGroups });
        },
        setSelectedAgencyIds(agencyIds: string[]): void {
            patchState(store, { selectedAgencyIds: agencyIds });
        },
        setSelectedGroupNames(groupNames: string[]): void {
            patchState(store, { selectedGroupNames: groupNames });
        },
        setOperationSightingTimeCrossSection(
            operationNumber: string,
            timeCrossSection: OperationSightingTimeCrossSectionDto,
        ): void {
            patchState(store, (state) => ({
                operationSightingTimeCrossSections: {
                    ...state.operationSightingTimeCrossSections,
                    [operationNumber]: timeCrossSection,
                },
            }));
        },
        setFormationSightingTimeCrossSection(
            formationNumber: string,
            timeCrossSection: OperationSightingTimeCrossSectionDto,
        ): void {
            patchState(store, (state) => ({
                formationSightingTimeCrossSections: {
                    ...state.formationSightingTimeCrossSections,
                    [formationNumber]: timeCrossSection,
                },
            }));
        },
        setOperationSightingHistory(
            operationNumber: string,
            histories: OperationSightingDetailsDto[],
        ): void {
            patchState(store, (state) => ({
                operationSightingHistories: {
                    ...state.operationSightingHistories,
                    [operationNumber]: histories,
                },
            }));
        },
        setFormationSightingHistory(
            formationNumber: string,
            histories: OperationSightingDetailsDto[],
        ): void {
            patchState(store, (state) => ({
                formationSightingHistories: {
                    ...state.formationSightingHistories,
                    [formationNumber]: histories,
                },
            }));
        },
        setCurrentPosition(
            operationNumber: string,
            currentPosition: OperationCurrentPositionDto,
        ): void {
            patchState(store, (state) => ({
                currentPositions: {
                    ...state.currentPositions,
                    [operationNumber]: currentPosition,
                },
            }));
        },
        setFinalUpdateTime(finalUpdateTime?: number): void {
            const time = finalUpdateTime ?? Math.floor(Date.now() / 1000);
            patchState(store, { finalUpdateTime: time });
        },
        /** 最初の取得が終わったか（終わったら false）。最初の 1 回だけ最終更新を今にするために使う */
        setFirstLoading(value: boolean): void {
            patchState(store, { firstLoading: value });
        },
        /** 圏外のために保存する中身を取り出す */
        snapshot(): OperationRealTimeSnapshot {
            return {
                routes: store.routes(),
                agencyOrder: store.agencyOrder(),
                stations: store.stations(),
                tripClasses: store.tripClasses(),
                calendar: store.calendar(),
                operations: store.operations(),
                itineraryLinks: store.itineraryLinks(),
                formations: store.formations(),
                operationGroups: store.operationGroups(),
                operationSightingTimeCrossSections:
                    store.operationSightingTimeCrossSections(),
                formationSightingTimeCrossSections:
                    store.formationSightingTimeCrossSections(),
                operationSightingHistories: store.operationSightingHistories(),
                formationSightingHistories: store.formationSightingHistories(),
                currentPositions: store.currentPositions(),
            };
        },
        /**
         * 保存した中身を戻す（画面の設定は今のまま）。
         * 「最終更新」には保存した時刻（epoch ミリ秒）を出す。
         * 運用・編成は保存できた時点で取得済みなので、骨組みではなく中身を出す。
         */
        restoreSnapshot(
            data: OperationRealTimeSnapshot,
            savedAt: number,
        ): void {
            patchState(store, {
                routes: data.routes,
                agencyOrder: data.agencyOrder,
                stations: data.stations,
                tripClasses: data.tripClasses,
                calendar: data.calendar,
                operations: data.operations,
                itineraryLinks: data.itineraryLinks,
                formations: data.formations,
                hasFetchedOperations: true,
                hasFetchedFormations: true,
                operationGroups: data.operationGroups,
                operationSightingTimeCrossSections:
                    data.operationSightingTimeCrossSections,
                formationSightingTimeCrossSections:
                    data.formationSightingTimeCrossSections,
                operationSightingHistories: data.operationSightingHistories,
                formationSightingHistories: data.formationSightingHistories,
                currentPositions: data.currentPositions,
                finalUpdateTime: Math.floor(savedAt / 1000),
            });
        },
        enableLoading(): void {
            patchState(store, (state) => ({
                loadingQueue: state.loadingQueue.concat(true),
            }));
        },
        disableLoading(): void {
            patchState(store, (state) => ({
                loadingQueue: state.loadingQueue.slice(1),
            }));
        },
        resetLoading(): void {
            patchState(store, { loadingQueue: [] });
        },
        /** 運用・編成を取得済みとする印を外す（テストで、前のテストの取得を持ち越さないため） */
        resetHasFetched(): void {
            patchState(store, {
                hasFetchedOperations: false,
                hasFetchedFormations: false,
            });
        },
        setIsEnableAutoReload(isEnable: boolean): void {
            patchState(store, { isEnableAutoReload: isEnable });
        },
        setIsVisibleSightingHistories(isVisible: boolean): void {
            patchState(store, { isVisibleSightingHistories: isVisible });
        },
        setIsVisibleCurrentPosition(isVisible: boolean): void {
            patchState(store, { isVisibleCurrentPosition: isVisible });
        },
        /**
         * 今の時刻に照らして、現在位置を取り直すべき運用。
         * 時刻に依存するので computed にせず、呼ばれるたびに今を見る。
         */
        currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
            const currentPositions = store.currentPositions();
            const now = new Date();
            const target = (days: number, time: string) =>
                addDays(
                    parse(time, 'HH:mm:ss', now),
                    days - (getHours(now) < 4 ? 1 : 0) - 1,
                );

            return Object.values(currentPositions)
                .filter((position) => !!position)
                .filter(({ prev, current, next }) => {
                    // 出庫前
                    if (!prev && !current && !!next) {
                        return (
                            now >=
                            target(
                                next.startTime.departureDays,
                                next.startTime.departureTime,
                            )
                        );
                    }

                    // 走行中
                    if (!prev && !!current && !next) {
                        return (
                            now >=
                            target(
                                current.endTime.arrivalDays,
                                current.endTime.arrivalTime,
                            )
                        );
                    }

                    // 間隙時間
                    if (!!prev && !current && !!next) {
                        return (
                            now >=
                            target(
                                next.startTime.departureDays,
                                next.startTime.departureTime,
                            )
                        );
                    }

                    // 入庫済み
                    if (!!prev && !current && !next) {
                        return false;
                    }

                    return false;
                });
        },
    })),
    // 保存するのは UI 選択状態のみ（B2/B3: フィルタ選択・トグルの復元）。
    //
    // かつては全ストアを永続化していたが、復元は {...state, ...snapshot} の後勝ちマージで、
    // localForage(IndexedDB) の復元は非同期のため、フェッチ済みの新鮮なデータ props
    // （operationGroups / currentPositions 等）を過去セッションのスナップショット
    // （群フェッチ完了前に保存された空配列を含む）で上書きしていた。
    // これが「運用群チップが『休』のみになる」（98 §G2 A3）・
    // 「カードの現在位置行が消える」（同 A4）の真因。
    // データ props を保存対象から外すことで、復元がデータを壊す経路を絶つ。
    // 旧形式（全ストア永続化時代）の保存値に残るデータ props は、読むときに捨てる
    withSettingsStorage<StoreProps>({
        key: 'OperationRealTimeStore',
        fields: [
            'selectedAgencyIds',
            'selectedGroupNames',
            'isEnableAutoReload',
            'isVisibleSightingHistories',
            'isVisibleCurrentPosition',
        ],
        debounceMs: 1000,
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'OperationRealTime',
                select: () => store.snapshot(),
                apply: (data: OperationRealTimeSnapshot, savedAt: number) =>
                    store.restoreSnapshot(data, savedAt),
            },
        }),
    ),
    withAppDevtools('OperationRealTimeStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
