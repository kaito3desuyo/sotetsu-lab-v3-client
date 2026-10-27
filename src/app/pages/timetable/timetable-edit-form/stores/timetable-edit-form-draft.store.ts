import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { ETimetableEditFormMode } from '../enums/timetable-edit-form.enum';

export type TimetableEditFormDraftContext = {
    mode: ETimetableEditFormMode;
    calendarId: string;
    tripDirection: ETripDirection | null;
    tripBlockId: string | null;
};

export type TimetableEditFormDraft = TimetableEditFormDraftContext & {
    trips: unknown[];
    savedAt: number;
};

type StoreProps = {
    draft: TimetableEditFormDraft | null;
};

const initialState: StoreProps = { draft: null };

/**
 * D-11: 独自 localStorage 直叩きはせず withSettingsStorage（localForage）で永続化する。
 * 下書きは「直近の 1 件」のみ保持する（B8 要件は下書き 1 本の再訪復元提案）。
 */
export function draftMatchesContext(
    draft: TimetableEditFormDraft | null,
    context: TimetableEditFormDraftContext,
): boolean {
    if (!draft) return false;

    return (
        draft.mode === context.mode &&
        draft.calendarId === context.calendarId &&
        draft.tripDirection === context.tripDirection &&
        draft.tripBlockId === context.tripBlockId
    );
}

export const TimetableEditFormDraftStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withMethods((store) => ({
        saveDraft(
            context: TimetableEditFormDraftContext,
            trips: unknown[],
        ): void {
            patchState(store, {
                draft: { ...context, trips, savedAt: Date.now() },
            });
        },

        clearDraft(): void {
            patchState(store, { draft: null });
        },
    })),
    withSettingsStorage<StoreProps>({
        key: 'TimetableEditFormDraftStore',
        fields: ['draft'],
        debounceMs: 800,
    }),
    withAppDevtools('TimetableEditFormDraftStore'),
);
