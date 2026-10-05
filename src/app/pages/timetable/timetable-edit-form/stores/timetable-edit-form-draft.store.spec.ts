import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';
import {
    draftMatchesContext,
    TimetableEditFormDraft,
    TimetableEditFormDraftContext,
} from './timetable-edit-form-draft.store';

describe('draftMatchesContext', () => {
    const context: TimetableEditFormDraftContext = {
        mode: ETimetableEditFormMode.COPY,
        calendarId: 'calendar-1',
        tripDirection: ETripDirection.OUTBOUND,
        tripBlockId: 'block-1',
    };

    const draft: TimetableEditFormDraft = {
        ...context,
        trips: [{ tripNumber: '123' }],
        savedAt: 1,
    };

    it('下書きが無ければ false', () => {
        expect(draftMatchesContext(null, context)).toBe(false);
    });

    it('mode/calendarId/tripDirection/tripBlockId が全て一致すれば true', () => {
        expect(draftMatchesContext(draft, context)).toBe(true);
    });

    it('calendarId が異なれば false（別ダイヤの下書きを誤復元しない）', () => {
        expect(
            draftMatchesContext(draft, { ...context, calendarId: 'other' }),
        ).toBe(false);
    });

    it('mode が異なれば false（add の下書きを update に誤復元しない）', () => {
        expect(
            draftMatchesContext(draft, {
                ...context,
                mode: ETimetableEditFormMode.UPDATE,
            }),
        ).toBe(false);
    });

    it('tripBlockId が異なれば false（別ブロックの下書きを誤復元しない）', () => {
        expect(
            draftMatchesContext(draft, { ...context, tripBlockId: 'other' }),
        ).toBe(false);
    });
});
