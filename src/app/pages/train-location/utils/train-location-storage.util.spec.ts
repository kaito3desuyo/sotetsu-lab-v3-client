import {
    readRememberedStationId,
    readStationPanelOpen,
    writeRememberedStationId,
    writeStationPanelOpen,
} from './train-location-storage.util';

describe('train-location-storage', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => jest.restoreAllMocks());

    it('前回の駅を路線ごとに覚える', () => {
        writeRememberedStationId('r1', 's1');
        writeRememberedStationId('r2', 's2');

        expect(readRememberedStationId('r1')).toBe('s1');
        expect(readRememberedStationId('r2')).toBe('s2');
        expect(readRememberedStationId('r3')).toBeNull();
    });

    it('欄の開閉を覚える（既定は開いている）', () => {
        expect(readStationPanelOpen()).toBe(true);
        writeStationPanelOpen(false);
        expect(readStationPanelOpen()).toBe(false);
    });

    it('localStorage が例外を投げても既定値で動く', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });

        expect(() => writeRememberedStationId('r1', 's1')).not.toThrow();
        expect(readRememberedStationId('r1')).toBeNull();
        expect(() => writeStationPanelOpen(false)).not.toThrow();
        expect(readStationPanelOpen()).toBe(true);
    });
});
