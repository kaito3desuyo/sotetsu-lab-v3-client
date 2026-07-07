import { createStore, select, setProp, withProps } from '@ngneat/elf';
import { persistState } from '@ngneat/elf-persist-state';
import localForage from 'localforage';
import { debounceTime } from 'rxjs';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';

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

const store = createStore(
    { name: 'TimetableEditFormDraftStore' },
    withProps<StoreProps>({ draft: null }),
);

const persist = persistState(store, {
    key: 'TimetableEditFormDraftStore',
    storage: localForage,
    source: () => store.pipe(debounceTime(800)),
});

/**
 * D-11: 独自 localStorage 直叩きはせず elf-persist-state（localForage）で永続化する。
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

export const TimetableEditFormDraftStore = {
    persistInitialized$: persist.initialized$,

    saveDraft(context: TimetableEditFormDraftContext, trips: unknown[]): void {
        store.update(
            setProp('draft', () => ({
                ...context,
                trips,
                savedAt: Date.now(),
            })),
        );
    },

    clearDraft(): void {
        store.update(setProp('draft', () => null));
    },

    draft$: store.pipe(select((s) => s.draft)),

    get draft(): TimetableEditFormDraft | null {
        return store.getValue().draft;
    },
} as const;
