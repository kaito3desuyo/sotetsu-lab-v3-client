import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { buildOperationDay } from '../utils/operation-day.util';

/** 見ている形。past・today は日付の形、calendar はダイヤの形（編成・目撃を出さない） */
export type OperationViewKind = 'past' | 'today' | 'calendar';

type StoreProps = {
    operationNumber: string | null;
    /** 営業日 'yyyy-MM-dd'。ダイヤの形では null */
    date: string | null;
    viewKind: OperationViewKind;
    calendar: CalendarDetailsDto | null;
    /** そのダイヤの運用（運用番号を選ぶ欄の候補） */
    operations: OperationDetailsDto[];
    /** その運用の列車（各駅の時刻付き）。運用が無ければ null */
    trips: OperationTripsDto | null;
    /** そのダイヤの、運番が変わるつながり（運番変更の行に使う） */
    links: OperationItineraryLinkDto[];
    /** その営業日の全目撃（日付の形だけ） */
    sightings: OperationSightingDetailsDto[];
    formationNumberById: Record<string, string>;
    /** 今日で、この運用に今日の目撃が無いときの time-cross-section の編成番号 */
    inferredFormationNumber: string | null;
    currentPosition: OperationCurrentPositionDto | null;
    loaded: boolean;
    loadError: boolean;
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    operationNumber: null,
    date: null,
    viewKind: 'today',
    calendar: null,
    operations: [],
    trips: null,
    links: [],
    sightings: [],
    formationNumberById: {},
    inferredFormationNumber: null,
    currentPosition: null,
    loaded: false,
    loadError: false,
    loadingQueue: [],
};

export const TimetableOperationStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({
            operationNumber,
            operations,
            date,
            viewKind,
            calendar,
            trips,
            links,
            sightings,
            formationNumberById,
            inferredFormationNumber,
            loaded,
            loadError,
            loadingQueue,
        }) => {
            const operation = computed(
                () =>
                    operations().find(
                        (o) => o.operationNumber === operationNumber(),
                    ) ?? null,
            );
            return {
                isLoading: computed(() => loadingQueue().length > 0),
                operation,
                operationNumbers: computed(() =>
                    operations().map((o) => o.operationNumber),
                ),
                rows: computed(() => {
                    const op = operation();
                    const t = trips();
                    if (!op || !t) return [];
                    return buildOperationDay({
                        operationId: op.operationId,
                        baseDate: viewKind() === 'calendar' ? null : date(),
                        trips: t,
                        sightings: sightings(),
                        formationNumberById: formationNumberById(),
                        inferredFormationNumber: inferredFormationNumber(),
                        links: links(),
                    });
                }),
                /** この運用の、無効でない目撃（時刻順）。上の段に並べる */
                operationSightings: computed(() => {
                    const op = operation();
                    if (!op || viewKind() === 'calendar') return [];
                    return sightings()
                        .filter(
                            (s) =>
                                s.operationId === op.operationId &&
                                !s.invalidation &&
                                !s.sightedAsOperation &&
                                !s.carriedFromSightingId,
                        )
                        .sort(
                            (a, b) =>
                                Date.parse(a.sightingTime) -
                                Date.parse(b.sightingTime),
                        );
                }),
                noCalendar: computed(
                    () => loaded() && !loadError() && !calendar(),
                ),
                notFound: computed(
                    () =>
                        loaded() &&
                        !loadError() &&
                        !!calendar() &&
                        !operation(),
                ),
            };
        },
    ),
    withMethods((store) => {
        // 取得の世代番号。時間で変わる値なので computed でなくクロージャに持つ
        let fetchSeq = 0;
        return {
            nextFetchSeq: (): number => ++fetchSeq,
            currentFetchSeq: (): number => fetchSeq,
            isLatestFetch: (seq: number): boolean => seq === fetchSeq,
            /** 条件が変わるので、前の取得結果を捨てて条件を置く */
            start(params: {
                operationNumber: string;
                date: string | null;
                viewKind: OperationViewKind;
            }): void {
                patchState(store, {
                    ...params,
                    calendar: null,
                    operations: [],
                    trips: null,
                    links: [],
                    sightings: [],
                    formationNumberById: {},
                    inferredFormationNumber: null,
                    currentPosition: null,
                    loaded: false,
                    loadError: false,
                });
            },
            setCalendar(calendar: CalendarDetailsDto | null): void {
                patchState(store, { calendar });
            },
            setOperations(operations: OperationDetailsDto[]): void {
                patchState(store, { operations });
            },
            setTrips(trips: OperationTripsDto | null): void {
                patchState(store, { trips });
            },
            setLinks(links: OperationItineraryLinkDto[]): void {
                patchState(store, { links });
            },
            setSightings(sightings: OperationSightingDetailsDto[]): void {
                patchState(store, { sightings });
            },
            setFormationNumbers(
                formations: { formationId: string; formationNumber: string }[],
            ): void {
                patchState(store, {
                    formationNumberById: Object.fromEntries(
                        formations.map((f) => [
                            f.formationId,
                            f.formationNumber,
                        ]),
                    ),
                });
            },
            setInferredFormationNumber(n: string | null): void {
                patchState(store, { inferredFormationNumber: n });
            },
            setCurrentPosition(
                currentPosition: OperationCurrentPositionDto | null,
            ): void {
                patchState(store, { currentPosition });
            },
            setLoaded(loaded: boolean): void {
                patchState(store, { loaded });
            },
            setLoadError(loadError: boolean): void {
                patchState(store, { loadError });
            },
            enableLoading(): void {
                patchState(store, (s) => ({
                    loadingQueue: s.loadingQueue.concat(true),
                }));
            },
            disableLoading(): void {
                patchState(store, (s) => ({
                    loadingQueue: s.loadingQueue.slice(1),
                }));
            },
        };
    }),
    withAppDevtools('TimetableOperationStore'),
);
