import { TestBed } from '@angular/core/testing';
import { TimetableFormationStore } from './timetable-formation.store';

describe('Store: TimetableFormation', () => {
    let store: InstanceType<typeof TimetableFormationStore>;
    beforeEach(() => {
        store = TestBed.inject(TimetableFormationStore);
    });

    it('取得の世代は新しいものだけが最新', () => {
        const a = store.nextFetchSeq();
        const b = store.nextFetchSeq();
        expect(store.isLatestFetch(a)).toBe(false);
        expect(store.isLatestFetch(b)).toBe(true);
        expect(store.currentFetchSeq()).toBe(b);
    });

    it('取得前は notFound / noCalendar を立てない', () => {
        expect(store.notFound()).toBe(false);
        expect(store.noCalendar()).toBe(false);
    });

    it('canSelectTomorrow は今日の画面で明日の運用があるときだけ true', () => {
        store.startDay({
            formationNumber: '1',
            date: '2026-11-11',
            dateKind: 'today',
        });
        expect(store.canSelectTomorrow()).toBe(false);
        store.setTomorrowOperationId('op');
        expect(store.canSelectTomorrow()).toBe(true);
        store.startDay({
            formationNumber: '1',
            date: '2026-11-12',
            dateKind: 'tomorrow',
        });
        store.setTomorrowOperationId('op');
        expect(store.canSelectTomorrow()).toBe(false);
    });

    it('読み込み中の印が積まれて外れる', () => {
        store.enableLoading();
        expect(store.isLoading()).toBe(true);
        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('loadError のときは notFound / noCalendar を立てない', () => {
        store.setLoaded(true);
        expect(store.noCalendar()).toBe(true);
        expect(store.notFound()).toBe(true);
        store.setLoadError(true);
        expect(store.noCalendar()).toBe(false);
        expect(store.notFound()).toBe(false);
    });

    it('todaysSightings に同日引き継ぎの写しを元の目撃と重ねて出さない', () => {
        store.setFormation({ formationId: 'f1', formationNumber: '8713' });
        const original = {
            operationSightingId: 's1',
            formationId: 'f1',
            operationId: 'op16',
            sightingTime: '2026-11-11T09:00:00+09:00',
        };
        store.setSightings([
            original,
            {
                ...original,
                operationSightingId: 's1#15K',
                operationId: 'op15',
                sightedAsOperation: {
                    operationId: 'op16',
                    operationNumber: '16K',
                },
            },
        ]);
        expect(
            store.todaysSightings().map((s) => s.operationSightingId),
        ).toEqual(['s1']);
    });
});
