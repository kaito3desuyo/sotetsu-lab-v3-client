import { computed } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import {
    patchState,
    signalStore,
    withComputed,
    withFeature,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import { ownAgencyRouteIds } from 'src/app/shared/own-agency-route-ids.util';
import { hasVisibleStop, tripEndpoints } from '../utils/trip-endpoints.util';
import { traversedRouteIds } from '../utils/traversed-route-ids.util';
import { TimetableAllLineUtil } from '../utils/timetable-all-line.util';

type StoreProps = {
    calendarId: CalendarDetailsDto['calendarId'] | null;
    tripDirection: TripDetailsDto['tripDirection'] | null;
    tripBlockId: TripBlockDetailsDto['tripBlockId'] | null;
    stations: StationDetailsDto[];
    agencies: AgencyDetailsDto[];
    /** 路線チップの並び順（routeId）。ハンバーガーメニューの駅名選択・列車位置情報と同じ順 */
    routeOrder: string[];
    tripBlocks: TripBlockDetailsDto[];
    selectedRouteIds: string[];
    pageSettings: PageEvent;
    loadingQueue: boolean[];
    hasFetchedTripBlocks: boolean;
    /** 操作帯を畳んでいるか。これだけを端末に保存する（列車ダイヤグラムと同じ） */
    controlCollapsed: boolean;
};

/**
 * 圏外のために端末に保存する中身。条件（calendarId・tripDirection）と画面の設定
 * （選択中の路線・ページ送り・畳み状態）は入れない。
 */
export type TimetableAllLineSnapshot = Pick<
    StoreProps,
    'stations' | 'agencies' | 'routeOrder' | 'tripBlocks'
>;

const initialState: StoreProps = {
    calendarId: null,
    tripDirection: null,
    tripBlockId: null,
    stations: [],
    agencies: [],
    routeOrder: [],
    tripBlocks: [],
    selectedRouteIds: [],
    pageSettings: {
        pageIndex: 0,
        pageSize: 10,
        length: 0,
    },
    loadingQueue: [],
    hasFetchedTripBlocks: false,
    controlCollapsed: false,
};

/** 表示方向に並べ替えた駅リスト（上り = 逆順）。 */
function orderStations(
    stations: StationDetailsDto[],
    tripDirection: TripDetailsDto['tripDirection'] | null,
): StationDetailsDto[] {
    return tripDirection === 0 ? [...stations].reverse() : stations;
}

/**
 * ダイヤ並び替え済みの全列車（ページング前）。列は路線絞り込みの影響を受けない
 * （並びは全駅で決め、絞り込みは行を隠すだけ）。並べ方は sort-trips.util.ts を参照。
 */
function sortedAllTrips(
    orderedStations: StationDetailsDto[],
    tripBlocks: TripBlockDetailsDto[],
): TripDetailsDto[] {
    return TimetableAllLineUtil.sortTrips(orderedStations, tripBlocks).flatMap(
        (tripBlock) => tripBlock.trips,
    );
}

/** 駅の所属路線を、駅の並び順で重複なく集める（routeId・路線名・会社）。 */
function extractRoutes(
    stations: StationDetailsDto[],
): { routeId: string; routeName: string; agencyId?: string }[] {
    const seen = new Map<
        string,
        { routeId: string; routeName: string; agencyId?: string }
    >();
    for (const station of stations) {
        for (const rsl of station.routeStationLists ?? []) {
            const route = rsl.route;
            if (route?.routeId && !seen.has(route.routeId)) {
                seen.set(route.routeId, {
                    routeId: route.routeId,
                    routeName: route.routeName ?? '',
                    agencyId: route.agencyId,
                });
            }
        }
    }
    return [...seen.values()];
}

/**
 * 路線チップの選択肢。会社ごとにまとめ（`group` = 会社名）、会社は会社チップと同じ
 * 「相鉄と直通を始めた順」、会社の中の路線はハンバーガーメニューの駅名選択と同じ系統順
 * （RouteStationListState の整列順）にする（ユーザー指示 2026-09-24。列車位置情報・
 * 列車ダイヤグラムも同じ）。並び順に無い路線は、駅の並び順のまま後ろに付ける。
 */
function extractRouteOptions(
    stations: StationDetailsDto[],
    agencies: AgencyDetailsDto[],
    routeOrder: string[],
): FilterChipOption[] {
    const agencyNames = new Map(
        agencies.map((agency) => [agency.agencyId, agency.agencyName]),
    );
    const rank = (routeId: string): number => {
        const index = routeOrder.indexOf(routeId);
        return index < 0 ? Infinity : index;
    };
    const routesInOrder = extractRoutes(stations)
        .map((route, index) => ({ route, index }))
        .sort(
            (a, b) =>
                rank(a.route.routeId) - rank(b.route.routeId) ||
                a.index - b.index,
        )
        .map(({ route }) => route);
    // 会社のまとまりは会社チップと同じ「相鉄と直通を始めた順」（会社の中は系統順のまま）
    return sortByThroughServiceAgency(
        routesInOrder,
        (route) => route.agencyId,
        agencies,
    ).map((route) => ({
        value: route.routeId,
        label: route.routeName,
        group: route.agencyId ? agencyNames.get(route.agencyId) : undefined,
    }));
}

export const TimetableAllLineStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({
            stations,
            tripDirection,
            tripBlocks,
            selectedRouteIds,
            agencies,
            routeOrder,
            pageSettings,
            loadingQueue,
            calendarId,
            hasFetchedTripBlocks,
        }) => {
            const orderedStations = computed(() =>
                orderStations(stations(), tripDirection()),
            );
            const visibleStationList = computed(() =>
                visibleStations(orderedStations(), selectedRouteIds()),
            );
            // 並べ替えは 1 回 50〜90ms かかるので、computed で共有する（列・始発/終着の注釈）
            const sortedTrips = computed(() =>
                sortedAllTrips(orderedStations(), tripBlocks()),
            );
            /**
             * 列に出す列車。路線の絞り込み中は、表示駅に 1 つも停まらない（隠れた路線で完結する）列車を
             * 外す（ユーザー指示 2026-09-24）。並びは全駅で決めたものをそのまま使う。
             */
            const listedTrips = computed(() => {
                const trips = sortedTrips();
                const all = orderedStations();
                const visible = visibleStationList();
                if (visible.length >= all.length) return trips;
                const visibleIds = new Set(
                    visible.map((station) => station.stationId),
                );
                return trips.filter((trip) => hasVisibleStop(trip, visibleIds));
            });
            const pagedTrips = computed(() => {
                const settings = pageSettings();
                return listedTrips().filter(
                    (_, i) =>
                        settings.pageIndex * settings.pageSize <= i &&
                        i < (settings.pageIndex + 1) * settings.pageSize,
                );
            });

            return {
                /**
                 * ページ送りの設定。件数（length）は列に出す列車の本数（絞り込み後）。
                 * state の pageSettings（件数を持たない元の値）とは別物なので名前を分けている
                 */
                pagination: computed(() => ({
                    ...pageSettings(),
                    length: listedTrips().length,
                })),
                isLoading: computed(() => loadingQueue().length > 0),
                /** ダイヤがあって、まだ取り終えていない（骨組みを出すとき） */
                isAwaitingTripBlocks: computed(
                    () => !!calendarId() && !hasFetchedTripBlocks(),
                ),

                /**
                 * 表示駅（並び替え + 路線絞り込み済み）。
                 * state の stations（取得したままの駅）とは別物なので名前を分けている
                 */
                visibleStations: visibleStationList,

                /** ページングした表示列車（列）。絞り込み中は表示駅に停まらない列車を外してある。 */
                trips: pagedTrips,

                /**
                 * 表示中の列車ごとの、列の並びで 1 つ前の列車。ページ分けの前の並びから引くので、
                 * ページの先頭の列でも前のページの最後の列車が入る（同じ運行の「⬎」がページをまたいで消えていた）。
                 */
                previousTrips: computed(() => {
                    const listed = listedTrips();
                    const pagedIds = new Set(
                        pagedTrips().map((trip) => trip.tripId),
                    );
                    return new Map(
                        listed.flatMap((trip, i) =>
                            pagedIds.has(trip.tripId) && i > 0
                                ? [[trip.tripId, listed[i - 1]] as const]
                                : [],
                        ),
                    );
                }),

                /** 表示中の列車ごとの始発駅・終着駅とその時刻（表の上端・下端の行）。 */
                endpoints: computed(() => {
                    const names = new Map(
                        orderedStations().map((station) => [
                            station.stationId,
                            station.stationName,
                        ]),
                    );
                    return new Map(
                        pagedTrips().map((trip) => [
                            trip.tripId,
                            tripEndpoints(trip, names),
                        ]),
                    );
                }),

                /**
                 * 駅ごとの表示モード（着発2段/発のみ/着のみ）。本番（v2 以来）と同じく
                 * 駅名＋所属路線の一覧で決める（get-view-mode.util.ts）。ダイヤデータから
                 * 推し量る方式は普通の駅にも着行が増え、本番とずれたため戻した（2026-09-24）。
                 */
                viewModes: computed(
                    () =>
                        new Map(
                            visibleStationList().map((station) => [
                                station.stationId,
                                TimetableAllLineUtil.getViewMode(
                                    station,
                                    (tripDirection() ?? 1) as 0 | 1,
                                ),
                            ]),
                        ),
                ),

                /** 駅直後の罫線フラグ。本番と同じ駅一覧（get-border-setting.util.ts）で決める。 */
                bordersAfter: computed(
                    () =>
                        new Map(
                            visibleStationList().map((station) => [
                                station.stationId,
                                TimetableAllLineUtil.getBorderSetting(
                                    station,
                                    (tripDirection() ?? 1) as 0 | 1,
                                ),
                            ]),
                        ),
                ),

                routeOptions: computed(() =>
                    extractRouteOptions(stations(), agencies(), routeOrder()),
                ),
            };
        },
    ),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、コンポーネントでなくストアで数える
        let fetchSeq = 0;

        /** 絞り込みを変えると列の本数が変わるので 1 ページ目に戻す（範囲外に取り残さない）。 */
        const setSelectedRouteIds = (routeIds: FilterChipValue[]): void => {
            patchState(store, (state) => ({
                selectedRouteIds: routeIds.map((id) => String(id)),
                pageSettings: { ...state.pageSettings, pageIndex: 0 },
            }));
        };

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setCalendarId(calendarId: CalendarDetailsDto['calendarId']): void {
                patchState(store, { calendarId });
            },
            setTripDirection(
                tripDirection: TripDetailsDto['tripDirection'],
            ): void {
                patchState(store, { tripDirection });
            },
            /**
             * trip_block_id が変わったらページネーションを 0 に戻す（旧 resolver と同じ挙動）。
             */
            setTripBlockId(
                tripBlockId: TripBlockDetailsDto['tripBlockId'],
            ): void {
                const changed = store.tripBlockId() !== tripBlockId;
                patchState(store, { tripBlockId });
                if (changed) {
                    patchState(store, (state) => ({
                        pageSettings: { ...state.pageSettings, pageIndex: 0 },
                    }));
                }
            },
            setStations(stations: StationDetailsDto[]): void {
                patchState(store, { stations });
            },
            setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
                patchState(store, { tripBlocks });
            },
            setPageSettings(pageSettings: PageEvent): void {
                patchState(store, { pageSettings });
            },
            setSelectedRouteIds,
            setAgencies(agencies: AgencyDetailsDto[]): void {
                patchState(store, { agencies });
            },
            setRouteOrder(routeIds: string[]): void {
                patchState(store, { routeOrder: routeIds });
            },
            /**
             * 既定 = 自社（相鉄）の路線だけ ON（ユーザー指示 2026-09-24）。以前は全路線 ON。
             * 会社が引けないときは全路線 ON に戻る（ownAgencyRouteIds のフォールバック）。
             *
             * 列車番号のリンクから運行を絞り込んで開いたとき（tripBlockId あり）は、その運行が走る
             * 路線を ON にする。相鉄だけだと、他社線で完結する列車が消え、直通先の区間も隠れる。
             */
            initializeSelectedRouteIds(): void {
                const stations = store.stations();
                const traversed = store.tripBlockId()
                    ? traversedRouteIds(stations, store.tripBlocks())
                    : [];
                setSelectedRouteIds(
                    traversed.length
                        ? traversed
                        : ownAgencyRouteIds(
                              extractRoutes(stations),
                              store.agencies(),
                          ),
                );
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
            /** いまの条件の取得が終わったか（失敗しても true）。取る前は表と路線のチップの代わりに骨組みを出す */
            setHasFetchedTripBlocks(value: boolean): void {
                patchState(store, { hasFetchedTripBlocks: value });
            },
            setControlCollapsed(collapsed: boolean): void {
                patchState(store, { controlCollapsed: collapsed });
            },
            /** 圏外のために保存する中身を取り出す */
            snapshot(): TimetableAllLineSnapshot {
                return {
                    stations: store.stations(),
                    agencies: store.agencies(),
                    routeOrder: store.routeOrder(),
                    tripBlocks: store.tripBlocks(),
                };
            },
            /** 保存した中身を戻す（条件の calendarId・tripDirection は今のまま） */
            restoreSnapshot(data: TimetableAllLineSnapshot): void {
                patchState(store, {
                    stations: data.stations,
                    agencies: data.agencies,
                    routeOrder: data.routeOrder,
                    tripBlocks: data.tripBlocks,
                });
            },
        };
    }),
    // 保存するのは操作帯の開閉だけ。全部保存すると列車データ（数 MB）まで書き、
    // 開いたときに前のダイヤ・路線へ戻ってしまう
    withSettingsStorage<StoreProps>({
        key: 'TimetableAllLineStore',
        fields: ['controlCollapsed'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'TimetableAllLine',
                select: () => store.snapshot(),
                apply: (data: TimetableAllLineSnapshot) => {
                    store.restoreSnapshot(data);
                    store.initializeSelectedRouteIds();
                },
            },
        }),
    ),
    withAppDevtools('TimetableAllLineStore'),
    withHooks({
        onInit(store) {
            // チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
            store.resetLoading();
        },
    }),
);
