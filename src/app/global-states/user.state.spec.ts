import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserService } from '../libs/user/usecase/user.service';
import { UserState } from './user.state';

const user = {
    userId: 'u1',
    username: 'kaito',
    displayName: 'K',
    role: 'admin',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

describe('UserState.fetch', () => {
    let getProfile: jest.Mock;
    let store: InstanceType<typeof UserState>;

    beforeEach(() => {
        getProfile = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: UserService, useValue: { getProfile } }],
        });
        store = TestBed.inject(UserState);
        store.reset();
    });

    it('ユーザーが来たら状態に入れる', () => {
        getProfile.mockReturnValue(of(user));

        store.fetch().subscribe();

        expect(store.userId()).toBe('u1');
    });

    it('null（ゲスト）が来たら状態を空に戻す', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(of(null));

        store.fetch().subscribe();

        expect(store.userId()).toBeNull();
    });

    it('失敗しても状態を空に戻し、エラーにしない', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();
        getProfile.mockReturnValue(throwError(() => new Error('offline')));
        let failed = false;

        store.fetch().subscribe({ error: () => (failed = true) });

        expect(store.userId()).toBeNull();
        expect(failed).toBe(false);
    });

    it('reset で状態を空に戻す', () => {
        getProfile.mockReturnValue(of(user));
        store.fetch().subscribe();

        store.reset();

        expect(store.userId()).toBeNull();
        expect(store.isLoggedIn()).toBe(false);
        expect(store.role()).toBeNull();
    });

    it('maxAgeMs をそのまま渡す', () => {
        getProfile.mockReturnValue(of(null));

        store.fetch({ maxAgeMs: 5000 }).subscribe();

        expect(getProfile).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});

describe('UserState.canEditTimetable', () => {
    let store: InstanceType<typeof UserState>;
    let getProfile: jest.Mock;

    beforeEach(() => {
        getProfile = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: UserService, useValue: { getProfile } }],
        });
        store = TestBed.inject(UserState);
        store.reset();
    });

    const load = (role: string | null) => {
        getProfile.mockReturnValue(of(role ? { ...user, role } : null));
        store.fetch().subscribe();
    };

    it.each([
        ['editor', true],
        ['manager', true],
        ['reporter', false],
        ['admin', false],
        [null, false],
    ])('role=%s のとき %s', (role, expected) => {
        load(role);

        expect(store.canEditTimetable()).toBe(expected);
    });
});
