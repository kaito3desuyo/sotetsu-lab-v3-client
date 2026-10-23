import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { FeatureFlagService } from '../libs/feature-flag/usecase/feature-flag.service';
import {
    FeatureFlagStateQuery,
    FeatureFlagStateStore,
} from './feature-flag.state';

describe('FeatureFlagStateStore.fetch', () => {
    let findAll: jest.Mock;
    let store: FeatureFlagStateStore;
    let query: FeatureFlagStateQuery;

    beforeEach(() => {
        findAll = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: FeatureFlagService, useValue: { findAll } }],
        });
        store = TestBed.inject(FeatureFlagStateStore);
        query = TestBed.inject(FeatureFlagStateQuery);
        store.reset();
    });

    it('registered_only_posting が true なら registeredOnlyPosting$ が true', async () => {
        findAll.mockReturnValue(of({ registered_only_posting: true }));

        await firstValueFrom(store.fetch());

        expect(await firstValueFrom(query.registeredOnlyPosting$)).toBe(true);
    });

    it('空のオブジェクト（キーが無い）なら false', async () => {
        findAll.mockReturnValue(of({}));

        await firstValueFrom(store.fetch());

        expect(await firstValueFrom(query.registeredOnlyPosting$)).toBe(false);
    });

    it('取得が失敗したら false のまま、例外を出さない', async () => {
        findAll.mockReturnValue(throwError(() => new Error('offline')));

        await expect(firstValueFrom(store.fetch())).resolves.toBeUndefined();

        expect(await firstValueFrom(query.registeredOnlyPosting$)).toBe(false);
    });

    it('取得が失敗したら、前の値を残す', async () => {
        findAll.mockReturnValue(of({ registered_only_posting: true }));
        await firstValueFrom(store.fetch());
        findAll.mockReturnValue(throwError(() => new Error('offline')));

        await firstValueFrom(store.fetch());

        expect(await firstValueFrom(query.registeredOnlyPosting$)).toBe(true);
    });
});
