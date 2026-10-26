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

    it('全運用を列車つきで取るときは、運用表が読む include と fields を送る', () => {
        const { query, controller } = setup();

        query.findManyWithTrips({ calendarId: 'cal-1' }).subscribe();
        const req = controller.expectOne(
            (r) => r.url === `${url}/calendar/cal-1/trips`,
        );
        const params = req.request.params;

        expect(params.get('include')).toBe(
            'trips.trip,trips.startTime,trips.endTime',
        );
        expect(params.get('fields[operation]')).toBe('operationNumber');
        expect(params.get('fields[trip]')).toBe(
            'tripNumber,tripDirection,tripBlockId,tripClassId,depotIn,depotOut',
        );
        expect(params.get('fields[time]')).toBe(
            'stationId,arrivalTime,departureTime',
        );
        // 空で送ると API は id だけを返す
        expect(params.has('fields[tripOperationList]')).toBe(true);
        expect(params.get('fields[tripOperationList]')).toBe('');
        req.flush([]);
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

    it('現在位置の応答の本文が null のときは、builder に通さず null を返す', () => {
        const { query, controller } = setup();
        let result: unknown = undefined;

        query
            .findOneWithCurrentPosition({ operationId: 'op-1' })
            .subscribe((v) => (result = v));
        controller
            .expectOne((r) => r.url.endsWith('/op-1/current-position'))
            .flush(null);

        expect(result).toBeNull();
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

    it("次の運用の候補は 'timetable' が書かれたら reload で取り直す", () => {
        const { query, controller, invalidator } = setup();
        const params = {
            calendarId: 'cal-1',
            stationId: 's1',
            afterSeconds: 30000,
        };
        const candidatesUrl = `${url}/next-operation-candidates`;

        query.findManyNextSegmentCandidates(params).subscribe();
        const first = controller.expectOne((r) => r.url === candidatesUrl);
        expect(first.request.params.get('calendarId')).toBe('cal-1');
        expect(first.request.params.get('stationId')).toBe('s1');
        expect(first.request.params.get('afterSeconds')).toBe('30000');
        first.flush([]);

        query.findManyNextSegmentCandidates(params).subscribe();
        controller.expectNone(candidatesUrl);

        invalidator.invalidate('timetable');
        query.findManyNextSegmentCandidates(params).subscribe();
        const again = controller.expectOne((r) => r.url === candidatesUrl);
        expect(again.request.cache).toBe('reload');
        again.flush([]);
    });
});
