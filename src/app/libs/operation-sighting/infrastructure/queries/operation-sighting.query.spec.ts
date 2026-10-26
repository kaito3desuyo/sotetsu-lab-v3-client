import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { OperationSightingQuery } from './operation-sighting.query';

describe('OperationSightingQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        return {
            query: TestBed.inject(OperationSightingQuery),
            controller: TestBed.inject(HttpTestingController),
            invalidator: TestBed.inject(QueryInvalidator),
        };
    };

    const load = (
        query: OperationSightingQuery,
        controller: HttpTestingController,
    ) => {
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();
        query
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: ['01'],
            })
            .subscribe();
        return controller.match(() => true);
    };

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('2 回目はキャッシュから返す', () => {
        const { query, controller } = setup();
        load(query, controller).forEach((r) =>
            r.flush(r.request.url.includes('time-cross-section') ? {} : []),
        );

        expect(load(query, controller)).toHaveLength(0);
    });

    it("'sighting' を受けたら全部取り直す", () => {
        const { query, controller, invalidator } = setup();
        load(query, controller).forEach((r) =>
            r.flush(r.request.url.includes('time-cross-section') ? {} : []),
        );

        invalidator.invalidate('sighting');

        const again = load(query, controller);
        expect(again).toHaveLength(2);
        again.forEach((r) =>
            r.flush(r.request.url.includes('time-cross-section') ? {} : []),
        );
    });

    it("どの取得も目撃の窓（requestCache('sighting')）で cache を決める", () => {
        const { query, controller, invalidator } = setup();
        invalidator.invalidate('timetable');

        query
            .findOneTimeCrossSectionByOperationNumber({ operationNumber: '01' })
            .subscribe();
        query
            .findOneTimeCrossSectionByFormationNumber({
                formationNumber: '10701',
            })
            .subscribe();
        const reqs = load(query, controller).concat(
            controller.match(() => true),
        );

        expect(reqs).toHaveLength(4);
        expect(reqs.map((r) => r.request.cache)).toEqual([
            'default',
            'default',
            'default',
            'default',
        ]);
        reqs.forEach((r) => r.flush(r.request.url.includes('from') ? [] : {}));
    });

    it("'timetable' では捨てない", () => {
        const { query, controller, invalidator } = setup();
        load(query, controller).forEach((r) =>
            r.flush(r.request.url.includes('time-cross-section') ? {} : []),
        );

        invalidator.invalidate('timetable');

        expect(load(query, controller)).toHaveLength(0);
    });

    it('includeCarriedOver: true のときだけクエリに付け、キャッシュも分ける', () => {
        const { query, controller } = setup();
        query
            .findManyBySpecificPeriod({
                from: '2026-10-07',
                to: '2026-10-07',
                includeCarriedOver: true,
            })
            .subscribe();
        query
            .findManyBySpecificPeriod({ from: '2026-10-07', to: '2026-10-07' })
            .subscribe();

        const reqs = controller.match(() => true);

        expect(reqs).toHaveLength(2);
        expect(reqs[0].request.params.get('includeCarriedOver')).toBe('true');
        expect(reqs[1].request.params.has('includeCarriedOver')).toBe(false);
        reqs.forEach((r) => r.flush([]));
    });

    it('運番まとめは運用・編成の項目を絞って取り、include は付けない', () => {
        const { query, controller } = setup();
        query
            .findManyTimeCrossSectionsByOperationNumbers({
                operationNumbers: ['11', '12'],
            })
            .subscribe();

        const [req] = controller.match(() => true);

        expect(req.request.params.get('operationNumbers')).toBe('11,12');
        expect(req.request.params.get('fields[operation]')).toBe(
            'operationId,calendarId,operationNumber',
        );
        expect(req.request.params.get('fields[formation]')).toBe(
            'formationId,agencyId,vehicleType,formationNumber,formationDescription,startDate,endDate',
        );
        expect(req.request.params.has('include')).toBe(false);
        req.flush({});
    });

    it('編成まとめも同じ項目を絞って取り、include は付けない', () => {
        const { query, controller } = setup();
        query
            .findManyTimeCrossSectionsByFormationNumbers({
                formationNumbers: ['10701', '10702'],
            })
            .subscribe();

        const [req] = controller.match(() => true);

        expect(req.request.params.get('formationNumbers')).toBe('10701,10702');
        expect(req.request.params.get('fields[operation]')).toBe(
            'operationId,calendarId,operationNumber',
        );
        expect(req.request.params.get('fields[formation]')).toBe(
            'formationId,agencyId,vehicleType,formationNumber,formationDescription,startDate,endDate',
        );
        expect(req.request.params.has('include')).toBe(false);
        req.flush({});
    });
});
