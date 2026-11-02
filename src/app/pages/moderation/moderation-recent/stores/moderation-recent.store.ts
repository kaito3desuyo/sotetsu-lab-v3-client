import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { ModerationRecentSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-recent-sighting.dto';

type StoreProps = {
    sightings: ModerationRecentSightingDto[];
    /** 直近の取得が 1 ページぶん満ちていた（= まだ古い投稿が残っているかもしれない） */
    hasMore: boolean;
    hasFetched: boolean;
    /** 最初の取得に失敗した（一覧がまだ無いので、骨組みでなく再読み込みを出す） */
    firstFetchFailed: boolean;
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    sightings: [],
    hasMore: false,
    hasFetched: false,
    firstFetchFailed: false,
    loadingQueue: [],
};

export const ModerationRecentStore = signalStore(
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
            replaceSightings(
                sightings: ModerationRecentSightingDto[],
                hasMore: boolean,
            ): void {
                patchState(store, { sightings, hasMore, hasFetched: true });
            },
            appendSightings(
                sightings: ModerationRecentSightingDto[],
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
                        hasFetched: true,
                    };
                });
            },
            setFirstFetchFailed(firstFetchFailed: boolean): void {
                patchState(store, { firstFetchFailed });
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
    withAppDevtools('ModerationRecentStore'),
);
