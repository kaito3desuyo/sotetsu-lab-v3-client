import { TestBed } from '@angular/core/testing';
import { addMinutes, addSeconds, getUnixTime, subMinutes } from 'date-fns';
import { lastValueFrom, of, throwError } from 'rxjs';

import { AuthService } from '../libs/auth/usecase/auth.service';
import { TokenStateQuery, TokenStateStore } from './token.state';

describe('TokenStateQuery.isExpired', () => {
    let store: TokenStateStore;
    let query: TokenStateQuery;
    let mockGetToken: jest.Mock;

    beforeEach(() => {
        mockGetToken = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { getToken: mockGetToken } },
            ],
        });
        store = TestBed.inject(TokenStateStore);
        query = TestBed.inject(TokenStateQuery);
    });

    it('returns false when expiresAt is null', () => {
        mockGetToken.mockReturnValue(
            of({ accessToken: null, tokenType: null, expiresAt: null }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(false);
    });

    it('returns true when expiresAt is in the past', () => {
        const past = getUnixTime(subMinutes(new Date(), 10));
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: past }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(true);
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
        expect(query.isExpired).toBe(false);
    });

    it('returns true when expiresAt is within 1 minute ahead (30 seconds)', () => {
        const soon = getUnixTime(addSeconds(new Date(), 30));
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: soon }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(true);
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
        expect(query.accessToken).toBeNull();
        expect(query.isExpired).toBe(false);
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
        expect(query.accessToken).toBeNull();
    });
});
