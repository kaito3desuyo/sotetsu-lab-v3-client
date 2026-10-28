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
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { normalizeGroupNames } from 'src/app/shared/operation-group.util';

type StoreProps = {
    calendarId: string | null;
    calendar: CalendarDetailsDto | null;
    operationTrips: OperationTripsDto[];
    itineraryLinks: OperationItineraryLinkDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    selectedGroupNames: string[];
    hasFetchedOperationTrips: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。条件（calendarId）と画面の設定（運用群）は入れない。
 */
export type OperationTableSnapshot = Pick<
    StoreProps,
    | 'calendar'
    | 'operationTrips'
    | 'itineraryLinks'
    | 'stations'
    | 'tripClasses'
>;

const initialState: StoreProps = {
    calendarId: null,
    calendar: null,
    operationTrips: [],
    itineraryLinks: [],
    stations: [],
    tripClasses: [],
    selectedGroupNames: [],
    hasFetchedOperationTrips: false,
    loadingQueue: [],
};

export const OperationTableStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ operationTrips, selectedGroupNames, loadingQueue }) => ({
        /** 運用番号の順に並べた運用（state の operationTrips は取得した順のまま） */
        sortedOperationTrips: computed(() =>
            [...operationTrips()].sort(
                (a, b) =>
                    Number(
                        generateOperationSortNumber(
                            a.operation.operationNumber,
                        ),
                    ) -
                    Number(
                        generateOperationSortNumber(
                            b.operation.operationNumber,
                        ),
                    ),
            ),
        ),
        // 2026-10-06 より前に保存した群名（「3G群」など）は今の名前に置き換える
        normalizedSelectedGroupNames: computed(() =>
            normalizeGroupNames(selectedGroupNames()),
        ),
        isLoading: computed(() => loadingQueue().length > 0),
    })),
    withMethods((store) => {
        // 取得の世代番号。ページを離れてすぐ戻ったとき、前のインスタンスの取得が
        // 後から終わって新しい骨組みを消さないよう、コンポーネントでなくストアで数える
        let fetchSeq = 0;

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            setCalendarId(calendarId: string): void {
                patchState(store, { calendarId });
            },
            setCalendar(calendar: CalendarDetailsDto): void {
                patchState(store, { calendar });
            },
            setOperationTrips(operationTrips: OperationTripsDto[]): void {
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
            setTripClasses(tripClasses: TripClassDetailsDto[]): void {
                patchState(store, { tripClasses });
            },
            setSelectedGroupNames(groupNames: string[]): void {
                patchState(store, { selectedGroupNames: groupNames });
            },
            /** いまの calendar_id の取得が終わったか（失敗しても true）。取る前は一覧の代わりに骨組みを出す */
            setHasFetchedOperationTrips(value: boolean): void {
                patchState(store, { hasFetchedOperationTrips: value });
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
            /** 圏外のために保存する中身を取り出す */
            snapshot(): OperationTableSnapshot {
                return {
                    calendar: store.calendar(),
                    operationTrips: store.operationTrips(),
                    itineraryLinks: store.itineraryLinks(),
                    stations: store.stations(),
                    tripClasses: store.tripClasses(),
                };
            },
            /** 保存した中身を戻す（条件の calendarId と運用群は今のまま） */
            restoreSnapshot(data: OperationTableSnapshot): void {
                patchState(store, {
                    calendar: data.calendar,
                    operationTrips: data.operationTrips,
                    // つながりを持たない古い保存でも空にして戻す
                    itineraryLinks: data.itineraryLinks ?? [],
                    stations: data.stations,
                    tripClasses: data.tripClasses,
                });
            },
        };
    }),
    // B4: リアルタイム運用情報ページ（OperationRealTimeStore）とは独立した永続化キー。
    // 保存するのは運用群の選択だけ（全部保存すると列車データ（数 MB）まで書き、前のダイヤへ戻ってしまう）。
    // ページの中身は取得に失敗したときだけ OfflineSnapshots から戻す
    withSettingsStorage<StoreProps>({
        key: 'OperationTableStore',
        fields: ['selectedGroupNames'],
    }),
    withFeature((store) =>
        withOfflineSnapshots({
            main: {
                key: 'OperationTable',
                select: () => store.snapshot(),
                apply: (data: OperationTableSnapshot) =>
                    store.restoreSnapshot(data),
            },
        }),
    ),
    withAppDevtools('OperationTableStore'),
    withHooks({
        onInit(store) {
            // 旧版のファイル先頭の resetLoading() を引き継いだもの。fields 以外は戻さないので、今は空の loadingQueue を空にするだけ
            store.resetLoading();
        },
    }),
);
