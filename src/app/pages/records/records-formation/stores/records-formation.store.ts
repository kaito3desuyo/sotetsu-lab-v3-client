import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { groupBy } from 'es-toolkit';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { toRailwayDateKey } from 'src/app/core/utils/railway-day';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';

type StoreProps = {
    formationNumber: string | null;
    /** 'YYYY-MM' */
    month: string | null;
    /** formationNumber・month の月の目撃（api が編成で絞ったもの） */
    sightings: OperationSightingDetailsDto[];
    /** 月の取得が一度終わったか */
    loaded: boolean;
    loadError: boolean;
    /** 要約（今日・最後に見た日）。月を替えても取り直さない */
    summary: OperationSightingTimeCrossSectionDto | null;
    /** summary がどの編成のものか。null なら未取得 */
    summaryFormationNumber: string | null;
    summaryError: boolean;
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    formationNumber: null,
    month: null,
    sightings: [],
    loaded: false,
    loadError: false,
    summary: null,
    summaryFormationNumber: null,
    summaryError: false,
    loadingQueue: [],
};

export const RecordsFormationStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ sightings, loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
        /** 日（鉄道日 'YYYY-MM-DD'）ごとの目撃。無効化されたものは除き、api が返した順（受け持つ順）を保つ */
        sightingsByDate: computed(
            (): Record<string, OperationSightingDetailsDto[]> =>
                groupBy(
                    sightings().filter((s) => !s.invalidation),
                    (s) => toRailwayDateKey(s.sightingTime),
                ),
        ),
    })),
    withMethods((store) => {
        // 取得の世代番号。時間で変わる値なので computed でなくクロージャに持つ
        let fetchSeq = 0;
        return {
            nextFetchSeq(): number {
                return ++fetchSeq;
            },
            isLatestFetch(seq: number): boolean {
                return seq === fetchSeq;
            },
            /** 月が変わるので、前の月の結果を捨てて条件を置く */
            startMonth(params: {
                formationNumber: string | null;
                month: string;
            }): void {
                patchState(store, {
                    ...params,
                    sightings: [],
                    loaded: false,
                    loadError: false,
                });
            },
            setSightings(sightings: OperationSightingDetailsDto[]): void {
                patchState(store, { sightings });
            },
            setLoaded(loaded: boolean): void {
                patchState(store, { loaded });
            },
            setLoadError(loadError: boolean): void {
                patchState(store, { loadError });
            },
            startSummary(): void {
                patchState(store, {
                    summary: null,
                    summaryFormationNumber: null,
                    summaryError: false,
                });
            },
            setSummary(
                formationNumber: string,
                summary: OperationSightingTimeCrossSectionDto | null,
            ): void {
                patchState(store, {
                    summary,
                    summaryFormationNumber: formationNumber,
                    summaryError: false,
                });
            },
            setSummaryError(formationNumber: string): void {
                patchState(store, {
                    summary: null,
                    summaryFormationNumber: formationNumber,
                    summaryError: true,
                });
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
    withAppDevtools('RecordsFormationStore'),
);
