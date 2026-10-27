import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
    withXhr,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenState } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';
import { FetchError } from '../classes/custom-error';
import { AuthInterceptor } from './auth-interceptor';
import { FetchErrorInterceptor } from './fetch-error.interceptor';

const apiUrl = `${environment.apiUrl}/v3/agencies`;
const unauthorized = { status: 401, statusText: 'Unauthorized' };

function setup() {
    const tokenQuery = {
        isExpired: false,
        accessToken: 'stale-token',
        tokenType: 'Bearer',
    };
    const fetchMock = jest.fn(() =>
        of(undefined).pipe(tap(() => (tokenQuery.accessToken = 'fresh-token'))),
    );
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withXhr(), withInterceptorsFromDi()),
            provideHttpClientTesting(),
            // app.config.ts と同じ並び。先に登録した方が外側
            {
                provide: HTTP_INTERCEPTORS,
                useClass: FetchErrorInterceptor,
                multi: true,
            },
            { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
            {
                provide: TokenState,
                useValue: {
                    isExpired: () => tokenQuery.isExpired,
                    accessToken: () => tokenQuery.accessToken,
                    tokenType: () => tokenQuery.tokenType,
                    fetch: fetchMock,
                },
            },
        ],
    });
    return {
        http: TestBed.inject(HttpClient),
        controller: TestBed.inject(HttpTestingController),
        fetchMock,
    };
}

describe('FetchErrorInterceptor', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('失敗を FetchError にして返す', () => {
        const { http, controller } = setup();
        let error: unknown;

        http.get(apiUrl).subscribe({ error: (e) => (error = e) });
        controller
            .expectOne(apiUrl)
            .flush(
                { message: '止まっています' },
                { status: 503, statusText: 'Service Unavailable' },
            );

        expect(error).toBeInstanceOf(FetchError);
        expect(error).toMatchObject({
            statusCode: 503,
            message: '止まっています',
            url: apiUrl,
        });
        controller.verify();
    });

    it('成功はそのまま返す', () => {
        const { http, controller } = setup();
        let body: unknown;

        http.get(apiUrl).subscribe((v) => (body = v));
        controller.expectOne(apiUrl).flush({ ok: true });

        expect(body).toEqual({ ok: true });
        controller.verify();
    });

    it('内側の AuthInterceptor は今までどおり 401 でトークンを取り直してやり直す', () => {
        const { http, controller, fetchMock } = setup();
        let body: unknown;

        http.get(apiUrl).subscribe((v) => (body = v));
        controller.expectOne(apiUrl).flush(null, unauthorized);
        const retry = controller.expectOne(apiUrl);

        expect(fetchMock).toHaveBeenCalledWith({ bypassHttpCache: true });
        expect(retry.request.headers.get('x-sotetsu-lab-authorization')).toBe(
            'Bearer fresh-token',
        );
        retry.flush({ ok: true });
        expect(body).toEqual({ ok: true });
        controller.verify();
    });

    it('やり直しも 401 なら、FetchError の 401 を返す', () => {
        const { http, controller } = setup();
        let error: unknown;

        http.get(apiUrl).subscribe({ error: (e) => (error = e) });
        controller.expectOne(apiUrl).flush(null, unauthorized);
        controller.expectOne(apiUrl).flush(null, unauthorized);

        expect(error).toBeInstanceOf(FetchError);
        expect((error as FetchError).statusCode).toBe(401);
        controller.verify();
    });
});
