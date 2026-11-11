import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import {
    buildFormationDay,
    FormationDayBasis,
    FormationDayInput,
} from '../utils/formation-day.util';

/** 画面で見ている日の種類。今日・明日は呼び出し側（コンポーネント）が決めて渡す */
export type FormationDateKind = 'past' | 'today' | 'tomorrow';

type StoreProps = {
    formationNumber: string | null;
    /** 営業日 'yyyy-MM-dd' */
    date: string | null;
    dateKind: FormationDateKind;
    formation: FormationDetailsDto | null;
    calendar: CalendarDetailsDto | null;
    /** その営業日の全編成の目撃 */
    sightings: OperationSightingDetailsDto[];
    tripsByOperationId: Record<string, OperationTripsDto>;
    links: OperationItineraryLinkDto[];
    stations: StationDetailsDto[];
    /** 目撃が無いときの最初の運用（今日は time-cross-section、明日は明日 12:00 の問い合わせ） */
    firstOperationId: string | null;
    /** 明日の問い合わせで返った運用。null なら明日は選べない */
    tomorrowOperationId: string | null;
    currentPosition: OperationCurrentPositionDto | null;
    selectedStationId: string | null;
    /** 取得が一度終わったか（終わる前に「編成が無い」を出さないため） */
    loaded: boolean;
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    formationNumber: null,
    date: null,
    dateKind: 'today',
    formation: null,
    calendar: null,
    sightings: [],
    tripsByOperationId: {},
    links: [],
    stations: [],
    firstOperationId: null,
    tomorrowOperationId: null,
    currentPosition: null,
    selectedStationId: null,
    loaded: false,
    loadingQueue: [],
};

export const TimetableFormationStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(
        ({
            formation,
            date,
            dateKind,
            sightings,
            tripsByOperationId,
            links,
            firstOperationId,
            tomorrowOperationId,
            calendar,
            loaded,
            loadingQueue,
        }) => {
            const dayInput = computed<FormationDayInput | null>(() => {
                const f = formation();
                const d = date();
                if (!f || !d) return null;
                return {
                    formationId: f.formationId,
                    baseDate: d,
                    sightings: sightings(),
                    firstOperationId: firstOperationId(),
                    tripsByOperationId: tripsByOperationId(),
                    links: links(),
                };
            });
            // この編成の目撃を時刻順に並べる（無効なものは除く）
            const todaysSightings = computed(() => {
                const f = formation();
                if (!f) return [];
                return sightings()
                    .filter((s) => s.formationId === f.formationId)
                    .filter((s) => !s.invalidation)
                    .sort(
                        (a, b) =>
                            Date.parse(a.sightingTime) -
                            Date.parse(b.sightingTime),
                    );
            });
            return {
                isLoading: computed(() => loadingQueue().length > 0),
                dayInput,
                rows: computed(() => {
                    const input = dayInput();
                    return input ? buildFormationDay(input) : [];
                }),
                todaysSightings,
                /** 運用を何で決めたか（目撃があれば最初の目撃、無ければダイヤ） */
                basis: computed<FormationDayBasis>(() => {
                    const own = todaysSightings();
                    if (own.length > 0) {
                        return own[0].sightedAsOperation
                            ? 'carried-over'
                            : 'sighting';
                    }
                    return firstOperationId() ? 'circulated' : 'unknown';
                }),
                canSelectTomorrow: computed(
                    () => dateKind() === 'today' && !!tomorrowOperationId(),
                ),
                notFound: computed(() => loaded() && !formation()),
                noCalendar: computed(() => loaded() && !calendar()),
            };
        },
    ),
    withMethods((store) => {
        // 取得の世代番号。時間で変わる値なので computed でなくクロージャに持つ
        let fetchSeq = 0;

        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            /** 世代を進めずに、いまの番号を返す（取り直しの途中で新しい取得が始まったかを見るため） */
            currentFetchSeq(): number {
                return fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            /** 日が変わるので、前の日の取得結果を捨てて条件を置く */
            startDay(params: {
                formationNumber: string;
                date: string;
                dateKind: FormationDateKind;
            }): void {
                patchState(store, {
                    ...params,
                    formation: null,
                    calendar: null,
                    sightings: [],
                    tripsByOperationId: {},
                    links: [],
                    firstOperationId: null,
                    tomorrowOperationId: null,
                    currentPosition: null,
                    loaded: false,
                });
            },
            setFormation(formation: FormationDetailsDto | null): void {
                patchState(store, { formation });
            },
            setCalendar(calendar: CalendarDetailsDto | null): void {
                patchState(store, { calendar });
            },
            setSightings(sightings: OperationSightingDetailsDto[]): void {
                patchState(store, { sightings });
            },
            addTrips(trips: Record<string, OperationTripsDto>): void {
                patchState(store, (s) => ({
                    tripsByOperationId: { ...s.tripsByOperationId, ...trips },
                }));
            },
            setLinks(links: OperationItineraryLinkDto[]): void {
                patchState(store, { links });
            },
            setStations(stations: StationDetailsDto[]): void {
                patchState(store, { stations });
            },
            setFirstOperationId(firstOperationId: string | null): void {
                patchState(store, { firstOperationId });
            },
            setTomorrowOperationId(tomorrowOperationId: string | null): void {
                patchState(store, { tomorrowOperationId });
            },
            setCurrentPosition(
                currentPosition: OperationCurrentPositionDto | null,
            ): void {
                patchState(store, { currentPosition });
            },
            setSelectedStationId(selectedStationId: string | null): void {
                patchState(store, { selectedStationId });
            },
            setLoaded(loaded: boolean): void {
                patchState(store, { loaded });
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
    withAppDevtools('TimetableFormationStore'),
    withHooks({
        onInit(store) {
            store.resetLoading();
        },
    }),
);
