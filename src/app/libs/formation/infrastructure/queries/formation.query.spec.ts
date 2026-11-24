import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { FormationQuery } from './formation.query';

const url = environment.apiUrl + '/v3/formations';

describe('FormationQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        return {
            query: TestBed.inject(FormationQuery),
            controller: TestBed.inject(HttpTestingController),
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    describe('findManyBySpecificDate', () => {
        it('結合は空の include と、使う項目だけの fields[formation] を送る', () => {
            const { query, controller } = setup();

            query.findManyBySpecificDate({ date: '2026-10-25' }).subscribe();
            const req = controller.expectOne(
                (r) => r.url === `${url}/as/of/2026-10-25`,
            );

            expect(req.request.params.get('include')).toBe('');
            expect(req.request.params.get('fields[formation]')).toBe(
                'agencyId,vehicleType,formationNumber,formationDescription,startDate,endDate',
            );
            expect(req.request.params.keys().sort()).toEqual([
                'fields[formation]',
                'include',
            ]);
            req.flush([]);
        });

        it('日付ごとに 1 回だけ取り、forceReload で取り直す', () => {
            const { query, controller } = setup();
            const match = (r: { url: string }) =>
                r.url === `${url}/as/of/2026-10-25`;

            query.findManyBySpecificDate({ date: '2026-10-25' }).subscribe();
            controller.expectOne(match).flush([]);
            query.findManyBySpecificDate({ date: '2026-10-25' }).subscribe();
            controller.verify();

            query
                .findManyBySpecificDate({
                    date: '2026-10-25',
                    forceReload: true,
                })
                .subscribe();
            controller.expectOne(match).flush([]);
            controller.verify();
        });
    });

    describe('findManyBySpecificPeriod', () => {
        const match = (r: { url: string }) =>
            r.url === `${url}/from/2000-01-01/to/2026-11-20`;

        it('include を渡さなければ今までどおり引数なしで取る', () => {
            const { query, controller } = setup();

            query
                .findManyBySpecificPeriod({
                    startDate: '2000-01-01',
                    endDate: '2026-11-20',
                })
                .subscribe();
            const req = controller.expectOne(match);

            expect(req.request.params.keys()).toEqual([]);
            req.flush([]);
        });

        it('include を渡せば送り、include ごとに別に取る', () => {
            const { query, controller } = setup();
            const include = 'vehicleFormations.vehicle.modifications,agency';
            const base = { startDate: '2000-01-01', endDate: '2026-11-20' };

            query.findManyBySpecificPeriod(base).subscribe();
            controller.expectOne(match).flush([]);
            query.findManyBySpecificPeriod({ ...base, include }).subscribe();
            const req = controller.expectOne(match);

            expect(req.request.params.get('include')).toBe(include);
            req.flush([]);
        });
    });
});
