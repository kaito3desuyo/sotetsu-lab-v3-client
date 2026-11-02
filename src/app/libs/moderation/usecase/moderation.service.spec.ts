import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { ModerationService } from './moderation.service';

const base = `${environment.apiUrl}/v3/moderation`;
const uuid = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

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

describe('ModerationService', () => {
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
            service: TestBed.inject(ModerationService),
            controller: TestBed.inject(HttpTestingController),
            invalidator,
        };
    };

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
        TestBed.resetTestingModule();
    });

    describe('取得', () => {
        it('getUser は GET /users/:id を毎回取る', () => {
            const { service, controller } = setup();
            const results: unknown[] = [];

            service.getUser('u1').subscribe((r) => results.push(r));
            service.getUser('u1').subscribe((r) => results.push(r));

            const reqs = controller.match(`${base}/users/u1`);
            expect(reqs).toHaveLength(2);
            reqs.forEach((r) => {
                expect(r.request.method).toBe('GET');
                r.flush(summary);
            });
            expect(results).toEqual([summary, summary]);
        });

        it('getUserSightings は limit と before を渡し、無ければ付けない', () => {
            const { service, controller } = setup();
            let out: unknown;

            service
                .getUserSightings('u1', {
                    limit: 50,
                    before: '2026-10-05T00:00:00.000Z',
                })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(
                (r) => r.url === `${base}/users/u1/sightings`,
            );
            expect(req.request.params.get('limit')).toBe('50');
            expect(req.request.params.get('before')).toBe(
                '2026-10-05T00:00:00.000Z',
            );
            const sighting = {
                operationSightingId: 's1',
                sightingTime: '2026-10-05T00:00:00.000Z',
                createdAt: '2026-10-05T00:00:01.000Z',
                operationNumber: '01',
                formationNumber: '9701',
                invalidated: true,
                invalidatedBy: { userId: 'm1', username: 'mgr' },
            };
            req.flush([sighting]);
            expect(out).toEqual([sighting]);

            service.getUserSightings('u1').subscribe();
            const bare = controller.expectOne(
                (r) => r.url === `${base}/users/u1/sightings`,
            );
            expect(bare.request.params.keys()).toEqual([]);
            bare.flush([]);
        });

        it('getSightingAuthor は GET /sightings/:id/author', () => {
            const { service, controller } = setup();
            let out: unknown;

            service.getSightingAuthor('s1').subscribe((r) => (out = r));
            controller
                .expectOne(`${base}/sightings/s1/author`)
                .flush({ userId: null });

            expect(out).toEqual({ userId: null });
        });

        it('getRecentSightings は author つきの一覧を返す', () => {
            const { service, controller } = setup();
            let out: unknown;
            const recent = {
                operationSightingId: 's1',
                sightingTime: '2026-10-05T00:00:00.000Z',
                createdAt: '2026-10-05T00:00:01.000Z',
                operationNumber: '01',
                formationNumber: '9701',
                invalidated: false,
                invalidatedBy: null,
                author: {
                    userId: 'u1',
                    username: 'taro',
                    displayName: 'Taro',
                    role: 'reporter',
                    newAccount: true,
                    burst: false,
                },
            };

            service
                .getRecentSightings({ limit: 20 })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(
                (r) => r.url === `${base}/recent-sightings`,
            );
            expect(req.request.params.get('limit')).toBe('20');
            expect(req.request.params.has('before')).toBe(false);
            req.flush([recent, { ...recent, author: null }]);

            expect(out).toEqual([recent, { ...recent, author: null }]);
        });

        it('getUserTraces は GET /users/:id/traces', () => {
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

            service.getUserTraces('u1').subscribe((r) => (out = r));
            controller.expectOne(`${base}/users/u1/traces`).flush([trace]);

            expect(out).toEqual([trace]);
        });
    });

    describe('invalidateSightings', () => {
        it('POST /sightings/invalidate に ids と reason を送り、成功後に sighting を失効させる', () => {
            const { service, controller, invalidator } = setup();
            const ids = [uuid(1), uuid(2)];
            let out: unknown;

            service
                .invalidateSightings({ ids, reason: '荒らし' })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(`${base}/sightings/invalidate`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ ids, reason: '荒らし' });
            expect(invalidator.invalidate).not.toHaveBeenCalled();
            req.flush({
                invalidated: ids,
                skipped: [],
                failed: null,
                pending: [],
            });

            expect(out).toEqual({
                invalidated: ids,
                skipped: [],
                failed: null,
                pending: [],
            });
            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('pending があれば、その id だけを同じ理由で送り直し、結果を 1 つにまとめる', () => {
            const { service, controller, invalidator } = setup();
            const [a, b, c, d] = [uuid(1), uuid(2), uuid(3), uuid(4)];
            let out: unknown;

            service
                .invalidateSightings({ ids: [a, b, c, d], reason: 'r' })
                .subscribe((r) => (out = r));
            const first = controller.expectOne(`${base}/sightings/invalidate`);
            first.flush({
                invalidated: [a],
                skipped: [{ id: b, reason: 'already_invalidated' }],
                failed: null,
                pending: [c, d],
            });

            const second = controller.expectOne(`${base}/sightings/invalidate`);
            expect(second.request.body).toEqual({ ids: [c, d], reason: 'r' });
            second.flush({
                invalidated: [c],
                skipped: [{ id: d, reason: 'not_found' }],
                failed: null,
                pending: [],
            });

            expect(out).toEqual({
                invalidated: [a, c],
                skipped: [
                    { id: b, reason: 'already_invalidated' },
                    { id: d, reason: 'not_found' },
                ],
                failed: null,
                pending: [],
            });
            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
        });

        it('failed があれば送り直さず、pending を残して返す', () => {
            const { service, controller, invalidator } = setup();
            const [a, b, c] = [uuid(1), uuid(2), uuid(3)];
            let out: unknown;

            service
                .invalidateSightings({ ids: [a, b, c], reason: 'r' })
                .subscribe((r) => (out = r));
            controller.expectOne(`${base}/sightings/invalidate`).flush({
                invalidated: [a],
                skipped: [],
                failed: { id: b, message: 'boom' },
                pending: [c],
            });

            expect(out).toEqual({
                invalidated: [a],
                skipped: [],
                failed: { id: b, message: 'boom' },
                pending: [c],
            });
            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
        });

        it('送り直しは最大 10 回で止め、残りを pending で返す', () => {
            const { service, controller } = setup();
            const ids = [uuid(1), uuid(2)];
            let out: { pending: string[]; invalidated: string[] } | undefined;

            service
                .invalidateSightings({ ids, reason: 'r' })
                .subscribe((r) => (out = r));
            for (let i = 0; i < 10; i++) {
                controller.expectOne(`${base}/sightings/invalidate`).flush({
                    invalidated: [],
                    skipped: [],
                    failed: null,
                    pending: ids,
                });
            }

            controller.expectNone(`${base}/sightings/invalidate`);
            expect(out?.pending).toEqual(ids);
        });

        it('何も無効化できなかったら失効させない', () => {
            const { service, controller, invalidator } = setup();
            const id = uuid(1);

            service.invalidateSightings({ ids: [id], reason: 'r' }).subscribe();
            controller.expectOne(`${base}/sightings/invalidate`).flush({
                invalidated: [],
                skipped: [{ id, reason: 'not_found' }],
                failed: null,
                pending: [],
            });

            expect(invalidator.invalidate).not.toHaveBeenCalled();
        });

        it('通信に失敗したらエラーを返し、失効させない', () => {
            const { service, controller, invalidator } = setup();
            let failed = false;

            service
                .invalidateSightings({ ids: [uuid(1)], reason: 'r' })
                .subscribe({ error: () => (failed = true) });
            controller
                .expectOne(`${base}/sightings/invalidate`)
                .flush('x', { status: 422, statusText: 'Unprocessable' });

            expect(failed).toBe(true);
            expect(invalidator.invalidate).not.toHaveBeenCalled();
        });
    });

    describe('ban / unban', () => {
        it('ban は POST /users/:id/ban に reason を送り、成功後に sighting を失効させる', () => {
            const { service, controller, invalidator } = setup();
            let out: unknown;

            service.ban('u1', '荒らし').subscribe((r) => (out = r));
            const req = controller.expectOne(`${base}/users/u1/ban`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: '荒らし' });
            req.flush({ ...summary, banned: true });

            expect(out).toEqual({ ...summary, banned: true });
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('unban は reason を送る', () => {
            const { service, controller, invalidator } = setup();

            service.unban('u1', '誤り').subscribe();
            const req = controller.expectOne(`${base}/users/u1/unban`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: '誤り' });
            req.flush(summary);

            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('unban は reason が無ければ空のオブジェクトを送る', () => {
            const { service, controller } = setup();

            service.unban('u1').subscribe();
            const req = controller.expectOne(`${base}/users/u1/unban`);
            expect(req.request.body).toEqual({});
            req.flush(summary);
        });

        it('ban が失敗したら失効させない', () => {
            const { service, controller, invalidator } = setup();

            service.ban('u1', 'r').subscribe({ error: () => undefined });
            controller
                .expectOne(`${base}/users/u1/ban`)
                .flush('x', { status: 422, statusText: 'Unprocessable' });

            expect(invalidator.invalidate).not.toHaveBeenCalled();
        });
    });
});
