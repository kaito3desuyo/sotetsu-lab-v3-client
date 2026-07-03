import {
    HttpClient,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { TripBlockQuery } from './trip-block.query';

const v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';

function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withInterceptorsFromDi()),
            provideHttpClientTesting(),
        ],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    return { query: new TripBlockQuery(http), controller };
}

describe('TripBlockQuery', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('caches findManyByFilter by calendarId+tripDirection: calling twice fires only one HTTP request', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        const req = controller.expectOne(
            (r) =>
                r.url === v3ApiUrl &&
                r.params.get('calendarId') === 'cal-1' &&
                r.params.get('tripDirection') === '0',
        );
        req.flush([{ tripBlockId: 't1', trips: [] }]);

        // 2回目の呼び出し（キャッシュヒットのはず）
        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();

        controller.verify(); // 追加リクエストが無いことを確認
    });

    it('does not share cache across different tripDirection values', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 1 })
            .subscribe();

        const reqs = controller.match(() => true);
        expect(reqs.length).toBe(2);
        reqs.forEach((r) => r.flush([]));
        controller.verify();
    });

    it('forceReload bypasses the cache and issues a new request', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        controller
            .expectOne((r) => r.url === v3ApiUrl)
            .flush([]);

        query
            .findManyByFilter({
                calendarId: 'cal-1',
                tripDirection: 0,
                forceReload: true,
            })
            .subscribe();
        controller
            .expectOne((r) => r.url === v3ApiUrl)
            .flush([]);

        controller.verify();
    });

    it('findManyByCalendarId forkJoins tripDirection 0/1 in parallel and caches the combined result: second call fires no new request', () => {
        const { query, controller } = setup();

        let result: Record<number, unknown> | undefined;
        query
            .findManyByCalendarId({ calendarId: 'cal-1' })
            .subscribe((r) => (result = r));

        const upReq = controller.expectOne(
            (r) =>
                r.url === v3ApiUrl && r.params.get('tripDirection') === '0',
        );
        const downReq = controller.expectOne(
            (r) =>
                r.url === v3ApiUrl && r.params.get('tripDirection') === '1',
        );
        upReq.flush([{ tripBlockId: 'up-1', trips: [] }]);
        downReq.flush([{ tripBlockId: 'down-1', trips: [] }]);

        expect(result).toBeDefined();
        expect(Array.isArray(result[0])).toBe(true);
        expect(Array.isArray(result[1])).toBe(true);

        // 2回目の呼び出し（上下とも既にキャッシュ済みのはず）
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();

        controller.verify(); // 追加のHTTPリクエストが無いことを確認（キャッシュヒット）
    });

    it('invalidateAll causes subsequent calls to issue fresh requests', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        controller
            .expectOne((r) => r.url === v3ApiUrl)
            .flush([]);

        query.invalidateAll();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        controller
            .expectOne((r) => r.url === v3ApiUrl)
            .flush([]);

        controller.verify();
    });
});
