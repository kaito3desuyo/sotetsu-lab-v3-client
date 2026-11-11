import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TrainPickerStore } from './train-picker.store';

describe('TrainPickerStore', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();

    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: DeviceStorage, useValue: { getItem, setItem } },
            ],
        });
        return TestBed.inject(TrainPickerStore);
    };

    beforeEach(() => {
        jest.useFakeTimers();
        getItem.mockReset();
        setItem.mockReset();
        getItem.mockResolvedValue(null);
        setItem.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('初期値は駅なし・両方向・前後 10 分', () => {
        const store = setup();

        expect(store.stationId()).toBeNull();
        expect(store.direction()).toBe('both');
        expect(store.minutesBefore()).toBe(10);
        expect(store.minutesAfter()).toBe(10);
        expect(store.tripBlocks()).toEqual([]);
        expect(store.fetchFailed()).toBe(false);
    });

    it('widenBefore / widenAfter はそれぞれ 10 分ずつ広げ、resetWindow で 10/10 に戻る', () => {
        const store = setup();

        store.widenBefore();
        store.widenAfter();
        store.widenAfter();
        expect(store.minutesBefore()).toBe(20);
        expect(store.minutesAfter()).toBe(30);

        store.resetWindow();
        expect(store.minutesBefore()).toBe(10);
        expect(store.minutesAfter()).toBe(10);
    });

    it('enableLoading / disableLoading で isLoading が変わる', () => {
        const store = setup();

        store.enableLoading();
        expect(store.isLoading()).toBe(true);
        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('settingsReady 後の setStationId / setDirection は端末に保存される', async () => {
        const store = setup();
        await jest.advanceTimersByTimeAsync(0);
        expect(store.settingsReady()).toBe(true);

        store.setStationId('st-1');
        store.setDirection('inbound');
        await jest.advanceTimersByTimeAsync(10);

        expect(setItem).toHaveBeenLastCalledWith({
            key: 'TrainPickerStore',
            value: { stationId: 'st-1', direction: 'inbound' },
        });
    });

    it('保存済みの駅と上下を起動時に戻す', async () => {
        getItem.mockResolvedValue({ stationId: 'st-9', direction: 'outbound' });
        const store = setup();
        await jest.advanceTimersByTimeAsync(0);

        expect(store.stationId()).toBe('st-9');
        expect(store.direction()).toBe('outbound');
    });
});
