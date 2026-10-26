import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import localForage from 'localforage';

import { NotificationService } from '../services/notification.service';
import {
    OFFLINE_SNAPSHOT_VERSION,
    OfflineSnapshot,
    OfflineSnapshots,
} from './offline-snapshots';

jest.mock('localforage', () => ({
    __esModule: true,
    default: { getItem: jest.fn(), setItem: jest.fn() },
}));

describe('OfflineSnapshots', () => {
    const getItem = localForage.getItem as jest.Mock;
    const setItem = localForage.setItem as jest.Mock;
    const open = jest.fn();
    const savedAt = new Date(2026, 9, 26, 21, 5).getTime();

    const setup = (
        platform: 'browser' | 'server' = 'browser',
    ): OfflineSnapshots => {
        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: platform },
                { provide: NotificationService, useValue: { open } },
            ],
        });
        return TestBed.inject(OfflineSnapshots);
    };

    const snapshot = (
        overrides: Partial<OfflineSnapshot<{ a: number }>> = {},
    ): OfflineSnapshot<{ a: number }> => ({
        version: OFFLINE_SNAPSHOT_VERSION,
        conditions: { calendarId: 'c1' },
        savedAt,
        data: { a: 1 },
        ...overrides,
    });

    beforeEach(() => {
        jest.resetAllMocks();
        setItem.mockResolvedValue(undefined);
    });

    describe('save', () => {
        it('条件と時刻と版を添えて offline-snapshot:<key> に書く', async () => {
            jest.spyOn(Date, 'now').mockReturnValue(savedAt);
            const service = setup();

            await service.save({
                key: 'Foo',
                conditions: { calendarId: 'c1' },
                data: { a: 1 },
            });

            expect(setItem).toHaveBeenCalledWith('offline-snapshot:Foo', {
                version: 1,
                conditions: { calendarId: 'c1' },
                savedAt,
                data: { a: 1 },
            });
            jest.restoreAllMocks();
        });

        it('setItem の失敗を投げず、次の save はまた書く', async () => {
            setItem.mockRejectedValueOnce(new Error('quota'));
            const service = setup();

            await expect(
                service.save({ key: 'Foo', conditions: {}, data: { a: 1 } }),
            ).resolves.toBeUndefined();
            await service.save({ key: 'Foo', conditions: {}, data: { a: 2 } });

            expect(setItem).toHaveBeenCalledTimes(2);
        });
    });

    describe('restore', () => {
        beforeEach(() => {
            jest.spyOn(Date, 'now').mockReturnValue(
                new Date(2026, 9, 26, 23, 0).getTime(),
            );
        });
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('条件が合えば apply と知らせを呼ぶ', async () => {
            getItem.mockResolvedValue(snapshot());
            const service = setup();
            const apply = jest.fn();

            const result = await service.restore({
                key: 'Foo',
                conditions: { calendarId: 'c1' },
                apply,
            });

            expect(getItem).toHaveBeenCalledWith('offline-snapshot:Foo');
            expect(apply).toHaveBeenCalledTimes(1);
            expect(apply).toHaveBeenCalledWith({ a: 1 }, savedAt);
            expect(open).toHaveBeenCalledTimes(1);
            expect(open).toHaveBeenCalledWith(
                '通信できないため、21時5分に保存した内容を表示しています',
                'OK',
            );
            expect(result).toEqual(snapshot());
        });

        it.each([
            ['条件の値が 1 つでも違えば', snapshot(), { calendarId: 'c2' }],
            [
                '条件のキーが違えば',
                snapshot(),
                { calendarId: 'c1', stationId: 's1' },
            ],
            ['版が違えば', snapshot({ version: 0 }), { calendarId: 'c1' }],
        ])('%s何もしない', async (_name, saved, conditions) => {
            getItem.mockResolvedValue(saved);
            const service = setup();
            const apply = jest.fn();

            await expect(
                service.restore({ key: 'Foo', conditions, apply }),
            ).resolves.toBeNull();

            expect(apply).not.toHaveBeenCalled();
            expect(open).not.toHaveBeenCalled();
        });

        it.each([
            ['無い', undefined],
            ['null', null],
            ['オブジェクトでない', 'broken'],
        ])(
            '保存した条件が壊れていたら戻さない（条件が%s）',
            async (_name, conditions) => {
                getItem.mockResolvedValue({ ...snapshot(), conditions });
                const service = setup();
                const apply = jest.fn();

                await expect(
                    service.restore({
                        key: 'Foo',
                        conditions: { calendarId: 'c1' },
                        apply,
                    }),
                ).resolves.toBeNull();

                expect(apply).not.toHaveBeenCalled();
                expect(open).not.toHaveBeenCalled();
            },
        );

        it('getItem が reject しても null を返す', async () => {
            getItem.mockRejectedValue(new Error('broken'));
            const service = setup();
            const apply = jest.fn();

            await expect(
                service.restore({
                    key: 'Foo',
                    conditions: { calendarId: 'c1' },
                    apply,
                }),
            ).resolves.toBeNull();

            expect(apply).not.toHaveBeenCalled();
            expect(open).not.toHaveBeenCalled();
        });

        it('保存が無ければ null を返す', async () => {
            getItem.mockResolvedValue(null);
            const service = setup();
            const apply = jest.fn();

            await expect(
                service.restore({
                    key: 'Foo',
                    conditions: { calendarId: 'c1' },
                    apply,
                }),
            ).resolves.toBeNull();

            expect(apply).not.toHaveBeenCalled();
            expect(open).not.toHaveBeenCalled();
        });
    });

    describe('サーバー', () => {
        it('save も restore も localforage に触らない', async () => {
            const service = setup('server');
            const apply = jest.fn();

            await service.save({ key: 'Foo', conditions: {}, data: { a: 1 } });
            const result = await service.restore({
                key: 'Foo',
                conditions: {},
                apply,
            });

            expect(result).toBeNull();
            expect(setItem).not.toHaveBeenCalled();
            expect(getItem).not.toHaveBeenCalled();
            expect(apply).not.toHaveBeenCalled();
            expect(open).not.toHaveBeenCalled();
        });
    });
});
