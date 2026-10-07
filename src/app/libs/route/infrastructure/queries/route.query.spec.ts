import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { QueryInvalidator } from 'src/app/core/query-cache/query-invalidator';
import { environment } from 'src/environments/environment';
import { RouteQuery } from './route.query';

const url = environment.apiUrl + '/v3/routes';

describe('RouteQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        return {
            query: TestBed.inject(RouteQuery),
            controller: TestBed.inject(HttpTestingController),
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    it('serviceName ごとに 1 回だけ取り、forceReload で取り直す', () => {
        const { query, controller } = setup();

        query.findMany({ serviceName: 'a' }).subscribe();
        controller.expectOne((r) => r.url === url).flush([]);
        query.findMany({ serviceName: 'a' }).subscribe();
        controller.verify();

        query.findMany({ serviceName: 'a', forceReload: true }).subscribe();
        controller.expectOne((r) => r.url === url).flush([]);
        controller.verify();
    });

    it('マスタなので、どの書き込みの知らせでも捨てない', () => {
        const { query, controller } = setup();
        query.findOneWithStations({ routeId: 'r1' }).subscribe();
        controller.expectOne(`${url}/r1/stations`).flush({ stations: [] });

        TestBed.inject(QueryInvalidator).invalidate('timetable');
        TestBed.inject(QueryInvalidator).invalidate('sighting');
        query.findOneWithStations({ routeId: 'r1' }).subscribe();

        controller.verify();
    });

    it('取得には cache を付けない', () => {
        const { query, controller } = setup();

        query.findMany().subscribe();
        const req = controller.expectOne((r) => r.url === url);

        expect(req.request.cache).toBeUndefined();
        req.flush([]);
    });
});
