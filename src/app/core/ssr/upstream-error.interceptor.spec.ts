import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SsrResponse } from './ssr-response';
import { UpstreamErrorInterceptor } from './upstream-error.interceptor';

describe('UpstreamErrorInterceptor', () => {
    let http: HttpClient;
    let controller: HttpTestingController;
    let setCachePolicy: jest.Mock;

    beforeEach(() => {
        setCachePolicy = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: UpstreamErrorInterceptor,
                    multi: true,
                },
                { provide: SsrResponse, useValue: { setCachePolicy } },
            ],
        });
        http = TestBed.inject(HttpClient);
        controller = TestBed.inject(HttpTestingController);
    });

    afterEach(() => controller.verify());

    it('取れたら何もしない', () => {
        http.get('/x').subscribe();
        controller.expectOne('/x').flush({});

        expect(setCachePolicy).not.toHaveBeenCalled();
    });

    it('500 なら CDN に置かない', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller
            .expectOne('/x')
            .flush(null, { status: 500, statusText: 'Server Error' });

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });

    it('通信できなくても CDN に置かない', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller.expectOne('/x').error(new ProgressEvent('error'));

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });

    it('401 は数えない（AuthInterceptor がトークンを取り直して送り直す）', () => {
        http.get('/x').subscribe({ error: () => undefined });
        controller
            .expectOne('/x')
            .flush(null, { status: 401, statusText: 'Unauthorized' });

        expect(setCachePolicy).not.toHaveBeenCalled();
    });
});
