import { provideHttpClient, withXhr } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { ServiceStationsDto } from '../../usecase/dtos/service-stations.dto';
import { ServiceQuery } from './service.query';

const url = environment.apiUrl + '/v3/services';

describe('ServiceQuery', () => {
    const setup = () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
            ],
        });
        return {
            query: TestBed.inject(ServiceQuery),
            controller: TestBed.inject(HttpTestingController),
        };
    };

    afterEach(() => TestBed.resetTestingModule());

    describe('findOneWithStations', () => {
        it('結合は stations.routeStationLists.route と、使う項目だけの fields を送る', () => {
            const { query, controller } = setup();

            query.findOneWithStations({ serviceId: 's1' }).subscribe();
            const req = controller.expectOne(
                (r) => r.url === `${url}/s1/stations`,
            );

            expect(req.request.params.get('include')).toBe(
                'stations.routeStationLists.route',
            );
            expect(req.request.params.get('fields[station]')).toBe(
                'stationName',
            );
            expect(req.request.params.get('fields[routeStationList]')).toBe(
                'routeId,stationSequence,stationNumbering',
            );
            expect(req.request.params.get('fields[route]')).toBe(
                'routeName,agencyId',
            );
            req.flush({ stations: [] });
        });

        it('service の無い応答でも、stations を DTO にして service は null にする', () => {
            const { query, controller } = setup();
            let result: ServiceStationsDto | undefined;

            query
                .findOneWithStations({ serviceId: 's1' })
                .subscribe((v) => (result = v));
            controller
                .expectOne((r) => r.url === `${url}/s1/stations`)
                .flush({
                    stations: [
                        {
                            id: 'st1',
                            stationName: '横浜',
                            routeStationLists: [
                                {
                                    routeId: 'r1',
                                    stationSequence: 1,
                                    stationNumbering: 'SO01',
                                    route: {
                                        id: 'r1',
                                        routeName: '相鉄本線',
                                        agencyId: 'a1',
                                    },
                                },
                            ],
                        },
                    ],
                });

            expect(result.service).toBeNull();
            expect(result.stations).toHaveLength(1);
            expect(result.stations[0].stationId).toBe('st1');
            expect(result.stations[0].stationName).toBe('横浜');
            expect(
                result.stations[0].routeStationLists[0].stationNumbering,
            ).toBe('SO01');
            expect(result.stations[0].routeStationLists[0].route.routeId).toBe(
                'r1',
            );
            expect(
                result.stations[0].routeStationLists[0].route.routeName,
            ).toBe('相鉄本線');
        });

        it('同じ serviceId の 2 回目は HTTP を出さず、forceReload で取り直す', () => {
            const { query, controller } = setup();

            query.findOneWithStations({ serviceId: 's1' }).subscribe();
            controller
                .expectOne((r) => r.url === `${url}/s1/stations`)
                .flush({ stations: [] });
            query.findOneWithStations({ serviceId: 's1' }).subscribe();
            controller.verify();

            query
                .findOneWithStations({ serviceId: 's1', forceReload: true })
                .subscribe();
            controller
                .expectOne((r) => r.url === `${url}/s1/stations`)
                .flush({ stations: [] });
            controller.verify();
        });
    });
});
