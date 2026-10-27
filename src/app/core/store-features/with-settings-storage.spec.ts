import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { DeviceStorage } from '../storage/device-storage';
import { withSettingsStorage } from './with-settings-storage';

interface TestState {
    selectedGroupNames: string[];
    trips: string[];
    loading: boolean;
}

const initialState: TestState = {
    selectedGroupNames: [],
    trips: [],
    loading: false,
};

const KEY = 'TestSettings';

const TestStore = signalStore(
    { providedIn: 'root' },
    withState<TestState>(initialState),
    withSettingsStorage<TestState>({
        key: KEY,
        fields: ['selectedGroupNames'],
        debounceMs: 100,
    }),
);

interface NoiseState {
    a: number;
    noise: number;
}

const NOISE_KEY = 'NoiseSettings';

const NoiseStore = signalStore(
    { providedIn: 'root' },
    withState<NoiseState>({ a: 0, noise: 0 }),
    withSettingsStorage<NoiseState>({
        key: NOISE_KEY,
        fields: ['a'],
        debounceMs: 1000,
    }),
);

describe('withSettingsStorage（保存しない項目が絶えず変わるストア）', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();

    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: DeviceStorage, useValue: { getItem, setItem } },
            ],
        });
        return TestBed.inject(NoiseStore);
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

    it('保存しない項目を 600ms ごとに書き換え続けても、fields の変更は 1000ms 後に書く', async () => {
        const store = setup();
        await jest.advanceTimersByTimeAsync(0);

        patchState(unprotected(store), { a: 1 });
        for (let elapsed = 600; elapsed <= 3000; elapsed += 600) {
            await jest.advanceTimersByTimeAsync(600);
            patchState(unprotected(store), { noise: elapsed });
            if (elapsed === 600) {
                expect(setItem).not.toHaveBeenCalled();
            }
        }

        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: NOISE_KEY,
            value: { a: 1 },
        });
    });

    it('書き込みは fields を変えた 1000ms 後に起きる（保存しない項目の変更で遅れない）', async () => {
        const store = setup();
        await jest.advanceTimersByTimeAsync(0);

        patchState(unprotected(store), { a: 1 });
        await jest.advanceTimersByTimeAsync(600);
        patchState(unprotected(store), { noise: 1 });
        await jest.advanceTimersByTimeAsync(399);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledTimes(1);
    });

    it('fields を 500ms 空けて 2 回変えたら、2 回目から 1000ms 後に 1 回だけ書く', async () => {
        const store = setup();
        await jest.advanceTimersByTimeAsync(0);

        patchState(unprotected(store), { a: 1 });
        await jest.advanceTimersByTimeAsync(500);
        patchState(unprotected(store), { a: 2 });
        await jest.advanceTimersByTimeAsync(999);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: NOISE_KEY,
            value: { a: 2 },
        });
    });
});

