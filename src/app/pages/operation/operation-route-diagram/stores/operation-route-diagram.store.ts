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
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withOfflineSnapshots } from 'src/app/core/store-features/with-offline-snapshots';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import {
    applyRouteDiagramStationAliases,
    RouteDiagramStationAliases,
} from '../utils/operation-route-diagram-curate-stations.util';
import { relatedRouteIds } from '../utils/operation-route-diagram-related-route-ids.util';
import { visitedRouteIds } from '../utils/operation-route-diagram-visited-route-ids.util';

type StoreProps = {
    operationId: string | null;
    operationTrips: OperationTripsDto | null;
    itineraryLinks: OperationItineraryLinkDto[];
    stations: StationDetailsDto[];
    stationAliases: RouteDiagramStationAliases;
    selectedRouteIds: string[];
    /** 操作帯を畳んでいるか。端末に保存する */
    controlCollapsed: boolean;
    hasFetchedOperationTrips: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。条件（operationId）と画面の状態
 * （選択中の路線・取得済みの印・読み込み中）は入れない。
 */
export type OperationRouteDiagramSnapshot = Pick<
    StoreProps,
    'operationTrips' | 'itineraryLinks' | 'stations' | 'stationAliases'
>;

const initialState: StoreProps = {
    operationId: null,
    operationTrips: null,
    itineraryLinks: [],
    stations: [],
    stationAliases: {},
    selectedRouteIds: [],
    controlCollapsed: false,
    hasFetchedOperationTrips: false,
    loadingQueue: [],
};

/**
 * 運用の行路。始発・終着の駅 ID は縦軸の列の駅 ID に読み替えてある
 * （路線ごとに別の駅として登録された駅を 1 列にまとめたため。curate-stations.util 参照）。
 */
function tripsOf(
    state: Pick<StoreProps, 'operationTrips' | 'stationAliases'>,
): TripOperationListDetailsDto[] {
    return applyRouteDiagramStationAliases(
        state.operationTrips?.trips ?? [],
        state.stationAliases,
    );
}

function extractRouteOptions(
    stations: StationDetailsDto[],
): FilterChipOption[] {
    const seen = new Map<string, string>();

    for (const station of stations) {
        for (const rsl of station.routeStationLists ?? []) {
            if (rsl.route?.routeId && !seen.has(rsl.route.routeId)) {
                seen.set(rsl.route.routeId, rsl.route.routeName ?? '');
            }
        }
    }

    return Array.from(seen.entries()).map(([routeId, routeName]) => ({
        value: routeId,
        label: routeName,
    }));
}

export const OperationRouteDiagramStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({
            operationId,
            operationTrips,
            stations,
            stationAliases,
            selectedRouteIds,
            hasFetchedOperationTrips,
            loadingQueue,
        }) => {
            const trips = computed(() =>
                tripsOf({
                    operationTrips: operationTrips(),
                    stationAliases: stationAliases(),
                }),
            );

            return {
                calendar: computed(() => operationTrips()?.operation?.calendar),
                calendarId: computed(
                    () => operationTrips()?.operation?.calendarId,
                ),
                operation: computed(() => operationTrips()?.operation),
                tripOperationLists: computed(() =>
                    operationTrips()?.trips ? trips() : undefined,
                ),
                /** 運用番号があって、まだ取り終えていない（骨組みを出すとき） */
                isAwaitingOperationTrips: computed(
                    () => !!operationId() && !hasFetchedOperationTrips(),
                ),
                isLoading: computed(() => loadingQueue().length > 0),
                /**
                 * 路線を何も選んでいなければ、この運用が経由する路線の駅を全部出す（押せるチップを全部選んだのと同じ）。
                 * 経由しない路線の駅は出さない（ユーザー指示 2026-10-05）。
                 */
                visibleStations: computed(() =>
                    visibleStations(
                        stations(),
                        selectedRouteIds().length
                            ? selectedRouteIds()
                            : visitedRouteIds(stations(), trips()),
                    ),
                ),
                // P8-3: チップの表示自体を「当該運用に関連する路線」のみへ絞り込む。
                // 関連路線の判定基準は operation-route-diagram-related-route-ids.util.ts 参照。
                routeOptions: computed(() => {
                    const visited = new Set(
                        visitedRouteIds(stations(), trips()),
                    );
                    const related = new Set(
                        relatedRouteIds(stations(), trips()),
                    );

                    return extractRouteOptions(stations())
                        .filter((option) => related.has(String(option.value)))
                        .map((option) => ({
                            ...option,
                            disabled: !visited.has(String(option.value)),
                        }));
                }),
            };
        },
    ),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、コンポーネントでなくストアで数える
        let fetchSeq = 0;
        // ダイヤの替えの世代番号（同じ理由でストアに置く）
        let calendarChangeSeq = 0;

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            nextCalendarChangeSeq(): number {
                return ++calendarChangeSeq;
            },
            isLatestCalendarChange(seq: number): boolean {
                return seq === calendarChangeSeq;
            },
            setOperationId(operationId: string): void {
                patchState(store, { operationId });
            },
            setOperationTrips(operationTrips: OperationTripsDto | null): void {
                patchState(store, { operationTrips });
            },
            setItineraryLinks(
                itineraryLinks: OperationItineraryLinkDto[],
            ): void {
                patchState(store, { itineraryLinks });
            },
            setStations(stations: StationDetailsDto[]): void {
                patchState(store, { stations });
            },
            setStationAliases(
                stationAliases: RouteDiagramStationAliases,
            ): void {
                patchState(store, { stationAliases });
            },
            setSelectedRouteIds(routeIds: FilterChipValue[]): void {
                patchState(store, { selectedRouteIds: routeIds as string[] });
            },
            /**
             * B5: 既定 ON =「当該運用が経由する路線のみ」。
             * operationTrips と stations の両方が揃った後（fetchData 完了後）に呼ぶ。
             */
            initializeSelectedRouteIds(): void {
                const routeIds = visitedRouteIds(
                    store.stations(),
                    tripsOf({
                        operationTrips: store.operationTrips(),
                        stationAliases: store.stationAliases(),
                    }),
                );
                patchState(store, { selectedRouteIds: routeIds });
            },
            setControlCollapsed(collapsed: boolean): void {
                patchState(store, { controlCollapsed: collapsed });
            },
            /** いまの運用の取得が終わったか（失敗しても true）。取る前は図と路線のチップの代わりに骨組みを出す */
            setHasFetchedOperationTrips(value: boolean): void {
                patchState(store, { hasFetchedOperationTrips: value });
            },
            /** 圏外のために保存する中身を取り出す */
            snapshot(): OperationRouteDiagramSnapshot {
                return {
                    operationTrips: store.operationTrips(),
                    itineraryLinks: store.itineraryLinks(),
                    stations: store.stations(),
                    stationAliases: store.stationAliases(),
                };
            },
            /** 保存した中身を戻す（条件の operationId は今のまま） */
            restoreSnapshot(data: OperationRouteDiagramSnapshot): void {
                patchState(store, {
                    operationTrips: data.operationTrips,
                    itineraryLinks: data.itineraryLinks,
                    stations: data.stations,
                    stationAliases: data.stationAliases,
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
        };
    }),
    // 保存するのは操作帯の開閉だけ。全部保存すると取得したデータまで書き、前の条件へ戻ってしまう
    withSettingsStorage<StoreProps>({
        key: 'OperationRouteDiagramStore',
        fields: ['controlCollapsed'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'OperationRouteDiagram',
                select: () => store.snapshot(),
                apply: (data: OperationRouteDiagramSnapshot) =>
                    store.restoreSnapshot(data),
            },
        }),
    ),
    withAppDevtools('OperationRouteDiagramStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
