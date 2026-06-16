import { TestBed } from '@angular/core/testing';
import dayjs from 'dayjs';
import { of } from 'rxjs';

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
        const past = dayjs().subtract(10, 'minutes').unix();
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: past }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(true);
    });

    it('returns false when expiresAt is more than 1 minute in the future', () => {
        const future = dayjs().add(10, 'minutes').unix();
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: future }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(false);
    });

    it('returns true when expiresAt is within 1 minute ahead (30 seconds)', () => {
        const soon = dayjs().add(30, 'seconds').unix();
        mockGetToken.mockReturnValue(
            of({ accessToken: 'token', tokenType: 'Bearer', expiresAt: soon }),
        );
        store.fetch().subscribe();
        expect(query.isExpired).toBe(true);
    });
});
