import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withHooks,
    withMethods,
    withState,
} from '@ngrx/signals';
import { minBy } from 'es-toolkit/compat';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { toServiceSeconds } from 'src/app/core/utils/railway-day';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { visibleStations } from 'src/app/core/utils/visible-stations.util';
import { ETimetableEditFormMode } from '../enums/timetable-edit-form.enum';

type StoreProps = {
    mode: ETimetableEditFormMode | null;
    calendarId: string | null;
    tripDirection: ETripDirection | null;
    tripBlockId: string | null;
    calendar: CalendarDetailsDto | null;
    routes: RouteDetailsDto[];
    selectedRouteIds: string[];
    stations: StationDetailsDto[];
    operations: OperationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    copySourceCandidates: TripBlockDetailsDto[];
    targetTripBlock: TripBlockDetailsDto | null;
    isSaveTripsIndividually: boolean;
    loadingQueue: boolean[];
    /** 駅・路線・ダイヤ・（更新とコピーは）元の列車を取り終えたか（失敗しても true）。取る前はフォームの代わりに骨組みを出す */
    hasFetchedEditForm: boolean;
    submittedAt: number | null;
};

const initialProps: StoreProps = {
    mode: null,
    calendarId: null,
    tripDirection: null,
    tripBlockId: null,
    calendar: null,
    routes: [],
    selectedRouteIds: [],
    stations: [],
    operations: [],
    tripClasses: [],
    copySourceCandidates: [],
    targetTripBlock: null,
    isSaveTripsIndividually: false,
    loadingQueue: [],
    hasFetchedEditForm: false,
    submittedAt: null,
};

function sortTripsByFirstTime(trips: TripDetailsDto[]): TripDetailsDto[] {
    return [...trips].sort((a, b) => {
        const aTime = minBy(a.times ?? [], (o) => o.stopSequence);
        const bTime = minBy(b.times ?? [], (o) => o.stopSequence);

        if (!aTime || !bTime) return 0;

        const aValue = aTime.departureTime ?? aTime.arrivalTime;
        const bValue = bTime.departureTime ?? bTime.arrivalTime;
        const aDays = aTime.departureDays ?? aTime.arrivalDays ?? 1;
        const bDays = bTime.departureDays ?? bTime.arrivalDays ?? 1;

        if (!aValue || !bValue) return 0;

        return (
            toServiceSeconds(aDays, aValue) - toServiceSeconds(bDays, bValue)
        );
    });
}

export const TimetableEditFormStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialProps),
    withComputed(
        ({
            stations,
            tripDirection,
            selectedRouteIds,
            targetTripBlock,
            loadingQueue,
        }) => {
            /** 方向反映済みの全駅リスト（フォームの times FormArray 構築に使う。情報は削減しない） */
            const sortedStations = computed(() =>
                tripDirection() === ETripDirection.INBOUND
                    ? [...stations()].reverse()
                    : stations(),
            );

            return {
                isLoading: computed(() => loadingQueue().length > 0),
                sortedStations,
                /** B8-1: 路線チップの選択状態で絞り込んだ、方向反映済みの表示対象駅リスト（行の表示/非表示にのみ使う） */
                sortedVisibleStations: computed(() =>
                    visibleStations(sortedStations(), selectedRouteIds()),
                ),
                /** ADD 以外のモードでプリフィル対象となる trips（trip-block 単位） */
                trips: computed(() =>
                    sortTripsByFirstTime(targetTripBlock()?.trips ?? []),
                ),
            };
        },
    ),
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

            /**
             * ページ再入（add→copy 等の遷移含む）ごとに、前回セッションの選択状態を
             * 引きずらないようにする。ストアは singleton であり、
             * add/copy/update は同一ルートコンポーネントを共有するため、ここで
             * リセットしないとコピー元選択や路線絞り込みが別モードへ漏れる。
             */
            resetForNewSession(): void {
                patchState(store, {
                    tripDirection: initialProps.tripDirection,
                    tripBlockId: initialProps.tripBlockId,
                    selectedRouteIds: initialProps.selectedRouteIds,
                    copySourceCandidates: initialProps.copySourceCandidates,
                    targetTripBlock: initialProps.targetTripBlock,
                    isSaveTripsIndividually:
                        initialProps.isSaveTripsIndividually,
                    submittedAt: initialProps.submittedAt,
                });
            },

            setMode(mode: ETimetableEditFormMode): void {
                patchState(store, { mode });
            },
            setCalendarId(calendarId: string): void {
                patchState(store, { calendarId });
            },
            setTripDirection(tripDirection: ETripDirection): void {
                patchState(store, { tripDirection });
            },
            setTripBlockId(tripBlockId: string | null): void {
                patchState(store, { tripBlockId });
            },
            setCalendar(calendar: CalendarDetailsDto): void {
                patchState(store, { calendar });
            },
            setRoutes(routes: RouteDetailsDto[]): void {
                patchState(store, { routes });
            },
            setSelectedRouteIds(selectedRouteIds: string[]): void {
                patchState(store, { selectedRouteIds });
            },
            /** 選択中の路線に足す（外さない）。読み込んだ列車の通る路線を見せるため */
            addSelectedRouteIds(routeIds: Iterable<string>): void {
                patchState(store, (state) => ({
                    selectedRouteIds: [
                        ...new Set([...state.selectedRouteIds, ...routeIds]),
                    ],
                }));
            },
            setStations(stations: StationDetailsDto[]): void {
                patchState(store, { stations });
            },
            setOperations(operations: OperationDetailsDto[]): void {
                patchState(store, { operations });
            },
            setTripClasses(tripClasses: TripClassDetailsDto[]): void {
                patchState(store, { tripClasses });
            },
            setCopySourceCandidates(
                copySourceCandidates: TripBlockDetailsDto[],
            ): void {
                patchState(store, { copySourceCandidates });
            },
            setTargetTripBlock(
                targetTripBlock: TripBlockDetailsDto | null,
            ): void {
                patchState(store, { targetTripBlock });
            },
            setIsSaveTripsIndividually(isSaveTripsIndividually: boolean): void {
                patchState(store, { isSaveTripsIndividually });
            },
            setSubmittedAt(submittedAt: number): void {
                patchState(store, { submittedAt });
            },
            /** 駅・路線・ダイヤ・（更新とコピーは）元の列車を取り終えたか（失敗しても true）。取る前はフォームの代わりに骨組みを出す */
            setHasFetchedEditForm(hasFetchedEditForm: boolean): void {
                patchState(store, { hasFetchedEditForm });
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
    withAppDevtools('TimetableEditFormStore'),
    withHooks({
        onInit(store) {
            // チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
            store.resetLoading();
        },
    }),
);
