import {
    HTTP_INTERCEPTORS,
    HttpClient,
    HttpErrorResponse,
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { TokenState } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';
import { AUTH_RETRIED, AuthInterceptor } from './auth-interceptor';

function setup(
    tokenQuery: {
        isExpired: boolean;
        accessToken: string | null;
        tokenType: string | null;
    },
    tokenStore?: { fetch: () => any },
) {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withXhr(), withInterceptorsFromDi()),
            provideHttpClientTesting(),
            AuthInterceptor,
            {
                provide: HTTP_INTERCEPTORS,
                useExisting: AuthInterceptor,
                multi: true,
            },
            {
                provide: TokenState,
                useValue: {
                    isExpired: () => tokenQuery.isExpired,
                    accessToken: () => tokenQuery.accessToken,
                    tokenType: () => tokenQuery.tokenType,
                    fetch: tokenStore?.fetch ?? (() => of(undefined)),
                },
            },
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
        expect(req.request.headers.get('x-sotetsu-lab-authorization')).toBe(
            'Bearer valid-token',
        );
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
        expect(req.request.headers.has('x-sotetsu-lab-authorization')).toBe(
            false,
        );
        req.flush({});
        controller.verify();
    });

    it('calls fetch before handling request when token is expired', () => {
        const fetchMock = jest.fn(() => of(undefined));
        const { http, controller } = setup(
            {
                isExpired: true,
                accessToken: 'refreshed-token',
                tokenType: 'Bearer',
            },
            { fetch: fetchMock },
        );
        http.get('/api/test').subscribe();
        const req = controller.expectOne('/api/test');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(req.request.headers.get('x-sotetsu-lab-authorization')).toBe(
            'Bearer refreshed-token',
        );
        req.flush({});
        controller.verify();
    });

    describe('v3 API が 401 を返したとき', () => {
        const apiUrl = `${environment.apiUrl}/v3/agencies`;

        /** 取り直すと accessToken が新しくなるトークンの状態 */
        function refreshable() {
            const tokenQuery = {
                isExpired: false,
                accessToken: 'stale-token',
                tokenType: 'Bearer',
            };
            const fetchMock = jest.fn(() =>
                of(undefined).pipe(
                    tap(() => (tokenQuery.accessToken = 'fresh-token')),
                ),
            );
            return { tokenQuery, fetchMock };
        }

        const unauthorized = { status: 401, statusText: 'Unauthorized' };

        it('使い回された応答を避けてトークンを取り直し、新しいトークンで 1 回だけやり直す', () => {
            const { tokenQuery, fetchMock } = refreshable();
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });
            let body: unknown;

            http.get(apiUrl).subscribe((v) => (body = v));
            controller.expectOne(apiUrl).flush(null, unauthorized);
            const retry = controller.expectOne(apiUrl);

            expect(fetchMock).toHaveBeenCalledWith({ bypassHttpCache: true });
            expect(
                retry.request.headers.get('x-sotetsu-lab-authorization'),
            ).toBe('Bearer fresh-token');
            retry.flush({ ok: true });
            expect(body).toEqual({ ok: true });
            controller.verify();
        });

        it('やり直す要求にだけ AUTH_RETRIED の印を付ける（1 回目には付けない）', () => {
            const { tokenQuery, fetchMock } = refreshable();
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });

            http.get(apiUrl).subscribe();
            const first = controller.expectOne(apiUrl);
            first.flush(null, unauthorized);
            const retry = controller.expectOne(apiUrl);

            expect(first.request.context.get(AUTH_RETRIED)).toBe(false);
            expect(retry.request.context.get(AUTH_RETRIED)).toBe(true);
            retry.flush({});
            controller.verify();
        });

        it('やり直しも 401 なら、それ以上やり直さずにエラーを返す', () => {
            const { tokenQuery, fetchMock } = refreshable();
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });
            let error: HttpErrorResponse | undefined;

            http.get(apiUrl).subscribe({ error: (e) => (error = e) });
            controller.expectOne(apiUrl).flush(null, unauthorized);
            controller.expectOne(apiUrl).flush(null, unauthorized);

            expect(error?.status).toBe(401);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            controller.verify();
        });

        it('同時に 401 になった要求は、トークンの取り直しを 1 回にまとめる', () => {
            const { tokenQuery } = refreshable();
            const refreshed = new Subject<void>();
            const fetchMock = jest.fn(() =>
                refreshed.pipe(
                    tap(() => (tokenQuery.accessToken = 'fresh-token')),
                ),
            );
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });
            const other = `${environment.apiUrl}/v3/routes`;

            http.get(apiUrl).subscribe();
            http.get(other).subscribe();
            controller.expectOne(apiUrl).flush(null, unauthorized);
            controller.expectOne(other).flush(null, unauthorized);
            refreshed.next();
            refreshed.complete();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            controller.expectOne(apiUrl).flush({});
            controller.expectOne(other).flush({});
            controller.verify();
        });

        it('BFF（/api）の 401 はやり直さない（ゲストの profile は 401 が正常）', () => {
            const { tokenQuery, fetchMock } = refreshable();
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });
            const bff = `${environment.backendUrl}/user/profile`;
            let error: HttpErrorResponse | undefined;

            http.get(bff).subscribe({ error: (e) => (error = e) });
            controller.expectOne(bff).flush(null, unauthorized);

            expect(error?.status).toBe(401);
            expect(fetchMock).not.toHaveBeenCalled();
            controller.verify();
        });

        it('401 以外のエラーはやり直さない', () => {
            const { tokenQuery, fetchMock } = refreshable();
            const { http, controller } = setup(tokenQuery, {
                fetch: fetchMock,
            });
            let error: HttpErrorResponse | undefined;

            http.get(apiUrl).subscribe({ error: (e) => (error = e) });
            controller
                .expectOne(apiUrl)
                .flush(null, { status: 500, statusText: 'Server Error' });

            expect(error?.status).toBe(500);
            expect(fetchMock).not.toHaveBeenCalled();
            controller.verify();
        });
    });
});
