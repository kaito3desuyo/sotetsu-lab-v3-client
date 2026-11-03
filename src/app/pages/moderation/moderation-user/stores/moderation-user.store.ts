import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { ModerationSightingDto } from 'src/app/libs/moderation/usecase/dtos/moderation-sighting.dto';
import { ModerationTraceDto } from 'src/app/libs/moderation/usecase/dtos/moderation-trace.dto';
import { ModerationUserSummaryDto } from 'src/app/libs/moderation/usecase/dtos/moderation-user-summary.dto';

/** api が一度に受ける無効化の id の数 */
export const MODERATION_INVALIDATE_MAX_IDS = 200;

type StoreProps = {
    /** いま見ている投稿者。別の人へ移ったら beginUser で中身ごと入れ替える */
    userId: string | null;
    summary: ModerationUserSummaryDto | null;
    sightings: ModerationSightingDto[];
    /** 直近の取得が 1 ページぶん満ちていた（= まだ古い目撃が残っているかもしれない） */
    hasMore: boolean;
    hasFetched: boolean;
    /** 最初の取得に失敗した（中身がまだ無いので、骨組みでなく再読み込みを出す） */
    firstFetchFailed: boolean;
    notFound: boolean;
    /** 手がかり。manager だけが取る。null は未取得 */
    traces: ModerationTraceDto[] | null;
    tracesFailed: boolean;
    selectedIds: string[];
    loadingQueue: boolean[];
};

const initialState: StoreProps = {
    userId: null,
    summary: null,
    sightings: [],
    hasMore: false,
    hasFetched: false,
    firstFetchFailed: false,
    notFound: false,
    traces: null,
    tracesFailed: false,
    selectedIds: [],
    loadingQueue: [],
};

export const ModerationUserStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ loadingQueue, sightings, selectedIds }) => {
        const validIds = computed(() =>
            sightings()
                .filter((r) => !r.invalidated)
                .map((r) => r.operationSightingId),
        );
        return {
            isLoading: computed(() => loadingQueue().length > 0),
            validIds,
            selectedCount: computed(() => selectedIds().length),
            overSelectionLimit: computed(
                () => selectedIds().length > MODERATION_INVALIDATE_MAX_IDS,
            ),
            allValidSelected: computed(
                () =>
                    validIds().length > 0 &&
                    validIds().every((id) => selectedIds().includes(id)),
            ),
        };
    }),
    withMethods((store) => {
        let sightingsSeq = 0;
        let tracesSeq = 0;
        return {
            /** 別の投稿者へ移る。前の人の中身を捨て、前の人の取得の返りを古い扱いにする */
            beginUser(userId: string): void {
                sightingsSeq++;
                tracesSeq++;
                patchState(store, { ...initialState, userId });
            },
            nextSightingsSeq: (): number => ++sightingsSeq,
            isLatestSightings: (seq: number): boolean => seq === sightingsSeq,
            nextTracesSeq: (): number => ++tracesSeq,
            isLatestTraces: (seq: number): boolean => seq === tracesSeq,
            setSummary(summary: ModerationUserSummaryDto): void {
                patchState(store, { summary });
            },
            setNotFound(notFound: boolean): void {
                patchState(store, { notFound });
            },
            setFirstFetchFailed(firstFetchFailed: boolean): void {
                patchState(store, { firstFetchFailed });
            },
            /** 要約と最初の 1 ページを入れ替える。選びは空に戻す */
            replaceSightings(
                sightings: ModerationSightingDto[],
                hasMore: boolean,
            ): void {
                patchState(store, {
                    sightings,
                    hasMore,
                    hasFetched: true,
                    selectedIds: [],
                });
            },
            appendSightings(
                sightings: ModerationSightingDto[],
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
            setTraces(traces: ModerationTraceDto[] | null): void {
                patchState(store, { traces, tracesFailed: false });
            },
            setTracesFailed(tracesFailed: boolean): void {
                patchState(store, { tracesFailed });
            },
            toggleSelected(id: string, selected: boolean): void {
                patchState(store, (s) => ({
                    selectedIds: selected
                        ? s.selectedIds.includes(id)
                            ? s.selectedIds
                            : s.selectedIds.concat(id)
                        : s.selectedIds.filter((x) => x !== id),
                }));
            },
            selectAllValid(): void {
                patchState(store, { selectedIds: store.validIds() });
            },
            clearSelection(): void {
                patchState(store, { selectedIds: [] });
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
    withAppDevtools('ModerationUserStore'),
);
