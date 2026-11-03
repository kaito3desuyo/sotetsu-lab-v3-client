import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { MyOperationSightingDto } from 'src/app/libs/operation-sighting/usecase/dtos/my-operation-sighting.dto';
import { MySummaryDto } from 'src/app/libs/user/usecase/dtos/my-summary.dto';

type StoreProps = {
    summary: MySummaryDto | null;
    sightings: MyOperationSightingDto[];
    /** 直近の取得が 1 ページぶん満ちていた（= まだ古い目撃が残っているかもしれない） */
    hasMore: boolean;
    hasFetched: boolean;
    /** 最初の取得に失敗した（中身がまだ無いので、骨組みでなく再読み込みを出す） */
    firstFetchFailed: boolean;
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    summary: null,
    sightings: [],
    hasMore: false,
    hasFetched: false,
    firstFetchFailed: false,
    loadingQueue: [],
};

/** 本人の目撃の要約と一覧。個人のデータなので保存はしない（設定も圏外用の控えも持たない） */
export const MyPageStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
    })),
    withMethods((store) => {
        let fetchSeq = 0;
        return {
            nextFetchSeq: (): number => ++fetchSeq,
            isLatestFetch: (seq: number): boolean => seq === fetchSeq,
            /** ページを開き直す。前の中身（別のアカウントのものかもしれない）を捨て、前の取得の返りを古い扱いにする */
            begin(): void {
                fetchSeq++;
                patchState(store, initialState);
            },
            setSummary(summary: MySummaryDto): void {
                patchState(store, { summary });
            },
            setFirstFetchFailed(firstFetchFailed: boolean): void {
                patchState(store, { firstFetchFailed });
            },
            /** 最初の 1 ページを入れ替える */
            replaceSightings(
                sightings: MyOperationSightingDto[],
                hasMore: boolean,
            ): void {
                patchState(store, { sightings, hasMore, hasFetched: true });
            },
            /** 続きの 1 ページを足す。同時刻の境目で重なった行は入れない */
            appendSightings(
                sightings: MyOperationSightingDto[],
                hasMore: boolean,
            ): void {
                patchState(store, (s) => {
                    const known = new Set(
                        s.sightings.map((r) => r.operationSightingId),
                    );
                    return {
                        sightings: s.sightings.concat(
                            sightings.filter(
                                (r) => !known.has(r.operationSightingId),
                            ),
                        ),
                        hasMore,
                    };
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
    withAppDevtools('MyPageStore'),
);
