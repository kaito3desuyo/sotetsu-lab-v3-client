import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { OperationQuery } from './operation.query';

const url = environment.apiUrl + '/v3/operations';

describe('OperationQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        return {
            query: TestBed.inject(OperationQuery),
            controller: TestBed.inject(HttpTestingController),
            invalidator: TestBed.inject(QueryInvalidator),
        };
    };

    /** 時刻表系 4 本と現在位置 1 本を一度ずつ取って返答する */
    const loadAll = (
        query: OperationQuery,
        controller: HttpTestingController,
    ) => {
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query.findOneWithTrips({ operationId: 'op-1' }).subscribe();
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();
        controller
            .match(() => true)
            .forEach((r) => {
                r.flush(
                    r.request.url.endsWith('/op-1/trips')
                        ? { operation: {}, trips: [] }
                        : [],
                );
            });
    };

    beforeEach(() => {
        localStorage.clear();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-07T12:00:00+09:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    it('2 回目はキャッシュから返す', () => {
        const { query, controller } = setup();
        loadAll(query, controller);

        loadAll(query, controller);

        controller.verify();
    });

    it("'timetable' では時刻表系 4 本だけを reload で取り直し、現在位置は捨てない", () => {
        const { query, controller, invalidator } = setup();
        loadAll(query, controller);

        invalidator.invalidate('timetable');
        query.findManyByCalendarId({ calendarId: 'cal-1' }).subscribe();
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query.findOneWithTrips({ operationId: 'op-1' }).subscribe();
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();

        const reqs = controller.match(() => true);
        expect(reqs.map((r) => r.request.url).sort()).toEqual(
            [
                `${url}/calendar/cal-1`,
                `${url}/calendar/cal-1/trips`,
                `${url}/op-1/trips`,
                `${url}/from/2026-10-07/to/2026-10-07`,
            ].sort(),
        );
        expect(reqs.every((r) => r.request.cache === 'reload')).toBe(true);
        reqs.forEach((r) =>
            r.flush(
                r.request.url.endsWith('/op-1/trips')
                    ? { operation: {}, trips: [] }
                    : [],
            ),
        );
        controller.verify();
    });

    it("'sighting' では現在位置だけを取り直し、時刻表系は捨てない", () => {
        const { query, controller, invalidator } = setup();
        loadAll(query, controller);

        invalidator.invalidate('sighting');
        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        query
            .findManyWithCurrentPosition({ operationIds: ['op-1'] })
            .subscribe();

        const req = controller.expectOne(
            (r) => r.url === `${url}/current-positions`,
        );
        expect(req.request.cache).toBe('default');
        req.flush([]);
        controller.verify();
    });

    it("現在位置は目撃の窓（requestCache('sighting')）で取り、列車情報を書いても reload にしない。運用群には cache を付けない", () => {
        const { query, controller, invalidator } = setup();
        invalidator.invalidate('timetable');

        query.findOneWithCurrentPosition({ operationId: 'op-1' }).subscribe();
        query.findManyGroups().subscribe();

        const reqs = controller.match(() => true);
        expect(reqs.map((r) => r.request.cache)).toEqual([
            'default',
            undefined,
        ]);
        reqs.forEach((r) =>
            r.flush(r.request.url.endsWith('/groups') ? [] : {}),
        );
    });

    it('calendarId が無ければ取得せず空配列を返す', () => {
        const { query, controller } = setup();
        let result: unknown;

        query
            .findManyByCalendarId({ calendarId: '' })
            .subscribe((r) => (result = r));

        expect(result).toEqual([]);
        controller.verify();
    });
});
