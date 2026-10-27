import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import localForage from 'localforage';

import { DeviceStorage } from './device-storage';

jest.mock('localforage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
}));

describe('DeviceStorage', () => {
    const getItem = localForage.getItem as jest.Mock;
    const setItem = localForage.setItem as jest.Mock;
    const removeItem = localForage.removeItem as jest.Mock;

    const setup = (
        platform: 'browser' | 'server' = 'browser',
    ): DeviceStorage => {
        TestBed.configureTestingModule({
            providers: [{ provide: PLATFORM_ID, useValue: platform }],
        });
        return TestBed.inject(DeviceStorage);
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('getItem は localforage の値を返す', async () => {
        getItem.mockResolvedValue({ a: 1 });
        const storage = setup();

        await expect(storage.getItem('K')).resolves.toEqual({ a: 1 });
        expect(getItem).toHaveBeenCalledWith('K');
    });

    it('getItem は localforage が reject したら null を返す', async () => {
        getItem.mockRejectedValue(new Error('fail'));
        const storage = setup();

        await expect(storage.getItem('K')).resolves.toBeNull();
    });

    it('setItem は localforage に key と value を渡す', async () => {
        setItem.mockResolvedValue(undefined);
        const storage = setup();

        await storage.setItem({ key: 'K', value: { a: 1 } });

        expect(setItem).toHaveBeenCalledWith('K', { a: 1 });
    });

    it('setItem は localforage が reject しても resolve する', async () => {
        setItem.mockRejectedValue(new Error('fail'));
        const storage = setup();

        await expect(
            storage.setItem({ key: 'K', value: 1 }),
        ).resolves.toBeUndefined();
    });

    it('removeItem は localforage が reject しても resolve する', async () => {
        removeItem.mockRejectedValue(new Error('fail'));
        const storage = setup();

        await expect(storage.removeItem('K')).resolves.toBeUndefined();
        expect(removeItem).toHaveBeenCalledWith('K');
    });

    it('サーバーでは getItem が null を返し、localforage を呼ばない', async () => {
        const storage = setup('server');

        await expect(storage.getItem('K')).resolves.toBeNull();
        await storage.setItem({ key: 'K', value: 1 });
        await storage.removeItem('K');

        expect(getItem).not.toHaveBeenCalled();
        expect(setItem).not.toHaveBeenCalled();
        expect(removeItem).not.toHaveBeenCalled();
    });
});
