import { TestBed } from '@angular/core/testing';
import { signalStore, withFeature, withState } from '@ngrx/signals';

import { OfflineSnapshots } from '../offline/offline-snapshots';
import { withOfflineSnapshots } from './with-offline-snapshots';

describe('withOfflineSnapshots', () => {
    const save = jest.fn();
    const restore = jest.fn();
    const apply = jest.fn();
    const applySightings = jest.fn();

    const TestStore = signalStore(
        { providedIn: 'root' },
        withState({ main: 1, sightings: ['s'] }),
        withFeature((store) =>
            withOfflineSnapshots({
                main: {
                    key: 'K',
                    select: () => store.main(),
                    apply,
                },
                sightings: {
                    key: 'S',
                    select: () => store.sightings(),
                    apply: applySightings,
                },
            }),
        ),
    );

    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
        return TestBed.inject(TestStore);
    };

    beforeEach(() => {
        save.mockReset();
        restore.mockReset();
        apply.mockReset();
        applySightings.mockReset();
        save.mockResolvedValue(undefined);
    });

    it('saveOfflineSnapshot は key と conditions と select の値で save を呼ぶ', async () => {
        const store = setup();

        await store.saveOfflineSnapshot('main', { calendarId: 'c1' });

        expect(save).toHaveBeenCalledWith({
            key: 'K',
            conditions: { calendarId: 'c1' },
            data: 1,
        });
    });

    it('restoreOfflineSnapshot は key と conditions を渡し、apply を def に橋渡しする', async () => {
        restore.mockImplementation(
            async (params: { apply: (d: number, t: number) => void }) => {
                params.apply(7, 123);
                return null;
            },
        );
        const store = setup();

        await store.restoreOfflineSnapshot('main', { calendarId: 'c1' });

        expect(restore).toHaveBeenCalledWith({
            key: 'K',
            conditions: { calendarId: 'c1' },
            apply: expect.any(Function),
        });
        expect(apply).toHaveBeenCalledWith(7, 123);
    });

    it('restore の戻り値をそのまま返す', async () => {
        const snapshot = {
            version: 1,
            conditions: { calendarId: 'c1' },
            savedAt: 1,
            data: 1,
        };
        restore.mockResolvedValueOnce(snapshot).mockResolvedValueOnce(null);
        const store = setup();

        await expect(
            store.restoreOfflineSnapshot('main', { calendarId: 'c1' }),
        ).resolves.toBe(snapshot);
        await expect(
            store.restoreOfflineSnapshot('main', { calendarId: 'c1' }),
        ).resolves.toBeNull();
    });

    it('apply が投げた例外は呼び手に投げ返す', async () => {
        const error = new Error('apply failed');
        apply.mockImplementation(() => {
            throw error;
        });
        restore.mockImplementation(
            async (params: { apply: (d: number, t: number) => void }) => {
                params.apply(1, 1);
                return null;
            },
        );
        const store = setup();

        await expect(
            store.restoreOfflineSnapshot('main', { calendarId: 'c1' }),
        ).rejects.toBe(error);
    });

    it('def が 2 つあるとき、それぞれ別の key で呼ばれる', async () => {
        restore.mockResolvedValue(null);
        const store = setup();

        await store.saveOfflineSnapshot('sightings', { calendarId: 'c1' });
        await store.restoreOfflineSnapshot('sightings', { calendarId: 'c1' });

        expect(save).toHaveBeenCalledWith({
            key: 'S',
            conditions: { calendarId: 'c1' },
            data: ['s'],
        });
        expect(restore).toHaveBeenCalledWith(
            expect.objectContaining({ key: 'S' }),
        );
    });
});
