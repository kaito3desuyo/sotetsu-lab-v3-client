import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState, StateStorage } from '@ngneat/elf-persist-state';
import { addDays, getHours, parse } from 'date-fns';
import localForage from 'localforage';
import { debounceTime, map } from 'rxjs';
import { generateOperationSortNumber } from 'src/app/core/utils/generate-operation-sort-number';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
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
    formations: FormationDetailsDto[];
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
};

const store = createStore(
    { name: 'OperationRealTimeStore' },
    withProps<StoreProps>({
        routes: [],
        agencyOrder: [],
        stations: [],
        tripClasses: [],
        calendar: null,
        operations: [],
        formations: [],
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
    }),
);

/**
 * 永続化対象は UI 選択状態のみ（B2/B3: フィルタ選択・トグルの復元）。
 *
 * かつては全ストアを永続化していたが、elf-persist-state の復元は
 * `{...state, ...snapshot}` の後勝ちマージであり localForage(IndexedDB) の
 * 復元は非同期のため、フェッチ済みの新鮮なデータ props
 * （operationGroups / currentPositions 等）を過去セッションのスナップショット
 * （群フェッチ完了前に保存された空配列を含む）で上書きしていた。
 * これが「運用群チップが『休』のみになる」（98 §G2 A3）・
 * 「カードの現在位置行が消える」（同 A4）の真因。
 * データ props を永続化対象から外すことで、復元がデータを壊す経路を絶つ。
 */
const PERSISTED_KEYS = [
    'selectedAgencyIds',
    'selectedGroupNames',
    'isEnableAutoReload',
    'isVisibleSightingHistories',
    'isVisibleCurrentPosition',
] as const;

function pickPersistedProps(state: Partial<StoreProps>): Partial<StoreProps> {
    const picked: Record<string, unknown> = {};
    for (const key of PERSISTED_KEYS) {
        if (key in state) {
            picked[key] = state[key];
        }
    }
    return picked as Partial<StoreProps>;
}

/**
 * 旧形式スナップショット（全ストア永続化時代）にはデータ props が
 * 含まれたまま残っているため、復元時にも永続化対象キーのみへ
 * サニタイズする（保存側の source 絞り込みだけでは初回復元で汚染される）。
 */
const persistStorage: StateStorage = {
    async getItem<T extends Record<string, any>>(
        key: string,
    ): Promise<T | null> {
        const value = await localForage.getItem<Partial<StoreProps>>(key);
        return (value ? pickPersistedProps(value) : value) as T | null;
    },
    setItem(key: string, value: Record<string, any>): Promise<unknown> {
        return localForage.setItem(key, value);
    },
    removeItem(key: string): Promise<void> {
        return localForage.removeItem(key);
    },
};

const persist = persistState(store, {
    key: 'OperationRealTimeStore',
    storage: persistStorage,
    source: () => store.pipe(debounceTime(1000), map(pickPersistedProps)),
});

