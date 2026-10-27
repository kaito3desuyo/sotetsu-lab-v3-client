import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { ETimetableEditFormMode } from '../enums/timetable-edit-form.enum';
import {
    draftMatchesContext,
    TimetableEditFormDraft,
    TimetableEditFormDraftContext,
    TimetableEditFormDraftStore,
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

describe('TimetableEditFormDraftStore', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const context: TimetableEditFormDraftContext = {
        mode: ETimetableEditFormMode.ADD,
        calendarId: 'calendar-1',
        tripDirection: ETripDirection.OUTBOUND,
        tripBlockId: null,
    };

    beforeEach(() => {
        jest.useFakeTimers();
        getItem.mockReset().mockResolvedValue(null);
        setItem.mockReset().mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: DeviceStorage, useValue: { getItem, setItem } },
            ],
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('取る前は null', () => {
        expect(TestBed.inject(TimetableEditFormDraftStore).draft()).toBeNull();
    });

    it('saveDraft で文脈と時刻つきの下書きを持ち、clearDraft で消える', () => {
        jest.setSystemTime(1000);
        const store = TestBed.inject(TimetableEditFormDraftStore);

        store.saveDraft(context, [{ tripNumber: '1' }]);
        expect(store.draft()).toEqual({
            ...context,
            trips: [{ tripNumber: '1' }],
            savedAt: 1000,
        });

        store.clearDraft();
        expect(store.draft()).toBeNull();
    });

    it('保存済みの下書きを同じキー・同じ項目名で戻し、settingsReady になる', async () => {
        const saved = { ...context, trips: [], savedAt: 5 };
        getItem.mockResolvedValue({ draft: saved });
        const store = TestBed.inject(TimetableEditFormDraftStore);

        await jest.advanceTimersByTimeAsync(0);

        expect(getItem).toHaveBeenCalledWith('TimetableEditFormDraftStore');
        expect(store.settingsReady()).toBe(true);
        expect(store.draft()).toEqual(saved);
    });

    it('下書きの変更は 800ms まとめて、draft だけを保存する', async () => {
        const store = TestBed.inject(TimetableEditFormDraftStore);
        await jest.advanceTimersByTimeAsync(0);

        store.saveDraft(context, []);
        await jest.advanceTimersByTimeAsync(799);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'TimetableEditFormDraftStore',
            value: { draft: store.draft() },
        });
    });
});
