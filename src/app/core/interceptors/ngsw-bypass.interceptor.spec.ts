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
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { NgswBypassInterceptor } from './ngsw-bypass.interceptor';

const apiUrl = `${environment.apiUrl}/v3/trip-blocks`;

describe('NgswBypassInterceptor', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: NgswBypassInterceptor,
                    multi: true,
                },
            ],
        });
        return {
            http: TestBed.inject(HttpClient),
            controller: TestBed.inject(HttpTestingController),
            invalidator: TestBed.inject(QueryInvalidator),
        };
    };

    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-27T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('書き込み後の窓（cache: reload）の取得には ngsw-bypass を付ける', () => {
        const { http, controller, invalidator } = setup();
        invalidator.invalidate('timetable');

        http.get(apiUrl, {
            cache: invalidator.requestCache('timetable'),
        }).subscribe();

        const req = controller.expectOne(apiUrl);
        expect(req.request.cache).toBe('reload');
        expect(req.request.headers.get('ngsw-bypass')).toBe('true');
    });

    it('窓の外（cache: default）の取得には付けない', () => {
        const { http, controller, invalidator } = setup();

        http.get(apiUrl, {
            cache: invalidator.requestCache('timetable'),
        }).subscribe();

        const req = controller.expectOne(apiUrl);
        expect(req.request.cache).toBe('default');
        expect(req.request.headers.has('ngsw-bypass')).toBe(false);
    });

    it('窓が閉じた（1 時間後）取得には付けない', () => {
        const { http, controller, invalidator } = setup();
        invalidator.invalidate('timetable');
        jest.setSystemTime(new Date('2026-10-27T13:00:01+09:00'));

        http.get(apiUrl, {
            cache: invalidator.requestCache('timetable'),
        }).subscribe();

        expect(
            controller.expectOne(apiUrl).request.headers.has('ngsw-bypass'),
        ).toBe(false);
    });

    it('データの API（/v3/）以外は cache: reload でも付けない', () => {
        const { http, controller } = setup();
        const url = `${environment.backendUrl}/auth/token`;

        http.get(url, { cache: 'reload' }).subscribe();

        expect(
            controller.expectOne(url).request.headers.has('ngsw-bypass'),
        ).toBe(false);
    });
});
