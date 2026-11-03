import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { UserService } from './user.service';

const base = `${environment.apiUrl}/v3/users`;

const summary = {
    userId: 'u1',
    username: 'taro',
    displayName: 'Taro',
    role: 'reporter',
    createdAt: '2026-10-01T00:00:00.000Z',
    sightingCount: 3,
    invalidatedCount: 1,
    firstSightingAt: '2026-10-02T00:00:00.000Z',
    lastSightingAt: null,
    banned: false,
};

describe('UserService（要約・手がかり・BAN）', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        const invalidator = TestBed.inject(QueryInvalidator);
        jest.spyOn(invalidator, 'invalidate');
        return {
            service: TestBed.inject(UserService),
            controller: TestBed.inject(HttpTestingController),
            invalidator,
        };
    };

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
        TestBed.resetTestingModule();
    });

    describe('取得', () => {
        it('findSummary は GET /users/:id を毎回取る', () => {
            const { service, controller } = setup();
            const results: unknown[] = [];

            service.findSummary('u1').subscribe((r) => results.push(r));
            service.findSummary('u1').subscribe((r) => results.push(r));

            const reqs = controller.match(`${base}/u1`);
            expect(reqs).toHaveLength(2);
            reqs.forEach((r) => {
                expect(r.request.method).toBe('GET');
                r.flush(summary);
            });
            expect(results).toEqual([summary, summary]);
        });

        it('URL に載せる id は encodeURIComponent をかける', () => {
            const { service, controller } = setup();

            service.findSummary('a/b?c').subscribe();
            service.ban('a/b', '理由').subscribe();

            controller.expectOne(`${base}/a%2Fb%3Fc`).flush(summary);
            controller.expectOne(`${base}/a%2Fb/ban`).flush(summary);
        });

        it('findAccessTraces は GET /users/:id/traces', () => {
            const { service, controller } = setup();
            let out: unknown;
            const trace = {
                ip: '192.0.2.1',
                userAgents: ['UA'],
                count: 2,
                lastSeenAt: '2026-10-05T00:00:00.000Z',
                accountCount: 2,
                shared: true,
                otherAccounts: [
                    {
                        userId: 'u2',
                        username: 'jiro',
                        role: 'reporter',
                        banned: true,
                    },
                ],
            };

            service.findAccessTraces('u1').subscribe((r) => (out = r));
            controller.expectOne(`${base}/u1/traces`).flush([trace]);

            expect(out).toEqual([trace]);
        });
    });

    describe('ban / unban', () => {
        it('ban は POST /users/:id/ban に reason を送り、成功後に sighting を失効させる', () => {
            const { service, controller, invalidator } = setup();
            let out: unknown;

            service.ban('u1', '荒らし').subscribe((r) => (out = r));
            const req = controller.expectOne(`${base}/u1/ban`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: '荒らし' });
            req.flush({ ...summary, banned: true });

            expect(out).toEqual({ ...summary, banned: true });
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('unban は reason を送る', () => {
            const { service, controller, invalidator } = setup();

            service.unban('u1', '誤り').subscribe();
            const req = controller.expectOne(`${base}/u1/unban`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: '誤り' });
            req.flush(summary);

            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('unban は reason が無ければ空のオブジェクトを送る', () => {
            const { service, controller } = setup();

            service.unban('u1').subscribe();
            const req = controller.expectOne(`${base}/u1/unban`);
            expect(req.request.body).toEqual({});
            req.flush(summary);
        });

        it('ban が失敗したら失効させない', () => {
            const { service, controller, invalidator } = setup();

            service.ban('u1', 'r').subscribe({ error: () => undefined });
            controller
                .expectOne(`${base}/u1/ban`)
                .flush('x', { status: 422, statusText: 'Unprocessable' });

            expect(invalidator.invalidate).not.toHaveBeenCalled();
        });
    });
});
