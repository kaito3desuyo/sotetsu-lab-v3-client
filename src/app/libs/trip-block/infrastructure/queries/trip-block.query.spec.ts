import {
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
import { TripBlockQuery } from './trip-block.query';

const v3ApiUrl = environment.apiUrl + '/v3/trip-blocks';

function setup() {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(withXhr(), withInterceptorsFromDi()),
            provideHttpClientTesting(),
        ],
    });
    const controller = TestBed.inject(HttpTestingController);
    return {
        query: TestBed.inject(TripBlockQuery),
        controller,
        invalidator: TestBed.inject(QueryInvalidator),
    };
}

describe('TripBlockQuery', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
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
        controller.expectOne((r) => r.url === v3ApiUrl).flush([]);

        query
            .findManyByFilter({
                calendarId: 'cal-1',
                tripDirection: 0,
                forceReload: true,
            })
            .subscribe();
        controller.expectOne((r) => r.url === v3ApiUrl).flush([]);

        controller.verify();
    });

    it('findManyByCalendarId forkJoins tripDirection 0/1 in parallel and caches the combined result: second call fires no new request', () => {
        const { query, controller } = setup();

        let result: Record<number, unknown> | undefined;
        query
            .findManyByCalendarId({ calendarId: 'cal-1' })
            .subscribe((r) => (result = r));

        const upReq = controller.expectOne(
            (r) => r.url === v3ApiUrl && r.params.get('tripDirection') === '0',
        );
        const downReq = controller.expectOne(
            (r) => r.url === v3ApiUrl && r.params.get('tripDirection') === '1',
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

    it("'timetable' を受けたら、findManyByFilter と findOneById を取り直す", () => {
        const { query, controller, invalidator } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        query.findOneById({ id: 'b1' }).subscribe();
        controller
            .match(() => true)
            .forEach((r) =>
                r.flush(r.request.url.endsWith('/b1') ? { trips: [] } : []),
            );

        invalidator.invalidate('timetable');

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        query.findOneById({ id: 'b1' }).subscribe();
        const again = controller.match(() => true);
        expect(again).toHaveLength(2);
        again.forEach((r) =>
            r.flush(r.request.url.endsWith('/b1') ? { trips: [] } : []),
        );
        controller.verify();
    });

    it("'sighting' では捨てない", () => {
        const { query, controller, invalidator } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        controller.expectOne((r) => r.url === v3ApiUrl).flush([]);

        invalidator.invalidate('sighting');
        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();

        controller.verify();
    });

    it('書き込みが無ければ cache は default', () => {
        const { query, controller } = setup();

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        const req = controller.expectOne((r) => r.url === v3ApiUrl);

        expect(req.request.cache).toBe('default');
        req.flush([]);
    });

    it("'timetable' の後の findManyByCalendarId は、上下 2 本とも reload で取り直す", () => {
        const { query, controller, invalidator } = setup();
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        controller.match(() => true).forEach((r) => r.flush([]));

        invalidator.invalidate('timetable');
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();

        const reqs = controller.match((r) => r.url === v3ApiUrl);
        expect(reqs.map((r) => r.request.cache)).toEqual(['reload', 'reload']);
        reqs.forEach((r) => r.flush([]));
        controller.verify();
    });

    it('書き込みから 1 時間を過ぎたら、取り直しても cache は default に戻る', () => {
        const { query, controller, invalidator } = setup();

        invalidator.invalidate('timetable');
        jest.advanceTimersByTime(60 * 60 * 1000);
        query.findOneById({ id: 'b1' }).subscribe();
        const req = controller.expectOne(`${v3ApiUrl}/b1`);

        expect(req.request.cache).toBe('default');
        req.flush({ trips: [] });
    });

    it('fields を指定すると fields[資源]=項目,項目 をクエリに載せ、キャッシュも fields ごとに分ける', () => {
        const { query, controller } = setup();
        const fields = {
            trip: ['tripNumber', 'tripDirection'],
            time: ['stationId', 'arrivalTime'],
        };

        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0, fields })
            .subscribe();
        const req = controller.expectOne(
            (r) =>
                r.url === v3ApiUrl &&
                r.params.get('fields[trip]') === 'tripNumber,tripDirection' &&
                r.params.get('fields[time]') === 'stationId,arrivalTime',
        );
        req.flush([{ id: 'b1', trips: [] }]);

        // fields の無い呼び出しは別のキャッシュ（全項目を取り直す）
        query
            .findManyByFilter({ calendarId: 'cal-1', tripDirection: 0 })
            .subscribe();
        const plain = controller.expectOne(
            (r) => r.url === v3ApiUrl && !r.params.has('fields[trip]'),
        );
        plain.flush([]);

        controller.verify();
    });

    it('findManyByCalendarId も fields を上下の取得に渡す', () => {
        const { query, controller } = setup();

        query
            .findManyByCalendarId({
                calendarId: 'cal-1',
                fields: { trip: ['tripNumber'] },
            })
            .subscribe();

        const reqs = controller.match(
            (r) =>
                r.url === v3ApiUrl &&
                r.params.get('fields[trip]') === 'tripNumber',
        );
        expect(
            reqs.map((r) => r.request.params.get('tripDirection')).sort(),
        ).toEqual(['0', '1']);
        reqs.forEach((r) => r.flush([]));
        controller.verify();
    });
});
