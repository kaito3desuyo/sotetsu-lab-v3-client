import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { DashboardStore } from './dashboard.store';

describe('DashboardStore の保存', () => {
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
        getItem.mockResolvedValue({
            hasVisitedBefore: false,
            runningTripCount: 999,
            latestSightings: [{ operationSightingId: 'old' }],
            loadingQueue: [true],
        });

        const store = TestBed.inject(DashboardStore);
        await flush();

        expect(getItem).toHaveBeenCalledWith('DashboardStore');
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'DashboardStore',
            value: { hasVisitedBefore: false },
        });
        // 設定以外は古い値を戻さない
        expect(store.runningTripCount()).toBe(0);
        expect(store.latestSightings()).toEqual([]);
        expect(store.isLoading()).toBe(false);
        expect(store.settingsReady()).toBe(true);
    });

    it('保存した既訪問フラグを戻す', async () => {
        getItem.mockResolvedValue({ hasVisitedBefore: true });

        const store = TestBed.inject(DashboardStore);
        await flush();

        expect(store.hasVisitedBefore()).toBe(true);
        expect(setItem).not.toHaveBeenCalled();
    });

    it('既訪問にしたら設定だけを保存する', async () => {
        getItem.mockResolvedValue(null);
        const store = TestBed.inject(DashboardStore);
        await flush();

        store.markVisited();
        await flush();

        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: 'DashboardStore',
            value: { hasVisitedBefore: true },
        });
    });

    it('snapshot の中身を restoreSnapshot で戻せる（既訪問フラグと読み込み中は今のまま）', async () => {
        getItem.mockResolvedValue(null);
        const store = TestBed.inject(DashboardStore);
        await flush();
        store.setRunningTripCount(3);
        store.setTodaysDayName('元日');
        const snapshot = store.snapshot();
        store.setRunningTripCount(0);
        store.setTodaysDayName(null);
        store.markVisited();
        store.enableLoading();

        store.restoreSnapshot(snapshot);

        expect(store.snapshot()).toEqual(snapshot);
        expect(store.hasVisitedBefore()).toBe(true);
        expect(store.isLoading()).toBe(true);
        expect(Object.keys(snapshot).sort()).toEqual(
            [
                'todaysCalendar',
                'todaysDayName',
                'runningTripCount',
                'sightingCountToday',
                'latestSightings',
                'latestSightingPositions',
                'itineraryLinks',
                'tripClasses',
            ].sort(),
        );
    });
});