export const OperationRealTimeStore = {
    persistInitialized$: persist.initialized$,

    setAgencyOrder(agencyIds: string[]): void {
        store.update(setProp('agencyOrder', () => agencyIds));
    },
    setRoutes(routes: RouteDetailsDto[]): void {
        store.update(setProp('routes', () => routes));
    },
    setStations(stations: StationDetailsDto[]): void {
        store.update(setProp('stations', () => stations));
    },
    setTripClasses(tripClasses: TripClassDetailsDto[]): void {
        store.update(setProp('tripClasses', () => tripClasses));
    },
    setCalendar(calendar: CalendarDetailsDto): void {
        store.update(setProp('calendar', () => calendar));
    },
    setOperations(operations: OperationDetailsDto[]): void {
        store.update(setProp('operations', () => operations));
    },
    setFormations(formations: FormationDetailsDto[]): void {
        store.update(setProp('formations', () => formations));
    },
    setOperationGroups(operationGroups: OperationGroupDto[]): void {
        store.update(setProp('operationGroups', () => operationGroups));
    },
    setSelectedAgencyIds(agencyIds: string[]): void {
        store.update(setProp('selectedAgencyIds', () => agencyIds));
    },
    setSelectedGroupNames(groupNames: string[]): void {
        store.update(setProp('selectedGroupNames', () => groupNames));
    },
    setOperationSightingTimeCrossSection(
        operationNumber: string,
        timeCrossSection: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('operationSightingTimeCrossSections', (state) => ({
                ...state,
                [operationNumber]: timeCrossSection,
            })),
        );
    },
    setFormationSightingTimeCrossSection(
        formationNumber: string,
        timeCrossSection: OperationSightingTimeCrossSectionDto,
    ): void {
        store.update(
            setProp('formationSightingTimeCrossSections', (state) => ({
                ...state,
                [formationNumber]: timeCrossSection,
            })),
        );
    },
    setOperationSightingHistory(
        operationNumber: string,
        histories: OperationSightingDetailsDto[],
    ): void {
        store.update(
            setProp('operationSightingHistories', (state) => ({
                ...state,
                [operationNumber]: histories,
            })),
        );
    },
    setFormationSightingHistory(
        formationNumber: string,
        histories: OperationSightingDetailsDto[],
    ): void {
        store.update(
            setProp('formationSightingHistories', (state) => ({
                ...state,
                [formationNumber]: histories,
            })),
        );
    },
    setCurrentPosition(
        operationNumber: string,
        currentPosition: OperationCurrentPositionDto,
    ): void {
        store.update(
            setProp('currentPositions', (state) => ({
                ...state,
                [operationNumber]: currentPosition,
            })),
        );
    },
    setFinalUpdateTime(finalUpdateTime?: number): void {
        const time = finalUpdateTime ?? Math.floor(Date.now() / 1000);
        store.update(setProp('finalUpdateTime', () => time));
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
    setIsEnableAutoReload(isEnable: boolean): void {
        store.update(setProp('isEnableAutoReload', () => isEnable));
    },
    setIsVisibleSightingHistories(isVisible: boolean): void {
        store.update(setProp('isVisibleSightingHistories', () => isVisible));
    },
    setIsVisibleCurrentPosition(isVisible: boolean): void {
        store.update(setProp('isVisibleCurrentPosition', () => isVisible));
    },

    routes$: store.pipe(select((state) => state.routes)),
    stations$: store.pipe(select((state) => state.stations)),
    tripClasses$: store.pipe(select((state) => state.tripClasses)),
    calendar$: store.pipe(select((state) => state.calendar)),
    operations$: store.pipe(
        select((state) =>
            state.operations
                .filter((o) => o.operationNumber !== '100')
                .sort(
                    (a, b) =>
                        Number(generateOperationSortNumber(a.operationNumber)) -
                        Number(generateOperationSortNumber(b.operationNumber)),
                ),
        ),
    ),
    /**
     * 編成順カードの並び。会社は相鉄と直通を始めた順（会社チップと同じ。2026-09-24）、会社内は編成番号の順。
     * 以前の「相鉄・JR東日本・東急」の決め打ちはこの歴史による。ほかの会社に順位が無かったので、
     * 一覧（THROUGH_SERVICE_AGENCY_ORDER）で持つようにした。
     */
    formations$: store.pipe(
        select((state) => {
            const rank = (agencyId: string): number => {
                const index = state.agencyOrder.indexOf(agencyId);
                return index < 0 ? Infinity : index;
            };
            return state.formations
                .sort(
                    (a, b) =>
                        Number(a.formationNumber) - Number(b.formationNumber),
                )
                .sort((a, b) => rank(a.agencyId) - rank(b.agencyId));
        }),
    ),
    operationGroups$: store.pipe(select((state) => state.operationGroups)),
    selectedAgencyIds$: store.pipe(select((state) => state.selectedAgencyIds)),
    // 2026-10-06 より前に保存した群名（「3G群」など）は今の名前に置き換える
    selectedGroupNames$: store.pipe(
        select((state) => state.selectedGroupNames),
        map(normalizeGroupNames),
    ),
    operationSightingTimeCrossSections$: store.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    ),
    formationSightingTimeCrossSections$: store.pipe(
        select((state) => state.formationSightingTimeCrossSections),
    ),
    operationSightingHistories$: store.pipe(
        select((state) => state.operationSightingHistories),
    ),
    formationSightingHistories$: store.pipe(
        select((state) => state.formationSightingHistories),
    ),
    currentPositions$: store.pipe(select((state) => state.currentPositions)),
    finalUpdateTime$: store.pipe(select((state) => state.finalUpdateTime)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),
    isEnableAutoReload$: store.pipe(
        select((state) => state.isEnableAutoReload),
    ),
    isVisibleSightingHistories$: store.pipe(
        select((state) => state.isVisibleSightingHistories),
    ),
    isVisibleCurrentPosition$: store.pipe(
        select((state) => state.isVisibleCurrentPosition),
    ),

    get routes(): RouteDetailsDto[] {
        return store.getValue().routes;
    },
    get calendar(): CalendarDetailsDto {
        return store.getValue().calendar;
    },
    get operations(): OperationDetailsDto[] {
        return store
            .getValue()
            .operations.filter((o) => o.operationNumber !== '100')
            .sort(
                (a, b) =>
                    Number(generateOperationSortNumber(a.operationNumber)) -
                    Number(generateOperationSortNumber(b.operationNumber)),
            );
    },
    get formations(): FormationDetailsDto[] {
        return store.getValue().formations;
    },
    get currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
        const currentPositions = store.getValue().currentPositions;
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
    get isEnableAutoReload(): boolean {
        return store.getValue().isEnableAutoReload;
    },
} as const;
