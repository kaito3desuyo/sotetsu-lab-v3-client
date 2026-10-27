import { TestBed } from '@angular/core/testing';
import { addMinutes, addSeconds, getUnixTime, subMinutes } from 'date-fns';
import { lastValueFrom, of, throwError } from 'rxjs';

import { AuthService } from '../libs/auth/usecase/auth.service';
import { TokenState } from './token.state';

describe('TokenState.isExpired', () => {
    let store: InstanceType<typeof TokenState>;
    let mockGetToken: jest.Mock;

    beforeEach(() => {
        mockGetToken = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { getToken: mockGetToken } },
            ],
        });
        store = TestBed.inject(TokenState);
    });

    it('returns false when expiresAt is null', () => {
        mockGetToken.mockReturnValue(
            of({ accessToken: null, tokenType: null, expiresAt: null }),
        );
        store.fetch().subscribe();
        expect(store.isExpired()).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
        const past = getUnixTime(subMinutes(new Date(), 10));
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: past }),
        );
        store.fetch().subscribe();
        expect(store.isExpired()).toBe(true);
    });

    it('returns false when expiresAt is more than 1 minute in the future', () => {
        const future = getUnixTime(addMinutes(new Date(), 10));
        mockGetToken.mockReturnValue(
            of({
                accessToken: 'token',
                tokenType: 'Bearer',
                expiresAt: future,
            }),
        );
        store.fetch().subscribe();
        expect(store.isExpired()).toBe(false);
    });

    it('returns true when expiresAt is within 1 minute ahead (30 seconds)', () => {
        const soon = getUnixTime(addSeconds(new Date(), 30));
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: soon }),
        );
        store.fetch().subscribe();
        expect(store.isExpired()).toBe(true);
    });

    it('トークン無し（204）なら状態を空にし、ヘッダーを付けない側に倒す', async () => {
        mockGetToken.mockReturnValueOnce(
            of({
                accessToken: 'a',
                tokenType: 'Bearer',
                expiresAt: 9999999999,
            }),
        );
        await lastValueFrom(store.fetch());
        mockGetToken.mockReturnValueOnce(of(null));
        await lastValueFrom(store.fetch());
        expect(store.accessToken()).toBeNull();
        expect(store.isExpired()).toBe(false);
    });

    it('取れなければ（503 など）投げずに状態を空にする', async () => {
        mockGetToken.mockReturnValueOnce(
            of({
                accessToken: 'a',
                tokenType: 'Bearer',
                expiresAt: 9999999999,
            }),
        );
        await lastValueFrom(store.fetch());
        mockGetToken.mockReturnValueOnce(throwError(() => new Error('503')));
        await expect(lastValueFrom(store.fetch())).resolves.toBeUndefined();
        expect(store.accessToken()).toBeNull();
    });
});

describe('TokenState.isExpired（時間の経過）', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('同じトークンでも、時計が進めば読むたびに false から true に変わる', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
        const expiresAt = getUnixTime(new Date('2026-01-01T00:10:00Z'));
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        getToken: () =>
                            of({
                                accessToken: 'token',
                                tokenType: 'Bearer',
                                expiresAt,
                            }),
                    },
                },
            ],
        });
        const store = TestBed.inject(TokenState);
        store.fetch().subscribe();

        expect(store.isExpired()).toBe(false);

        jest.setSystemTime(new Date('2026-01-01T00:09:30Z'));

        expect(store.isExpired()).toBe(true);
    });
});