describe('withSettingsStorage', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();

    const setup = (platform: 'browser' | 'server' = 'browser') => {
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: platform },
                { provide: DeviceStorage, useValue: { getItem, setItem } },
            ],
        });
        return TestBed.inject(TestStore);
    };

    const flush = async (): Promise<void> => {
        await jest.advanceTimersByTimeAsync(0);
    };

    beforeEach(() => {
        jest.useFakeTimers();
        getItem.mockReset();
        setItem.mockReset();
        setItem.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('保存の値から fields だけを戻す', async () => {
        getItem.mockResolvedValue({
            selectedGroupNames: ['A'],
            trips: ['x'],
        });
        const store = setup();
        await flush();

        expect(getItem).toHaveBeenCalledWith(KEY);
        expect(store.settingsReady()).toBe(true);
        expect(store.selectedGroupNames()).toEqual(['A']);
        expect(store.trips()).toEqual([]);
    });

    it('fields 以外を含む古い保存は、fields だけに書き直す', async () => {
        getItem.mockResolvedValue({
            selectedGroupNames: ['A'],
            trips: ['x'],
        });
        setup();
        await flush();
        await jest.advanceTimersByTimeAsync(1000);

        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: KEY,
            value: { selectedGroupNames: ['A'] },
        });
    });

    it('fields だけの保存なら書き直さない', async () => {
        getItem.mockResolvedValue({ selectedGroupNames: ['A'] });
        setup();
        await flush();
        await jest.advanceTimersByTimeAsync(1000);

        expect(setItem).not.toHaveBeenCalled();
    });

    it('保存が null なら、ready になるだけで書かない', async () => {
        getItem.mockResolvedValue(null);
        const store = setup();
        await flush();
        await jest.advanceTimersByTimeAsync(1000);

        expect(store.settingsReady()).toBe(true);
        expect(setItem).not.toHaveBeenCalled();
    });

    it('読み込み後の変更は debounceMs だけ待って 1 回書く', async () => {
        getItem.mockResolvedValue(null);
        const store = setup();
        await flush();

        patchState(unprotected(store), { selectedGroupNames: ['B'] });
        await jest.advanceTimersByTimeAsync(99);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: KEY,
            value: { selectedGroupNames: ['B'] },
        });
    });

    it('間引きの窓の中で何度変えても、最後の値を 1 回だけ書く', async () => {
        getItem.mockResolvedValue(null);
        const store = setup();
        await flush();

        patchState(unprotected(store), { selectedGroupNames: ['B'] });
        await jest.advanceTimersByTimeAsync(60);
        patchState(unprotected(store), { selectedGroupNames: ['B', 'C'] });
        await jest.advanceTimersByTimeAsync(60);
        patchState(unprotected(store), { selectedGroupNames: ['B', 'C', 'D'] });
        await jest.advanceTimersByTimeAsync(99);
        expect(setItem).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1);
        expect(setItem).toHaveBeenCalledTimes(1);
        expect(setItem).toHaveBeenCalledWith({
            key: KEY,
            value: { selectedGroupNames: ['B', 'C', 'D'] },
        });
    });

    it('参照だけ違って中身が同じ値に差し替えても書かない', async () => {
        getItem.mockResolvedValue({ selectedGroupNames: ['A'] });
        const store = setup();
        await flush();

        patchState(unprotected(store), { selectedGroupNames: ['A'] });
        await jest.advanceTimersByTimeAsync(1000);

        expect(setItem).not.toHaveBeenCalled();
    });

    it('窓の中で変えて元に戻したら書かない', async () => {
        getItem.mockResolvedValue({ selectedGroupNames: ['A'] });
        const store = setup();
        await flush();

        patchState(unprotected(store), { selectedGroupNames: ['B'] });
        await jest.advanceTimersByTimeAsync(50);
        patchState(unprotected(store), { selectedGroupNames: ['A'] });
        await jest.advanceTimersByTimeAsync(1000);

        expect(setItem).not.toHaveBeenCalled();
    });

    it('fields 以外の変更では書かない', async () => {
        getItem.mockResolvedValue(null);
        const store = setup();
        await flush();

        patchState(unprotected(store), { trips: ['t'], loading: true });
        await jest.advanceTimersByTimeAsync(1000);

        expect(setItem).not.toHaveBeenCalled();
    });

    it('サーバーでは最初から ready で、読み書きしない', async () => {
        const store = setup('server');

        expect(store.settingsReady()).toBe(true);

        patchState(unprotected(store), { selectedGroupNames: ['B'] });
        await jest.advanceTimersByTimeAsync(1000);

        expect(getItem).not.toHaveBeenCalled();
        expect(setItem).not.toHaveBeenCalled();
    });

    it('読み込みが済む前の変更は書かず、読み込みの値で上書きされる', async () => {
        let resolveGet: (value: unknown) => void = () => undefined;
        getItem.mockReturnValue(
            new Promise((resolve) => {
                resolveGet = resolve;
            }),
        );
        const store = setup();

        patchState(unprotected(store), { selectedGroupNames: ['C'] });
        await jest.advanceTimersByTimeAsync(1000);
        expect(store.settingsReady()).toBe(false);
        expect(setItem).not.toHaveBeenCalled();

        resolveGet({ selectedGroupNames: ['A'] });
        await flush();
        await jest.advanceTimersByTimeAsync(1000);

        expect(store.selectedGroupNames()).toEqual(['A']);
        expect(setItem).not.toHaveBeenCalled();
    });

    it('保存の値が undefined の項目は戻さず、null なら null を戻す', async () => {
        getItem.mockResolvedValue({ selectedGroupNames: undefined });
        const first = setup();
        await flush();
        expect(first.selectedGroupNames()).toEqual([]);

        TestBed.resetTestingModule();
        getItem.mockResolvedValue({ selectedGroupNames: null });
        const second = setup();
        await flush();
        expect(second.selectedGroupNames()).toBeNull();
    });
});
