import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { OperationTableStore } from './operation-table.store';

describe('OperationTableStore の保存', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();

    beforeEach(() => {
        getItem.mockReset();
        setItem.mockReset();
        setItem.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: { getItem, setItem, removeItem: jest.fn() },
                },
            ],
        });
    });

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('旧い丸ごと保存の値を読んだ後、保存先には設定だけが残る', async () => {
        // 運用群を持たない古い値
        getItem.mockResolvedValue({
            operationTrips: [{ operation: { operationId: 'old' } }],
            calendar: { calendarId: 'old' },
            loadingQueue: [true],
        });

        const store = TestBed.inject(OperationTableStore);
        await flush();

        expect(getItem).toHaveBeenCalledWith('OperationTableStore');
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'OperationTableStore',
            value: { selectedGroupNames: [] },
        });
        // 設定以外は古い値を戻さない
        expect(store.operationTrips()).toEqual([]);
        expect(store.calendar()).toBeNull();
        expect(store.isLoading()).toBe(false);
        expect(store.settingsReady()).toBe(true);
    });

    it('運用群の選択は書き戻しでも残る', async () => {
        getItem.mockResolvedValue({
            selectedGroupNames: ['1群'],
            operationTrips: [{ operation: { operationId: 'old' } }],
        });

        const store = TestBed.inject(OperationTableStore);
        await flush();

        expect(store.selectedGroupNames()).toEqual(['1群']);
        expect(setItem).toHaveBeenLastCalledWith({
            key: 'OperationTableStore',
            value: { selectedGroupNames: ['1群'] },
        });
    });

    it('運用群を変えたら設定だけを保存する', async () => {
        getItem.mockResolvedValue(null);
        const store = TestBed.inject(OperationTableStore);
        await flush();

        store.setSelectedGroupNames(['7群']);
        await flush();

        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'OperationTableStore',
            value: { selectedGroupNames: ['7群'] },
        });
    });
});

describe('OperationTableStore', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: () => Promise.resolve(null),
                        setItem: () => Promise.resolve(),
                        removeItem: () => Promise.resolve(),
                    },
                },
            ],
        });
    });

    const operationTrip = (operationNumber: string) =>
        ({
            operation: { operationId: operationNumber, operationNumber },
            trips: [],
        }) as never;

    it('sortedOperationTrips は運用番号の順に並べ、取得した順（operationTrips）は変えない', () => {
        const store = TestBed.inject(OperationTableStore);
        store.setOperationTrips(['21', '11', '31'].map(operationTrip));

        expect(
            store
                .sortedOperationTrips()
                .map(({ operation }) => operation.operationNumber),
        ).toEqual(['11', '21', '31']);
        expect(
            store
                .operationTrips()
                .map(({ operation }) => operation.operationNumber),
        ).toEqual(['21', '11', '31']);
    });

    it('normalizedSelectedGroupNames は旧い群名を今の名前にそろえる', () => {
        const store = TestBed.inject(OperationTableStore);
        store.setSelectedGroupNames(['3G群', '1群']);

        expect(store.normalizedSelectedGroupNames()).toEqual([
            'G群（目黒線）',
            '1群',
        ]);
        expect(store.selectedGroupNames()).toEqual(['3G群', '1群']);
    });

    it('読み込み中は enable / disable / reset で変わる', () => {
        const store = TestBed.inject(OperationTableStore);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('起動時に読み込み中を空にする', () => {
        const store = TestBed.inject(OperationTableStore);

        expect(store.isLoading()).toBe(false);
    });

    it('取得の世代番号は新しい取得だけが最新になる', () => {
        const store = TestBed.inject(OperationTableStore);
        const first = store.nextFetchSeq();
        const second = store.nextFetchSeq();

        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('snapshot の中身を restoreSnapshot で戻せる（条件の calendarId と運用群は今のまま）', () => {
        const store = TestBed.inject(OperationTableStore);
        store.setCalendar({ calendarId: 'cal-1' } as never);
        store.setOperationTrips([operationTrip('11')]);
        store.setStations([{ stationId: 'st-1' }] as never);
        const snapshot = store.snapshot();
        store.setCalendar(null as never);
        store.setOperationTrips([]);
        store.setStations([]);
        store.setCalendarId('cal-2');
        store.setSelectedGroupNames(['1群']);

        store.restoreSnapshot(snapshot);

        expect(store.snapshot()).toEqual(snapshot);
        expect(store.calendarId()).toBe('cal-2');
        expect(store.selectedGroupNames()).toEqual(['1群']);
        expect(Object.keys(snapshot).sort()).toEqual(
            [
                'calendar',
                'operationTrips',
                'itineraryLinks',
                'stations',
                'tripClasses',
            ].sort(),
        );
    });

    it('つながりを持たない古い保存を戻したら、つながりは空になる', () => {
        const store = TestBed.inject(OperationTableStore);
        store.setItineraryLinks([{ tripOperationListId: 'x' }] as never);

        store.restoreSnapshot({
            calendar: null,
            operationTrips: [],
            stations: [],
            tripClasses: [],
        } as never);

        expect(store.itineraryLinks()).toEqual([]);
    });
});
