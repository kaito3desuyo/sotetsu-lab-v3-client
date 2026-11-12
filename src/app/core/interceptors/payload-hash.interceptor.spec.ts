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
import { environment } from 'src/environments/environment';
import { PayloadHashInterceptor } from './payload-hash.interceptor';

const HEADER = 'x-amz-content-sha256';

describe('PayloadHashInterceptor', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                {
                    provide: HTTP_INTERCEPTORS,
                    useClass: PayloadHashInterceptor,
                    multi: true,
                },
            ],
        });
        return {
            http: TestBed.inject(HttpClient),
            controller: TestBed.inject(HttpTestingController),
        };
    };

    beforeAll(() => {
        // jsdom には crypto.subtle が無い。見たいのは付けるかどうかなので、32 バイトを返す形だけ用意する
        Object.defineProperty(globalThis.crypto, 'subtle', {
            value: { digest: async () => new Uint8Array(32).fill(171).buffer },
            configurable: true,
        });
    });

    afterEach(() => TestBed.resetTestingModule());

    it('API への本文付きの要求には、本文の SHA-256 を付ける', async () => {
        const { http, controller } = setup();
        const url = `${environment.apiUrl}/v3/operation-sightings`;

        http.post(url, { a: 1 }).subscribe();

        // ハッシュは非同期で作るので、要求が出るまで待つ
        await new Promise((resolve) => setTimeout(resolve, 0));
        const req = controller.expectOne(url);
        expect(req.request.headers.get(HEADER)).toMatch(/^[0-9a-f]{64}$/);
    });

    it('backend（ログイン・登録）への要求には付けない', async () => {
        const { http, controller } = setup();
        const url = `${environment.backendUrl}/auth/login`;

        http.post(url, { username: 'someone', password: 'secret' }).subscribe();

        await new Promise((resolve) => setTimeout(resolve, 0));
        const req = controller.expectOne(url);
        expect(req.request.headers.has(HEADER)).toBe(false);
    });
});
