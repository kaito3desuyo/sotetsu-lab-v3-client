import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { map } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type StoreProps = {
    todaysCalendar: CalendarDetailsDto | null;
    /** 今日（鉄道日）が何の日か（祝日名・年末年始・特別ダイヤ）。該当しなければ null */
    todaysDayName: string | null;
    runningTripCount: number;
    sightingCountToday: number;
    latestSightings: OperationSightingDetailsDto[];
    latestSightingPositions: Record<string, OperationCurrentPositionDto>;
    /** 運用のつながり（目撃時の位置と走行本数で乗り移りの端を見分ける） */
    itineraryLinks: OperationItineraryLinkDto[];
    /** 目撃時の位置に出す種別チップの名称・色の解決用 */
    tripClasses: TripClassDetailsDto[];
    /** 「サイト説明」パネルを初回訪問時のみ自動展開するための既訪問フラグ */
    hasVisitedBefore: boolean;
    loadingQueue: boolean[];
};

/**
 * 圏外のために端末に保存する中身。画面の設定（hasVisitedBefore）と loadingQueue は入れない。
 */
export type DashboardSnapshot = Pick<
    StoreProps,
    | 'todaysCalendar'
    | 'todaysDayName'
    | 'runningTripCount'
    | 'sightingCountToday'
    | 'latestSightings'
    | 'latestSightingPositions'
    | 'itineraryLinks'
    | 'tripClasses'
>;

const store = createStore(
    { name: 'DashboardStore' },
    withProps<StoreProps>({
        todaysCalendar: null,
        todaysDayName: null,
        runningTripCount: 0,
        sightingCountToday: 0,
        latestSightings: [],
        latestSightingPositions: {},
        itineraryLinks: [],
        tripClasses: [],
        hasVisitedBefore: false,
        loadingQueue: [],
    }),
);

/**
 * 端末から読み込んだ値のうち、画面の設定（既訪問フラグ）だけをストアに入れる。
 * 以前は全体を保存していたため、IndexedDB に残る古い中身を戻さない。
 * 設定以外は今のストアの値のまま（loadingQueue も今のまま）。
 */
export function pickDashboardSettings(value: StoreProps): StoreProps {
    const current = store.getValue();
    return {
        ...current,
        hasVisitedBefore: value.hasVisitedBefore ?? current.hasVisitedBefore,
    };
}

// 保存するのは既訪問フラグだけ。ページの中身は取得に失敗したときだけ OfflineSnapshots から戻す
const persist = persistState(store, {
    key: 'DashboardStore',
    storage: localForage,
    preStoreInit: pickDashboardSettings,
    source: () =>
        store.pipe(
            select((state) => state.hasVisitedBefore),
            map((hasVisitedBefore) => ({ hasVisitedBefore })),
        ),
});

export const DashboardStore = {
    persistInitialized$: persist.initialized$,

    setTodaysCalendar(calendar: CalendarDetailsDto | null): void {
        store.update(setProp('todaysCalendar', () => calendar));
    },
    setTodaysDayName(name: string | null): void {
        store.update(setProp('todaysDayName', () => name));
    },
    setRunningTripCount(count: number): void {
        store.update(setProp('runningTripCount', () => count));
    },
    setSightingCountToday(count: number): void {
        store.update(setProp('sightingCountToday', () => count));
    },
    setLatestSightings(sightings: OperationSightingDetailsDto[]): void {
        store.update(setProp('latestSightings', () => sightings));
    },
    setLatestSightingPosition(
        operationSightingId: string,
        position: OperationCurrentPositionDto,
    ): void {
        store.update(
            setProp('latestSightingPositions', (state) => ({
                ...state,
                [operationSightingId]: position,
            })),
        );
    },
    setItineraryLinks(links: OperationItineraryLinkDto[]): void {
        store.update(setProp('itineraryLinks', () => links));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    markVisited(): void {
        store.update(setProp('hasVisitedBefore', () => true));
    },
    /** 圏外のために保存する中身を取り出す */
    snapshot(): DashboardSnapshot {
        const {
            todaysCalendar,
            todaysDayName,
            runningTripCount,
            sightingCountToday,
            latestSightings,
            latestSightingPositions,
            itineraryLinks,
            tripClasses,
        } = store.getValue();
        return {
            todaysCalendar,
            todaysDayName,
            runningTripCount,
            sightingCountToday,
            latestSightings,
            latestSightingPositions,
            itineraryLinks,
            tripClasses,
        };
    },
    /** 保存した中身を戻す（既訪問フラグと読み込み中は今のまま） */
    restoreSnapshot(data: DashboardSnapshot): void {
        store.update((state) => ({
            ...state,
            todaysCalendar: data.todaysCalendar,
            todaysDayName: data.todaysDayName,
            runningTripCount: data.runningTripCount,
            sightingCountToday: data.sightingCountToday,
            latestSightings: data.latestSightings,
            latestSightingPositions: data.latestSightingPositions,
            itineraryLinks: data.itineraryLinks,
            tripClasses: data.tripClasses,
        }));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },

    todaysCalendar$: store.pipe(select((state) => state.todaysCalendar)),
    todaysDayName$: store.pipe(select((state) => state.todaysDayName)),
    runningTripCount$: store.pipe(select((state) => state.runningTripCount)),
    sightingCountToday$: store.pipe(
        select((state) => state.sightingCountToday),
    ),
    latestSightings$: store.pipe(select((state) => state.latestSightings)),
    latestSightingPositions$: store.pipe(
        select((state) => state.latestSightingPositions),
    ),
    itineraryLinks$: store.pipe(select((state) => state.itineraryLinks)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    hasVisitedBefore$: store.pipe(select((state) => state.hasVisitedBefore)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),

    get latestSightings(): OperationSightingDetailsDto[] {
        return store.getValue().latestSightings;
    },
    get todaysCalendar(): CalendarDetailsDto | null {
        return store.getValue().todaysCalendar;
    },
    get hasVisitedBefore(): boolean {
        return store.getValue().hasVisitedBefore;
    },
} as const;
