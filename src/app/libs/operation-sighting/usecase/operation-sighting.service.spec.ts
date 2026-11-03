import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { OperationSightingCommand } from '../infrastructure/commands/operation-sighting.command';
import { OperationSightingQuery } from '../infrastructure/queries/operation-sighting.query';
import { OperationSightingService } from './operation-sighting.service';

describe('OperationSightingService の書き込み', () => {
    const setup = (result: 'ok' | 'ng') => {
        const reply = () =>
            result === 'ok' ? of(undefined) : throwError(() => new Error('ng'));
        const command = {
            post: jest.fn(reply),
            invalidate: jest.fn(reply),
            restore: jest.fn(reply),
        };
        const invalidator = { invalidate: jest.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: OperationSightingCommand, useValue: command },
                { provide: OperationSightingQuery, useValue: {} },
                { provide: QueryInvalidator, useValue: invalidator },
            ],
        });
        return {
            service: TestBed.inject(OperationSightingService),
            invalidator,
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    const writes: [
        string,
        (s: OperationSightingService) => Observable<void>,
    ][] = [
        ['post', (s) => s.post({} as never)],
        ['invalidate', (s) => s.invalidate({} as never)],
        ['restore', (s) => s.restore({} as never)],
    ];

    it.each(writes)(
        "%s が成功したら 'sighting' を 1 回知らせる",
        (_name, call) => {
            const { service, invalidator } = setup('ok');

            call(service).subscribe();

            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        },
    );

    it.each(writes)('%s が失敗したら知らせない', (_name, call) => {
        const { service, invalidator } = setup('ng');

        call(service).subscribe({ error: () => undefined });

        expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
});

const base = `${environment.apiUrl}/v3/operation-sightings`;
const usersBase = `${environment.apiUrl}/v3/users`;
const uuid = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('OperationSightingService（投稿者ごと・新着・まとめての無効化）', () => {
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
            service: TestBed.inject(OperationSightingService),
            controller: TestBed.inject(HttpTestingController),
            invalidator,
        };
    };

    afterEach(() => {
        TestBed.inject(HttpTestingController).verify();
        TestBed.resetTestingModule();
    });

    describe('取得', () => {
        it('findManyByUserId は limit と before を渡し、無ければ付けない', () => {
            const { service, controller } = setup();
            let out: unknown;

            service
                .findManyByUserId('u1', {
                    limit: 50,
                    before: '2026-10-05T00:00:00.000Z',
                })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(
                (r) => r.url === `${usersBase}/u1/operation-sightings`,
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

            service.findManyByUserId('u1').subscribe();
            const bare = controller.expectOne(
                (r) => r.url === `${usersBase}/u1/operation-sightings`,
            );
            expect(bare.request.params.keys()).toEqual([]);
            bare.flush([]);
        });

        it('findManyMine は limit と before を渡し、無ければ付けない', () => {
            const { service, controller } = setup();
            let out: unknown;

            service
                .findManyMine({
                    limit: 50,
                    before: '2026-10-05T00:00:00.000Z',
                })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(
                (r) => r.url === `${usersBase}/me/operation-sightings`,
            );
            expect(req.request.method).toBe('GET');
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
                corroboration: 'invalidated',
            };
            req.flush([sighting]);
            expect(out).toEqual([sighting]);

            service.findManyMine().subscribe();
            const bare = controller.expectOne(
                (r) => r.url === `${usersBase}/me/operation-sightings`,
            );
            expect(bare.request.params.keys()).toEqual([]);
            bare.flush([]);
        });

        it('URL に載せる id は encodeURIComponent をかける', () => {
            const { service, controller } = setup();

            service.findManyByUserId('a/b?c').subscribe();
            service.findAuthor('x/../y').subscribe();

            controller
                .expectOne(`${usersBase}/a%2Fb%3Fc/operation-sightings`)
                .flush([]);
            controller
                .expectOne(`${base}/x%2F..%2Fy/author`)
                .flush({ userId: null });
        });

        it('findAuthor は GET /:id/author', () => {
            const { service, controller } = setup();
            let out: unknown;

            service.findAuthor('s1').subscribe((r) => (out = r));
            controller.expectOne(`${base}/s1/author`).flush({ userId: null });

            expect(out).toEqual({ userId: null });
        });

        it('findManyRecent は author つきの一覧を返す', () => {
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

            service.findManyRecent({ limit: 20 }).subscribe((r) => (out = r));
            const req = controller.expectOne((r) => r.url === `${base}/recent`);
            expect(req.request.params.get('limit')).toBe('20');
            expect(req.request.params.has('before')).toBe(false);
            req.flush([recent, { ...recent, author: null }]);

            expect(out).toEqual([recent, { ...recent, author: null }]);
        });
    });

    describe('invalidateMany', () => {
        it('POST /invalidate に ids と reason を送り、成功後に sighting を失効させる', () => {
            const { service, controller, invalidator } = setup();
            const ids = [uuid(1), uuid(2)];
            let out: unknown;

            service
                .invalidateMany({ ids, reason: '荒らし' })
                .subscribe((r) => (out = r));
            const req = controller.expectOne(`${base}/invalidate`);
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
                .invalidateMany({ ids: [a, b, c, d], reason: 'r' })
                .subscribe((r) => (out = r));
            const first = controller.expectOne(`${base}/invalidate`);
            first.flush({
                invalidated: [a],
                skipped: [{ id: b, reason: 'already_invalidated' }],
                failed: null,
                pending: [c, d],
            });

            const second = controller.expectOne(`${base}/invalidate`);
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
                .invalidateMany({ ids: [a, b, c], reason: 'r' })
                .subscribe((r) => (out = r));
            controller.expectOne(`${base}/invalidate`).flush({
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

        it('送り直しは最大 10 回で止め、済んだ分を連結し、残りを pending で返す', () => {
            const { service, controller } = setup();
            const ids = [uuid(1), uuid(2)];
            let out: { pending: string[]; invalidated: string[] } | undefined;

            service
                .invalidateMany({ ids, reason: 'r' })
                .subscribe((r) => (out = r));
            for (let i = 0; i < 10; i++) {
                controller.expectOne(`${base}/invalidate`).flush({
                    invalidated: [uuid(100 + i)],
                    skipped: [],
                    failed: null,
                    pending: ids,
                });
            }

            controller.expectNone(`${base}/invalidate`);
            expect(out?.pending).toEqual(ids);
            expect(out?.invalidated).toEqual(
                Array.from({ length: 10 }, (_, i) => uuid(100 + i)),
            );
        });

        it('2 回目以降が通信エラーなら、済んだ分と failed・pending を返し、sighting を 1 回失効させる', () => {
            const { service, controller, invalidator } = setup();
            const [a, b, c] = [uuid(1), uuid(2), uuid(3)];
            let out: unknown;
            let failed = false;

            service.invalidateMany({ ids: [a, b, c], reason: 'r' }).subscribe({
                next: (r) => (out = r),
                error: () => (failed = true),
            });
            controller.expectOne(`${base}/invalidate`).flush({
                invalidated: [a],
                skipped: [],
                failed: null,
                pending: [b, c],
            });
            controller
                .expectOne(`${base}/invalidate`)
                .flush('x', { status: 500, statusText: 'Server Error' });

            expect(failed).toBe(false);
            expect(out).toEqual({
                invalidated: [a],
                skipped: [],
                failed: { id: b, message: '通信に失敗しました' },
                pending: [b, c],
            });
            expect(invalidator.invalidate).toHaveBeenCalledTimes(1);
            expect(invalidator.invalidate).toHaveBeenCalledWith('sighting');
        });

        it('何も無効化できなかったら失効させない', () => {
            const { service, controller, invalidator } = setup();
            const id = uuid(1);

            service.invalidateMany({ ids: [id], reason: 'r' }).subscribe();
            controller.expectOne(`${base}/invalidate`).flush({
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
                .invalidateMany({ ids: [uuid(1)], reason: 'r' })
                .subscribe({ error: () => (failed = true) });
            controller
                .expectOne(`${base}/invalidate`)
                .flush('x', { status: 422, statusText: 'Unprocessable' });

            expect(failed).toBe(true);
            expect(invalidator.invalidate).not.toHaveBeenCalled();
        });
    });
});
