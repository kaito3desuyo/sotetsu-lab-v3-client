import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { map } from 'rxjs';
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

const store = createStore(
    { name: 'OperationTableStore' },
    withProps<StoreProps>({
        calendarId: null,
        calendar: null,
        operationTrips: [],
        itineraryLinks: [],
        stations: [],
        tripClasses: [],
        selectedGroupNames: [],
        hasFetchedOperationTrips: false,
        loadingQueue: [],
    }),
);

/**
 * 端末から読み込んだ値のうち、画面の設定（運用群）だけをストアに入れる。
 * 以前は全体を保存していたため、IndexedDB に残る古い値（数 MB の運用・駅など）を戻さない。
 * 設定以外は今のストアの値のまま。
 */
export function pickOperationTableSettings(value: StoreProps): StoreProps {
    const current = store.getValue();
    return {
        ...current,
        selectedGroupNames:
            value.selectedGroupNames ?? current.selectedGroupNames,
    };
}

// B4: リアルタイム運用情報ページ（OperationRealTimeStore）とは独立した永続化キー。
// 保存するのは運用群の選択だけ（全部保存すると列車データ（数 MB）まで書き、前のダイヤへ戻ってしまう）。
// ページの中身は取得に失敗したときだけ OfflineSnapshots から戻す
const persist = persistState(store, {
    key: 'OperationTableStore',
    storage: localForage,
    preStoreInit: pickOperationTableSettings,
    source: () =>
        store.pipe(
            select((state) => state.selectedGroupNames),
            map((selectedGroupNames) => ({ selectedGroupNames })),
        ),
});

export const OperationTableStore = {
    persistInitialized$: persist.initialized$,

    setCalendarId(calendarId: string): void {
        store.update(setProp('calendarId', () => calendarId));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setOperationTrips(operationTrips: OperationTripsDto[]): void {
        store.update(setProp('operationTrips', () => operationTrips));
    },
    setItineraryLinks(itineraryLinks: OperationItineraryLinkDto[]): void {
        store.update(setProp('itineraryLinks', () => itineraryLinks));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setSelectedGroupNames(groupNames: string[]): void {
        store.update(setProp('selectedGroupNames', () => groupNames));
    },
    /** いまの calendar_id の取得が終わったか（失敗しても true）。取る前は一覧の代わりに骨組みを出す */
    setHasFetchedOperationTrips(value: boolean): void {
        store.update(setProp('hasFetchedOperationTrips', () => value));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
    },
    /** 圏外のために保存する中身を取り出す */
    snapshot(): OperationTableSnapshot {
        const {
            calendar,
            operationTrips,
            itineraryLinks,
            stations,
            tripClasses,
        } = store.getValue();
        return {
            calendar,
            operationTrips,
            itineraryLinks,
            stations,
            tripClasses,
        };
    },
    /** 保存した中身を戻す（条件の calendarId と運用群は今のまま） */
    restoreSnapshot(data: OperationTableSnapshot): void {
        store.update((state) => ({
            ...state,
            calendar: data.calendar,
            operationTrips: data.operationTrips,
            itineraryLinks: data.itineraryLinks,
            stations: data.stations,
            tripClasses: data.tripClasses,
        }));
    },

    calendarId$: store.pipe(select((state) => state.calendarId)),
    calendar$: store.pipe(select((state) => state.calendar)),
    operationTrips$: store.pipe(
        select((state) =>
            [...state.operationTrips].sort(
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
    ),
    // 保存済みの古い状態には無い項目なので、無ければ空にする
    itineraryLinks$: store.pipe(select((state) => state.itineraryLinks ?? [])),
    stations$: store.pipe(select((state) => state.stations)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    // 2026-10-06 より前に保存した群名（「3G群」など）は今の名前に置き換える
    selectedGroupNames$: store.pipe(
        select((state) => state.selectedGroupNames),
        map(normalizeGroupNames),
    ),
    // 保存済みの古い状態には無い項目なので `?? false`
    hasFetchedOperationTrips$: store.pipe(
        select((state) => state.hasFetchedOperationTrips ?? false),
    ),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    get calendarId(): string | null {
        return store.getValue().calendarId;
    },
    get operations(): OperationTripsDto[] {
        return store.getValue().operationTrips;
    },
} as const;
