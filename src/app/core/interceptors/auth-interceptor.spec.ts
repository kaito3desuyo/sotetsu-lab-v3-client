import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { TokenStateQuery, TokenStateStore } from 'src/app/global-states/token.state';
import { AuthInterceptor } from './auth-interceptor';

function setup(tokenQuery: { isExpired: boolean; accessToken: string | null; tokenType: string | null }, tokenStore?: { fetch: () => any }) {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
            AuthInterceptor,
            { provide: HTTP_INTERCEPTORS, useExisting: AuthInterceptor, multi: true },
            { provide: TokenStateQuery, useValue: tokenQuery },
            { provide: TokenStateStore, useValue: tokenStore ?? { fetch: () => of(undefined) } },
        ],
    });
    return {
        http: TestBed.inject(HttpClient),
        controller: TestBed.inject(HttpTestingController),
    };
}

describe('AuthInterceptor', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('adds x-sotetsu-lab-authorization header when accessToken is present', () => {
        const { http, controller } = setup({
            isExpired: false,
            accessToken: 'valid-token',
            tokenType: 'Bearer',
        });
        http.get('/api/test').subscribe();
        const req = controller.expectOne('/api/test');
        expect(req.request.headers.get('x-sotetsu-lab-authorization')).toBe('Bearer valid-token');
        req.flush({});
        controller.verify();
    });

    it('does not add header when accessToken is null', () => {
        const { http, controller } = setup({
            isExpired: false,
            accessToken: null,
            tokenType: null,
        });
        http.get('/api/test').subscribe();
        const req = controller.expectOne('/api/test');
        expect(req.request.headers.has('x-sotetsu-lab-authorization')).toBe(false);
        req.flush({});
        controller.verify();
    });

    it('calls fetch before handling request when token is expired', () => {
        const fetchMock = jest.fn(() => of(undefined));
        const { http, controller } = setup(
            { isExpired: true, accessToken: 'refreshed-token', tokenType: 'Bearer' },
            { fetch: fetchMock },
        );
        http.get('/api/test').subscribe();
        const req = controller.expectOne('/api/test');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(req.request.headers.get('x-sotetsu-lab-authorization')).toBe('Bearer refreshed-token');
        req.flush({});
        controller.verify();
    });
});
