import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import {
    generateDates,
    OperationPastTimeStore,
} from './operation-past-time.store';

describe('generateDates', () => {
    it('基準日から先へ N 日間を返す', () => {
        expect(generateDates('2026-09-21', 3)).toEqual([
            '2026-09-21',
            '2026-09-22',
            '2026-09-23',
        ]);
    });

    it('月をまたいでも続ける', () => {
        expect(generateDates('2026-09-30', 2)).toEqual([
            '2026-09-30',
            '2026-10-01',
        ]);
    });

    it('基準日か日数が無ければ空', () => {
        expect(generateDates(null, 7)).toEqual([]);
        expect(generateDates('2026-09-23', null)).toEqual([]);
    });
});

describe('OperationPastTimeStore', () => {
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    beforeEach(() => {
        save.mockClear();
        restore.mockReset();
        TestBed.configureTestingModule({
            providers: [
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
    });

    it('dates: 基準日と日数から運行日を並べ、変えれば追いかける', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        expect(store.dates()).toEqual([]);

        store.setReferenceDate('2026-09-30');
        store.setDays(2);
        expect(store.dates()).toEqual(['2026-09-30', '2026-10-01']);

        store.setDays(1);
        expect(store.dates()).toEqual(['2026-09-30']);
    });

    it('isLoading: 読み込み中の数が 1 以上の間だけ true', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('resetLoading: 残っていた読み込み中の数を空にする', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        patchState(unprotected(store), { loadingQueue: [true, true] });
        expect(store.isLoading()).toBe(true);

        store.resetLoading();

        expect(store.isLoading()).toBe(false);
    });

    it('operationSightingsGroupedByDate: 編成と運行日（4 時区切り）で分け、state の一覧は変えない', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        const noon = {
            operationSightingId: 's-1',
            formationId: 'f-1',
            sightingTime: '2026-10-12T03:00:00.000Z',
        } as never;
        // 日本時間 2026-10-13 3 時 → 運行日は 10/12
        const night = {
            operationSightingId: 's-2',
            formationId: 'f-1',
            sightingTime: '2026-10-12T18:00:00.000Z',
        } as never;
        const other = {
            operationSightingId: 's-3',
            formationId: 'f-2',
            sightingTime: '2026-10-13T00:00:00.000Z',
        } as never;

        store.setOperationSightings([noon, night, other]);

        expect(store.operationSightingsGroupedByDate()).toEqual({
            'f-1': { '2026-10-12': [noon, night] },
            'f-2': { '2026-10-13': [other] },
        });
        expect(store.operationSightings()).toEqual([noon, night, other]);
    });

    it('snapshot / restoreSnapshot: 中身だけを出し入れし、条件と絞り込みは触らない', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        store.setReferenceDate('2026-10-22');
        store.setDays(7);
        store.setSelectedAgencyIds(['a-1']);
        const data = {
            calendars: [{ date: '2026-10-22', calendar: {} }],
            operations: [{ operationId: 'op-1' }],
            formations: [{ formationId: 'f-1' }],
            operationSightings: [{ operationSightingId: 's-1' }],
        } as never;

        store.restoreSnapshot(data);

        expect(store.snapshot()).toEqual(data);
        expect(store.referenceDate()).toBe('2026-10-22');
        expect(store.days()).toBe(7);
        expect(store.selectedAgencyIds()).toEqual(['a-1']);
    });

    it('取得の世代番号: いちばん新しい番号だけが最新', () => {
        const store = TestBed.inject(OperationPastTimeStore);
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(second).toBe(first + 1);
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('圏外の保存: キー OperationPastTime で、いまの中身を条件つきで保存・戻す', async () => {
        const store = TestBed.inject(OperationPastTimeStore);
        const conditions = {
            referenceDate: '2026-10-22',
            days: 7,
            includeInvalidated: false,
        };
        store.setFormations([{ formationId: 'f-1' }] as never);

        await store.saveOfflineSnapshot('main', conditions);

        expect(save).toHaveBeenCalledWith({
            key: 'OperationPastTime',
            conditions,
            data: {
                calendars: [],
                operations: [],
                formations: [{ formationId: 'f-1' }],
                operationSightings: [],
            },
        });

        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                params.apply(
                    {
                        calendars: [],
                        operations: [],
                        formations: [{ formationId: 'f-2' }],
                        operationSightings: [],
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );
        await store.restoreOfflineSnapshot('main', conditions);

        expect(restore).toHaveBeenCalledWith({
            key: 'OperationPastTime',
            conditions,
            apply: expect.any(Function),
        });
        expect(store.formations()).toEqual([{ formationId: 'f-2' }]);
    });
});
