import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserService } from '../libs/user/usecase/user.service';
import { UserStateQuery, UserStateStore } from './user.state';

const user = {
    userId: 'u1',
    username: 'kaito',
    displayName: 'K',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

describe('UserStateStore.fetch', () => {
    let getProfile: jest.Mock;
    let store: UserStateStore;
    let query: UserStateQuery;

    beforeEach(() => {
        getProfile = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: UserService, useValue: { getProfile } }],
        });
        store = TestBed.inject(UserStateStore);
        query = TestBed.inject(UserStateQuery);
        store.reset();
    });

    it('ユーザーが来たら状態に入れる', () => {
        getProfile.mockReturnValue(of(user));

        store.fetch().subscribe();

        expect(query.userId).toBe('u1');
    });

    it('null（ゲスト）が来たら状態を空に戻す', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(of(null));

        store.fetch().subscribe();

        expect(query.userId).toBeNull();
    });

    it('失敗しても状態を空に戻し、エラーにしない', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(throwError(() => new Error('offline')));
        let failed = false;

        store.fetch().subscribe({ error: () => (failed = true) });

        expect(query.userId).toBeNull();
        expect(failed).toBe(false);
    });

    it('maxAgeMs をそのまま渡す', () => {
        getProfile.mockReturnValue(of(null));

        store.fetch({ maxAgeMs: 5000 }).subscribe();

        expect(getProfile).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});
